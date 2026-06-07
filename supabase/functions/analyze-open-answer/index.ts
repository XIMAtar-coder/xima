import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, computeContentHash, persistEvidenceLedgerEntry } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse } from "../_shared/errors.ts";
import { emitAuditEventWithMetric, hashForAudit } from "../_shared/auditEvents.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { persistTrajectoryEvent } from "../_shared/pillarTrajectory.ts";
import { loadUserAiContext, buildContextBlock, updateUserAiContext } from "../_shared/aiContext.ts";

// =====================================================
// NON-ANSWER DETECTION (Pre-LLM Hard Rules) — KEPT EXACTLY
// =====================================================

const NON_ANSWER_PATTERNS: RegExp[] = [
  /^(i\s*)?don'?t\s*know/i, /^idk$/i, /^no\s*idea/i, /^not\s*sure/i,
  /^n\/?a$/i, /^none$/i, /^nothing$/i, /^can'?t\s*answer/i,
  /^no\s*comment/i, /^pass$/i, /^skip$/i, /^dunno$/i, /^\?+$/,
  /^non\s*(lo\s*)?so/i, /^boh$/i, /^non\s*saprei/i, /^niente$/i,
  /^nessuna?\s*idea/i, /^non\s*ho\s*idea/i,
  /^no\s*s[eé]/i, /^ni\s*idea/i, /^nada$/i, /^sin\s*idea/i, /^no\s*tengo\s*idea/i,
];

const FILLER_ONLY_PATTERNS: RegExp[] = [
  /^[.\s]+$/, /^[-_\s]+$/, /^[…\s]+$/, /^\p{Emoji}+$/u,
  /^(\.{2,}\s*)+$/, /^[x]+$/i, /^(test|testing)$/i, /^(asdf|qwerty|abc)/i,
];

function detectNonAnswer(text: string) {
  const normalized = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const debugInfo = { normalizedLength: normalized.length, wordCount, matchedPattern: undefined as string | undefined };

  if (normalized.length < 15) return { isNonAnswer: true, reason: 'too_short', debugInfo: { ...debugInfo, matchedPattern: 'length < 15' } };
  for (const pattern of FILLER_ONLY_PATTERNS) {
    if (pattern.test(normalized)) return { isNonAnswer: true, reason: 'filler_only', debugInfo: { ...debugInfo, matchedPattern: pattern.source } };
  }
  for (const pattern of NON_ANSWER_PATTERNS) {
    if (pattern.test(normalized)) return { isNonAnswer: true, reason: 'non_answer_phrase', debugInfo: { ...debugInfo, matchedPattern: pattern.source } };
  }
  if (wordCount < 5) return { isNonAnswer: true, reason: 'insufficient_words', debugInfo: { ...debugInfo, matchedPattern: 'wordCount < 5' } };
  return { isNonAnswer: false, debugInfo };
}

// =====================================================
// LANGUAGE CONFIGS — KEPT EXACTLY
// =====================================================

const LANGUAGE_CONFIGS: Record<string, { name: string; feedbackStyle: string; nonAnswerFeedback: string }> = {
  en: { name: 'English', feedbackStyle: 'Write in clear, professional English.', nonAnswerFeedback: 'Your response was too brief or unclear. To receive a meaningful score, please provide a substantive answer that demonstrates your thinking. Try to include specific examples, explain your reasoning, and connect your ideas to the question asked.' },
  it: { name: 'Italian', feedbackStyle: 'Scrivi in italiano chiaro e professionale.', nonAnswerFeedback: 'La tua risposta era troppo breve o poco chiara. Per ricevere un punteggio significativo, fornisci una risposta sostanziale che dimostri il tuo ragionamento. Prova a includere esempi specifici, spiega il tuo pensiero e collega le tue idee alla domanda posta.' },
  es: { name: 'Spanish', feedbackStyle: 'Escribe en español claro y profesional.', nonAnswerFeedback: 'Tu respuesta fue demasiado breve o poco clara. Para recibir una puntuación significativa, proporciona una respuesta sustancial que demuestre tu razonamiento. Intenta incluir ejemplos específicos, explica tu pensamiento y conecta tus ideas con la pregunta formulada.' }
};

const FIELD_CONTEXTS: Record<string, string> = {
  science_tech: 'science, technology, engineering, data analysis, and technical problem-solving',
  business_leadership: 'business strategy, leadership, management, and organizational development',
  arts_creative: 'creative arts, design, storytelling, and artistic expression',
  service_ops: 'service delivery, operations, customer experience, and process optimization'
};

const MAX_ANSWER_LENGTH = 5000;

// =====================================================
// Main handler
// =====================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req);
  const ipHash = req.headers.get('x-forwarded-for') ? await hashForAudit(req.headers.get('x-forwarded-for')!) : null;

  try {
    // Mandatory authentication: reject unauthenticated callers.
    // Service-role bearer is accepted for internal/edge-to-edge calls (bypasses getUser).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const isServiceRole = serviceKey && bearer === serviceKey;
    if (!isServiceRole) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: authUser }, error: authErr } = await authClient.auth.getUser();
      if (authErr || !authUser) {
        return errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token');
      }
    }

    const body = await req.json();
    const { text, field, language, openKey, user_id, challenge_id, scoring_context, format, mindset_payload, invitation_id } = body;

    // =====================================================
    // L2 CONVERSATION BRANCH — self-contained; returns before mindset/free-text path.
    // Server-side user_id resolution (ignore any client-passed user_id),
    // Opus per-call override with empirical fallback chain, identity-based rubric matching.
    // =====================================================
    if (format === 'l2_conversation') {
      return await handleL2Conversation({
        invitation_id,
        challenge_id,
        language: language || 'it',
        correlationId,
        ipHash,
      });
    }

    const isMindset = format === 'mindset' && mindset_payload && typeof mindset_payload === 'object';

    // Mindset bypasses (!field || !language || !openKey) — payload is structured, not free-text.
    if (!isMindset) {
      if (!field || !language || !openKey) {
        return errorResponse(400, 'INVALID_INPUT', 'Missing required parameters');
      }
    }

    const effectiveLanguage: string = isMindset ? (language || 'it') : language;
    const effectiveField: string = isMindset ? (field || 'business_leadership') : field;
    const effectiveOpenKey: string = isMindset ? (openKey || 'mindset') : openKey;

    const rawText = text || '';
    if (!isMindset && rawText.length > MAX_ANSWER_LENGTH) {
      return errorResponse(400, 'INPUT_TOO_LONG', `Answer too long. Maximum ${MAX_ANSWER_LENGTH} characters allowed.`);
    }


    // ===== GDPR: Profiling opt-out check — KEPT EXACTLY =====
    if (user_id && typeof user_id === 'string') {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: profile } = await supabase
          .from('profiles')
          .select('profiling_opt_out')
          .eq('user_id', user_id)
          .single();
        
        if (profile?.profiling_opt_out === true) {
          console.log(JSON.stringify({ type: 'gdpr_block', correlation_id: correlationId, function_name: 'analyze-open-answer', reason: 'profiling_opt_out' }));
          return profilingOptOutResponse();
        }
      }
    }

    // Input cleaning — KEPT EXACTLY for free-text; mindset builds a synthetic IT transcript.
    let cleanedText: string;
    if (isMindset) {
      const instinctChoices = Array.isArray(mindset_payload.instinct_choices) ? mindset_payload.instinct_choices : [];
      const dayLog = Array.isArray(mindset_payload.day_log) ? mindset_payload.day_log : [];
      const debrief = Array.isArray(mindset_payload.debrief) ? mindset_payload.debrief : [];

      const instinctLine = instinctChoices.length
        ? 'Istinti: ' + instinctChoices.map((c: any) => `«${String(c?.facet || '')}»`).join(', ')
        : 'Istinti: (nessuno)';
      const dayLine = dayLog.length
        ? 'Giornata (lunedì): ha reagito con ' + dayLog.map((d: any) => String(d?.gesture || '')).join(', ')
        : 'Giornata (lunedì): (nessuna reazione)';
      const debriefLine = debrief.length
        ? debrief.map((d: any) => `Riflessione — D: ${String(d?.q || '')} / R: ${String(d?.a || '')}`).join('\n')
        : 'Riflessione — (nessuna)';

      cleanedText = [instinctLine, dayLine, debriefLine].join('\n');
    } else {
      cleanedText = rawText
        .replace(/[._]{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\s*[._]+\s*/g, '')
        .replace(/\s*[._]+\s*$/g, '')
        .trim();
    }

    const langConfig = LANGUAGE_CONFIGS[effectiveLanguage] || LANGUAGE_CONFIGS.en;
    const fieldContext = FIELD_CONTEXTS[effectiveField] || 'professional skills';

    // STEP 1: Pre-LLM Non-Answer Detection — skipped for mindset (structured payload).
    const nonAnswerCheck = isMindset
      ? { isNonAnswer: false as const, debugInfo: { normalizedLength: cleanedText.length, wordCount: cleanedText.split(/\s+/).filter(Boolean).length, matchedPattern: undefined as string | undefined } }
      : detectNonAnswer(cleanedText);

    console.log(JSON.stringify({
      type: 'request', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      field: effectiveField, language: effectiveLanguage, openKey: effectiveOpenKey,
      answer_length: cleanedText.length,
      word_count: nonAnswerCheck.debugInfo.wordCount,
      non_answer_detected: nonAnswerCheck.isNonAnswer,
      scoring_context: scoring_context || 'core_assessment',
      format: isMindset ? 'mindset' : 'free_text',
    }));

    if (nonAnswerCheck.isNonAnswer) {
      return jsonResponse({
        score_total: 5,
        score_breakdown: { relevance: 0, depth: 0, structure: 0, originality: 5 },
        quality_label: 'insufficient',
        xima_feedback: langConfig.nonAnswerFeedback,
        improvement_suggestions: [
          language === 'it' ? 'Scrivi almeno 3-4 frasi complete che rispondano direttamente alla domanda.'
            : language === 'es' ? 'Escribe al menos 3-4 oraciones completas que respondan directamente a la pregunta.'
            : 'Write at least 3-4 complete sentences that directly address the question.',
          language === 'it' ? 'Includi un esempio concreto dalla tua esperienza.'
            : language === 'es' ? 'Incluye un ejemplo concreto de tu experiencia.'
            : 'Include a concrete example from your experience.',
          language === 'it' ? 'Spiega il tuo ragionamento e perché hai scelto questo approccio.'
            : language === 'es' ? 'Explica tu razonamiento y por qué elegiste este enfoque.'
            : 'Explain your reasoning and why you chose this approach.',
        ],
        detected_red_flags: ['non_answer', nonAnswerCheck.reason || 'unspecified'],
        cleaned_text: cleanedText,
        non_answer_detected: true,
        pillar_impact: null,
        scoring_context: scoring_context || 'core_assessment',
      });
    }

    // ===== Fetch evaluation_lens for L1 challenge scoring =====
    let evaluationLensBlock = '';
    if (challenge_id && scoring_context === 'l1_challenge') {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: challenge } = await serviceClient
        .from('business_challenges')
        .select('evaluation_lens')
        .eq('id', challenge_id)
        .single();
      
      if (challenge?.evaluation_lens) {
        const lens = challenge.evaluation_lens as Record<string, string[]>;
        evaluationLensBlock = `
EVALUATION CONTEXT:
This is an L1 challenge response. Use these behavioral signals to evaluate:
- Drive signals to look for: ${(lens.drive_signals || []).join('; ')}
- Computational Power signals: ${(lens.computational_power_signals || []).join('; ')}
- Communication signals: ${(lens.communication_signals || []).join('; ')}
- Creativity signals: ${(lens.creativity_signals || []).join('; ')}
- Knowledge signals: ${(lens.knowledge_signals || []).join('; ')}`;
      }
    }

    // STEP 2: Load AI context & Claude Evaluation
    const userContext = user_id ? await loadUserAiContext(user_id) : {};
    const contextBlock = buildContextBlock(userContext);

    const freeTextSystemPrompt = `You are a strict but fair professional assessment evaluator for the XIMA psychometric talent platform.

CRITICAL RULES:
- ALWAYS respond in ${langConfig.name}. Every word must be in ${langConfig.name}.
- ${langConfig.feedbackStyle}
- Be honest and accurate. Do NOT inflate scores.
- NEVER give high scores to vague, generic, or off-topic answers.

EVALUATION CONTEXT:
- Field: ${fieldContext}
- Question type: ${effectiveOpenKey === 'open1' ? 'Creative thinking and problem-solving' : effectiveOpenKey === 'mindset' ? 'L1 mindset/attitude experience' : 'Goal-setting and professional drive'}
${evaluationLensBlock}

SCORING CRITERIA (strict scale 0-100, broken into 4 dimensions each 0-25):
- relevance (0-25): How well does the answer address the question and field context?
- depth (0-25): Does the answer go beyond surface-level? Specific examples, data, reasoning?
- structure (0-25): Is the answer well-organized, clear, and logically coherent?
- originality (0-25): Does the answer show independent thinking, novel angles, or creative approaches?

TOTAL SCORE = relevance + depth + structure + originality

RED FLAGS (if detected, cap TOTAL score accordingly):
- "generic": Uses only general statements without specifics → cap at 40
- "off_topic": Does not address the question → cap at 25
- "contradiction": Contains logical contradictions → cap at 35
- "copy_paste": Appears to be copied generic text → cap at 30
- "admission_of_not_knowing": Contains phrases like "I'm not sure" mid-answer → cap at 45

SELF-CHECK RULES:
1. If the answer lacks ANY specific examples or numbers, no dimension can exceed 15.
2. If the answer does not mention the professional field context, relevance cannot exceed 12.
3. If the answer is under 50 words, no dimension can exceed 10.

PILLAR IMPACT:
Also compute how this answer affects each XIMA pillar (-5 to +5):
- drive: Initiative, ownership, ambition shown
- computational_power: Analytical thinking, structured reasoning
- communication: Clarity, stakeholder awareness, persuasion
- creativity: Novel ideas, reframing, lateral thinking
- knowledge: Domain expertise, best practices, references

` + contextBlock + `

Return ONLY valid JSON:
{
  "score": <total 0-100>,
  "quality_label": "<poor|fair|good|excellent>",
  "reasons": ["<reason1>", "<reason2>"],
  "improvement_tips": ["<tip1>", "<tip2>", "<tip3>"],
  "detected_red_flags": [],
  "score_breakdown": {
    "relevance": <0-25>,
    "depth": <0-25>,
    "structure": <0-25>,
    "originality": <0-25>
  },
  "pillar_impact": {
    "drive": <-5 to 5>,
    "computational_power": <-5 to 5>,
    "communication": <-5 to 5>,
    "creativity": <-5 to 5>,
    "knowledge": <-5 to 5>
  },
  "pillar_reasoning": "Brief explanation of pillar impact..."
}`;

    const mindsetSystemPrompt = `You are an L1 mindset evaluator for the XIMA psychometric talent platform.

CRITICAL RULES:
- ALWAYS respond in ${langConfig.name}. Every word of "summary" must be in ${langConfig.name}.
- ${langConfig.feedbackStyle}
- Be honest. Do NOT inflate scores. This is a structured mindset payload, not prose.

EVALUATION CONTEXT:
- Field: ${fieldContext}
- Question type: L1 mindset/attitude experience (gut-instinct pairs, day-of-week gestures, short debrief)
${evaluationLensBlock}

INPUT SHAPE:
The submission is NOT free text. It is composed of:
  (a) gut-instinct choices between paired options (each option lights a behavioral "facet"),
  (b) a simulated Monday in which the candidate reacted to incoming items with gestures,
  (c) a short reflective "why" debrief on one of those reactions.
Evaluate mindset, instinct, values, and reflectiveness — NOT prose quality, word count, or specifics.

SCORING RUBRIC (each 0-100):
- framing: How the candidate frames the situation — stakes, who's affected, what's at risk.
- execution_bias: Propensity to act, decide, move; vs deliberation or avoidance.
- impact_thinking: Awareness of downstream consequences and second-order effects.
- decision_quality: Coherence between gut instincts, day reactions, and the debrief reasoning.

OVERALL (0-100): a balanced read across the four. NOT a sum, NOT a strict average — weight what stands out.

PILLAR IMPACT (-5 to +5 each):
- drive: Initiative, ownership, ambition shown
- computational_power: Analytical thinking, structured reasoning
- communication: Clarity, stakeholder awareness, persuasion
- creativity: Novel ideas, reframing, lateral thinking
- knowledge: Domain expertise, best practices, references

` + contextBlock + `

Return ONLY valid JSON:
{
  "framing": <0-100>,
  "execution_bias": <0-100>,
  "impact_thinking": <0-100>,
  "decision_quality": <0-100>,
  "overall": <0-100>,
  "summary": "<short, in ${langConfig.name}>",
  "flags": ["<string>", "..."],
  "confidence": "low" | "medium" | "high",
  "pillar_impact": {
    "drive": <-5 to 5>,
    "computational_power": <-5 to 5>,
    "communication": <-5 to 5>,
    "creativity": <-5 to 5>,
    "knowledge": <-5 to 5>
  },
  "pillar_reasoning": "Brief explanation of pillar impact..."
}`;

    const finalSystemPrompt = isMindset ? mindsetSystemPrompt : freeTextSystemPrompt;

    const userPrompt = `Evaluate this professional assessment answer strictly and fairly.

ANSWER TO EVALUATE:
"""
${cleanedText}
"""

Apply all scoring rules, self-checks, and pillar impact assessment. Be honest.
Return ONLY the JSON object.`;

    let parsedResult: any;
    let aiRequestId = '';

    try {
      const aiResp = await callAnthropicApi({
        system: finalSystemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'analyze-open-answer',
        inputSummary: `${isMindset ? 'mindset' : 'open_answer'}:field=${effectiveField},lang=${effectiveLanguage},key=${effectiveOpenKey},len=${cleanedText.length},ctx=${scoring_context || 'core'}`,
        maxTokens: 2048,
      });

      aiRequestId = aiResp.requestId;
      // extractJsonFromAiContent already returns the parsed JSON value (not a string).
      const parsed = extractJsonFromAiContent(aiResp.content);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI returned non-JSON or empty content');
      }

      // Validate required fields
      if (isMindset) {
        const numKeys = ['framing', 'execution_bias', 'impact_thinking', 'decision_quality'];
        for (const k of numKeys) {
          if (typeof parsed?.[k] !== 'number') throw new Error(`Missing mindset rubric key: ${k}`);
        }
        if (!parsed?.pillar_impact || typeof parsed.pillar_impact !== 'object') throw new Error('Missing pillar_impact');
      } else {
        if (typeof parsed?.score !== 'number' || parsed.score < 0 || parsed.score > 100) throw new Error('Invalid score');
        if (!Array.isArray(parsed?.reasons)) throw new Error('Missing reasons');
        if (!Array.isArray(parsed?.improvement_tips)) throw new Error('Missing tips');
        if (!Array.isArray(parsed?.detected_red_flags)) throw new Error('Missing flags');
        if (!parsed?.score_breakdown || typeof parsed.score_breakdown !== 'object') throw new Error('Missing breakdown');
      }

      parsedResult = parsed;
    } catch (e) {
      if (e instanceof AnthropicError) {
        return errorResponse(e.statusCode, e.errorCode, e.message);
      }
      console.error(JSON.stringify({ type: 'parse_error', correlation_id: correlationId, function_name: 'analyze-open-answer', error: e instanceof Error ? e.message : 'Unknown' }));
      return errorResponse(502, 'OPEN_ANSWER_PARSE_FAILED', 'AI evaluation failed to produce valid results. Please try again.');
    }

    const clamp = (n: any, lo: number, hi: number) => {
      const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
      return Math.max(lo, Math.min(hi, v));
    };
    const clampRound = (n: any, lo: number, hi: number) => Math.round(clamp(n, lo, hi));

    // STEP 3: Post-LLM Guardrails — free-text path KEPT EXACTLY; mindset skips red-flag caps
    let finalScore: number;
    const redFlags: string[] = isMindset ? [] : parsedResult.detected_red_flags.map(String);

    // Mindset-specific normalized values
    let mindsetRubric = { framing: 0, execution_bias: 0, impact_thinking: 0, decision_quality: 0 };
    let mindsetOverall = 0;
    let mindsetSummary = '';
    let mindsetFlags: string[] = [];
    let mindsetConfidence: 'low' | 'medium' | 'high' = 'medium';

    if (isMindset) {
      mindsetRubric = {
        framing: clampRound(parsedResult.framing, 0, 100),
        execution_bias: clampRound(parsedResult.execution_bias, 0, 100),
        impact_thinking: clampRound(parsedResult.impact_thinking, 0, 100),
        decision_quality: clampRound(parsedResult.decision_quality, 0, 100),
      };
      const avg = Math.round((mindsetRubric.framing + mindsetRubric.execution_bias + mindsetRubric.impact_thinking + mindsetRubric.decision_quality) / 4);
      mindsetOverall = typeof parsedResult.overall === 'number' ? clampRound(parsedResult.overall, 0, 100) : avg;
      mindsetSummary = typeof parsedResult.summary === 'string' ? parsedResult.summary : '';
      mindsetFlags = Array.isArray(parsedResult.flags) ? parsedResult.flags.map(String) : [];
      const conf = String(parsedResult.confidence || '').toLowerCase();
      mindsetConfidence = (conf === 'low' || conf === 'high') ? conf : 'medium';
      finalScore = mindsetOverall;
    } else {
      finalScore = Math.round(parsedResult.score);
      if (redFlags.includes('generic') && finalScore > 40) finalScore = 40;
      if (redFlags.includes('off_topic') && finalScore > 25) finalScore = 25;
      if (redFlags.includes('contradiction') && finalScore > 35) finalScore = 35;
      if (redFlags.includes('copy_paste') && finalScore > 30) finalScore = 30;
      if (redFlags.includes('admission_of_not_knowing') && finalScore > 45) finalScore = 45;

      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
      if (wordCount < 30 && finalScore > 35) {
        finalScore = 35;
        if (!redFlags.includes('too_short')) redFlags.push('too_short');
      }
    }

    let qualityLabel: string;
    if (finalScore <= 20) qualityLabel = 'poor';
    else if (finalScore <= 50) qualityLabel = 'fair';
    else if (finalScore <= 75) qualityLabel = 'good';
    else qualityLabel = 'excellent';

    // Free-text breakdown only; mindset uses its own rubric structure
    const scoreBreakdown = isMindset ? null : (parsedResult.score_breakdown || {
      relevance: Math.round(25 * finalScore / 100),
      depth: Math.round(25 * finalScore / 100),
      structure: Math.round(25 * finalScore / 100),
      originality: Math.round(25 * finalScore / 100),
    });

    const cleanText = (str: string) => {
      if (!str) return '';
      return str.replace(/[._]{2,}/g, ' ').replace(/^\s*[._]+/g, '').replace(/[._]+\s*$/g, '').replace(/\s+/g, ' ').trim();
    };

    const rawPillar = parsedResult.pillar_impact || null;
    const pillarImpact = rawPillar ? {
      drive: clamp(rawPillar.drive, -5, 5),
      computational_power: clamp(rawPillar.computational_power, -5, 5),
      communication: clamp(rawPillar.communication, -5, 5),
      creativity: clamp(rawPillar.creativity, -5, 5),
      knowledge: clamp(rawPillar.knowledge, -5, 5),
    } : null;

    // ===== MINDSET: build signals and persist server-side =====
    let mindsetSignals: any = null;
    if (isMindset) {
      mindsetSignals = {
        framing: mindsetRubric.framing,
        execution_bias: mindsetRubric.execution_bias,
        impact_thinking: mindsetRubric.impact_thinking,
        decision_quality: mindsetRubric.decision_quality,
        overall: mindsetOverall,
        summary: mindsetSummary,
        flags: mindsetFlags,
        confidence: mindsetConfidence,
        pillar_impact: pillarImpact,
        pillar_reasoning: parsedResult.pillar_reasoning || '',
        signals_version: 'v1',
        scoring_context: 'l1_challenge',
        format: 'mindset',
        ai_request_id: aiRequestId,
      };

      if (typeof invitation_id === 'string' && invitation_id.length > 0) {
        try {
          const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const { error: updErr } = await serviceClient
            .from('challenge_submissions')
            .update({ signals_payload: mindsetSignals })
            .eq('invitation_id', invitation_id);
          if (updErr) {
            console.warn(JSON.stringify({ type: 'mindset_signals_write_failed', correlation_id: correlationId, function_name: 'analyze-open-answer', error: updErr.message }));
          }
        } catch (writeErr) {
          console.warn(JSON.stringify({ type: 'mindset_signals_write_error', correlation_id: correlationId, function_name: 'analyze-open-answer', error: writeErr instanceof Error ? writeErr.message : 'Unknown' }));
        }
      }
    }


    // Audit event
    emitAuditEventWithMetric({
      actorType: 'system',
      actorId: null,
      action: isMindset ? 'assessment.mindset_scored' : 'assessment.open_answer_scored',
      entityType: isMindset ? 'mindset_submission' : 'open_answer',
      entityId: isMindset ? (challenge_id || 'mindset') : `${effectiveField}:${effectiveOpenKey}`,
      correlationId,
      metadata: { field: effectiveField, openKey: effectiveOpenKey, finalScore, qualityLabel, redFlagsCount: redFlags.length, ai_request_id: aiRequestId, scoring_context: scoring_context || 'core_assessment', format: isMindset ? 'mindset' : 'free_text' },
      ipHash,
    }, isMindset ? 'mindset.scored' : 'open_answer.scored');

    // ===== EVIDENCE LEDGER — gated: no assessment_open_responses row exists for mindset =====
    if (!isMindset && user_id && typeof user_id === 'string') {
      try {
        const contentHash = await computeContentHash(cleanedText);
        const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        
        const { data: profile } = await serviceClient.from('profiles').select('id').eq('user_id', user_id).single();

        if (profile) {
          const { data: openResp } = await serviceClient
            .from('assessment_open_responses')
            .select('id, attempt_id')
            .eq('user_id', user_id)
            .eq('field_key', effectiveField)
            .eq('open_key', effectiveOpenKey)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (openResp) {
            persistEvidenceLedgerEntry({
              open_response_id: openResp.id,
              subject_profile_id: profile.id,
              attempt_id: openResp.attempt_id,
              field_key: effectiveField,
              open_key: effectiveOpenKey,
              ai_request_id: aiRequestId,
              final_score: finalScore,
              quality_label: qualityLabel,
              key_reasons: parsedResult.reasons.slice(0, 5).map(String),
              detected_red_flags: redFlags,
              score_breakdown: scoreBreakdown,
              content_hash: contentHash,
              content_length: cleanedText.length,
              content_language: effectiveLanguage,
            });
          }
        }
      } catch (ledgerErr) {
        console.error('[evidence_ledger] Outer error:', ledgerErr instanceof Error ? ledgerErr.message : ledgerErr);
      }
    }

    // ===== PILLAR TRAJECTORY =====
    // L1 mindset NUDGES pillar scores (bounded by persistTrajectoryEvent caps) but
    // MUST NOT change the archetype or trigger level-up. Archetype re-derivation
    // happens only on the quarterly DNA cadence (separate codepath).
    let levelUpStatus: any = null;
    if (user_id && typeof user_id === 'string' && pillarImpact && !nonAnswerCheck.isNonAnswer) {
      const sourceType = isMindset || scoring_context === 'l1_challenge' ? 'l1_challenge' as const
        : scoring_context === 'l2_challenge' ? 'l2_challenge' as const
        : 'open_answer' as const;

      // For mindset: use invitation_id as source_entity_id so we can dedupe per-submission.
      const trajectoryEntityId = isMindset && typeof invitation_id === 'string' && invitation_id
        ? invitation_id
        : (challenge_id || `${effectiveField}:${effectiveOpenKey}`);

      // Idempotency guard (mindset only): "Genera Segnali" can be re-clicked.
      // Display/signals_payload regenerates freely, but the pillar nudge must fire once per submission.
      let shouldPersistTrajectory = true;
      if (isMindset && typeof invitation_id === 'string' && invitation_id) {
        try {
          const dedupeClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const { data: existing } = await dedupeClient
            .from('pillar_trajectory_log')
            .select('id')
            .eq('user_id', user_id)
            .eq('source_type', 'l1_challenge')
            .eq('source_entity_id', invitation_id)
            .limit(1)
            .maybeSingle();
          if (existing) {
            shouldPersistTrajectory = false;
            console.log(JSON.stringify({
              type: 'trajectory_skipped_idempotent',
              correlation_id: correlationId,
              function_name: 'analyze-open-answer',
              invitation_id,
              existing_log_id: existing.id,
            }));
          }
        } catch (dedupeErr) {
          console.warn(JSON.stringify({
            type: 'trajectory_dedupe_check_failed',
            correlation_id: correlationId,
            function_name: 'analyze-open-answer',
            error: dedupeErr instanceof Error ? dedupeErr.message : 'Unknown',
          }));
          // Fail safe: if we can't verify, do NOT double-write — skip.
          shouldPersistTrajectory = false;
        }
      }

      if (shouldPersistTrajectory) {
        try {
          const levelCheck = await persistTrajectoryEvent({
            user_id,
            source_function: "analyze-open-answer",
            source_type: sourceType,
            source_entity_id: trajectoryEntityId,
            correlation_id: correlationId,
            deltas: {
              drive: pillarImpact.drive || 0,
              computational_power: pillarImpact.computational_power || 0,
              communication: pillarImpact.communication || 0,
              creativity: pillarImpact.creativity || 0,
              knowledge: pillarImpact.knowledge || 0,
            },
            reasoning: parsedResult.pillar_reasoning || "",
          });

          // Mindset NEVER returns level_up_status — archetype stays anchored.
          if (!isMindset && (levelCheck?.eligible || levelCheck?.evolution_eligible)) {
            levelUpStatus = { eligible: levelCheck.eligible, evolution_eligible: levelCheck.evolution_eligible, current_level: levelCheck.current_level };
          }
        } catch (trajErr) {
          console.error('[trajectory] Error:', trajErr instanceof Error ? trajErr.message : trajErr);
        }
      }
    }

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      original_score: isMindset ? mindsetOverall : parsedResult.score, final_score: finalScore,
      quality_label: qualityLabel, red_flags_count: redFlags.length,
      has_pillar_impact: !!pillarImpact,
    }));

    // Update progressive AI context for challenge history
    if (user_id && typeof user_id === 'string') {
      const existingChallenges = userContext.challenge_history_summary || {
        l1_completed: 0, l2_completed: 0, l1_avg_score: 0, l2_avg_score: 0,
        strongest_area: null, weakest_area: null,
      };
      const isL1 = scoring_context === 'l1_challenge';
      const isL2 = scoring_context === 'l2_challenge';
      const countKey = isL2 ? 'l2_completed' : 'l1_completed';
      const avgKey = isL2 ? 'l2_avg_score' : 'l1_avg_score';
      const prevCount = existingChallenges[countKey] || 0;
      const prevAvg = existingChallenges[avgKey] || 0;

      await updateUserAiContext(user_id, {
        challenge_history_summary: {
          ...existingChallenges,
          [countKey]: prevCount + 1,
          [avgKey]: Math.round(((prevAvg * prevCount) + finalScore) / (prevCount + 1)),
        },
        challenges_updated_at: new Date().toISOString(),
      });
    }

    if (isMindset) {
      // Mindset response intentionally omits level_up_status — the archetype
      // stays anchored. We send a single qualitative cue; never numbers.
      return jsonResponse({
        score_total: finalScore,
        quality_label: qualityLabel,
        pillar_impact: pillarImpact,
        scoring_context: 'l1_challenge',
        signals: mindsetSignals,
        non_answer_detected: false,
        growth_cue: 'xima_strengthened',
      });
    }

    return jsonResponse({
      score_total: finalScore,
      score_breakdown: scoreBreakdown,
      quality_label: qualityLabel,
      xima_feedback: cleanText(parsedResult.reasons.join(' ')),
      improvement_suggestions: parsedResult.improvement_tips.map(cleanText).filter(Boolean),
      detected_red_flags: redFlags,
      cleaned_text: cleanedText,
      non_answer_detected: false,
      pillar_impact: pillarImpact,
      scoring_context: scoring_context || 'core_assessment',
      ...(levelUpStatus ? { level_up_status: levelUpStatus } : {}),
    });

  } catch (error) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
  }
});

// =====================================================
// L2 CONVERSATION HANDLER
// =====================================================

const OPUS_FALLBACK_CHAIN = ['claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6'] as const;
const SONNET_LAST_RESORT = 'claude-sonnet-4-20250514';

async function sha1Hex12(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

const PILLAR_KEYS_L2 = ['drive', 'computational_power', 'communication', 'creativity', 'knowledge'] as const;
type PillarKey = typeof PILLAR_KEYS_L2[number];

interface L2HandlerArgs {
  invitation_id: unknown;
  challenge_id: unknown;
  language: string;
  correlationId: string;
  ipHash: string | null;
}

async function handleL2Conversation(args: L2HandlerArgs): Promise<Response> {
  const { invitation_id, challenge_id, language, correlationId, ipHash } = args;

  if (typeof invitation_id !== 'string' || !invitation_id) {
    return errorResponse(400, 'INVALID_INPUT', 'invitation_id required');
  }
  if (typeof challenge_id !== 'string' || !challenge_id) {
    return errorResponse(400, 'INVALID_INPUT', 'challenge_id required');
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. Resolve user_id server-side from the invitation
  const { data: invitation, error: invErr } = await service
    .from('challenge_invitations')
    .select('id, candidate_profile_id, challenge_id')
    .eq('id', invitation_id)
    .maybeSingle();
  if (invErr || !invitation) {
    return errorResponse(404, 'INVITATION_NOT_FOUND', 'Invitation not found');
  }
  if (!invitation.candidate_profile_id) {
    return errorResponse(404, 'PROFILE_NOT_FOUND', 'Invitation has no candidate profile');
  }

  const { data: profile, error: profErr } = await service
    .from('profiles')
    .select('id, user_id, ximatar_name')
    .eq('id', invitation.candidate_profile_id)
    .maybeSingle();
  if (profErr || !profile?.user_id) {
    return errorResponse(404, 'PROFILE_NOT_FOUND', 'Candidate profile/user not found');
  }
  const resolvedUserId: string = profile.user_id;

  // 2. Load submission + challenge
  const { data: submission, error: subErr } = await service
    .from('challenge_submissions')
    .select('id, invitation_id, submitted_payload, signals_payload, status')
    .eq('invitation_id', invitation_id)
    .maybeSingle();
  if (subErr || !submission) {
    return errorResponse(404, 'SUBMISSION_NOT_FOUND', 'No submission for invitation');
  }
  const payload = submission.submitted_payload as Record<string, any> | null;
  if (!payload || payload.format !== 'l2_conversation') {
    return errorResponse(400, 'NOT_L2_CONVERSATION', 'Submission is not an l2_conversation payload');
  }

  const { data: challenge, error: chErr } = await service
    .from('business_challenges')
    .select('id, config_json')
    .eq('id', challenge_id)
    .maybeSingle();
  if (chErr || !challenge) {
    return errorResponse(404, 'CHALLENGE_NOT_FOUND', 'Challenge not found');
  }
  const sim = (challenge.config_json as any)?.l2_simulation || {};
  const rubricCfg: Array<{ criterion: string; description?: string; weight: number; primary_pillar: string }> =
    Array.isArray(sim.rubric) ? sim.rubric : [];
  if (rubricCfg.length === 0) {
    return errorResponse(400, 'NO_RUBRIC', 'Challenge has no l2_simulation.rubric');
  }
  const counterpart = sim.counterpart || {};
  const scenario = String(sim.scenario || '');

  // 3. Idempotency pre-check
  const sigPayloadExisting = submission.signals_payload as Record<string, any> | null;
  const { data: existingTraj } = await service
    .from('pillar_trajectory_log')
    .select('id')
    .eq('user_id', resolvedUserId)
    .eq('source_type', 'l2_challenge')
    .eq('source_entity_id', invitation_id)
    .maybeSingle();
  if (existingTraj && sigPayloadExisting?.format === 'l2_conversation') {
    console.log(JSON.stringify({
      type: 'l2_idempotent_skip', correlation_id: correlationId,
      function_name: 'analyze-open-answer', invitation_id,
    }));
    return jsonResponse({ status: 'idempotent_skip', signals_payload: sigPayloadExisting });
  }

  // 4. Build prompt with stable criterion_ids
  const enriched = await Promise.all(rubricCfg.map(async (r) => ({
    ...r,
    criterion_id: await sha1Hex12(`${r.primary_pillar}|${r.criterion}`),
  })));
  const criterionMap = new Map(enriched.map(e => [e.criterion_id, e]));

  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];
  const candidateTurns = transcript.filter((t: any) => t?.role === 'candidate').length;
  const langName = language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Italian';

  const systemPrompt = `You are a senior interviewer evaluating an L2 simulated conversation for the XIMA platform.

PRINCIPLE: "Comprendere, non la perfezione" — read the candidate's behavior under tension, not their elegance.
Reward how the candidate handled the curveball more than baseline politeness.

CONTEXT:
- Counterpart: ${counterpart.name || 'counterpart'} (${counterpart.role || 'unknown role'}). Stance: ${counterpart.stance || 'neutral'}.
- Scenario: ${scenario}

RUBRIC (score each criterion 0-100 with a one-line verbatim evidence quote from the candidate's transcript):
${enriched.map(e => `- [${e.criterion_id}] (${e.primary_pillar}, weight ${e.weight}) ${e.criterion} — ${e.description || ''}`).join('\n')}

FLAGS — include any that apply: refusal, off_topic, hostile, evasion, non_answer, low_engagement.

OUTPUT: respond in ${langName}. Return ONLY valid JSON with this exact shape:
{
  "framing": <0-100>,
  "execution_bias": <0-100>,
  "impact_thinking": <0-100>,
  "decision_quality": <0-100>,
  "overall": <0-100>,
  "summary": "<= 60 words in ${langName}>",
  "flags": [],
  "confidence": "low" | "medium" | "high",
  "rubric_breakdown": [
    { "criterion_id": "<echo exact id>", "score": <0-100>, "evidence_quote": "<one short verbatim quote>" }
  ],
  "pillar_reasoning": "<brief>"
}

The rubric_breakdown MUST echo every criterion_id from the rubric above, exactly once. Do not invent ids.`;

  const transcriptText = transcript
    .map((t: any) => `[${t.role}${t.curveball ? '/CURVEBALL' : ''} t=${t.turn}] ${String(t.text || '').slice(0, 800)}`)
    .join('\n');
  const userPrompt = `OPENING LINE: ${String(payload.opening_line || '')}

TRANSCRIPT:
${transcriptText}

CURVEBALL FIRED: ${payload.curveball_fired ? 'yes' : 'no'}
END REASON: ${payload.reason || 'unknown'}

Evaluate. Return ONLY the JSON object.`;

  // 5. Model call with Opus fallback chain
  let aiContent = '';
  let usedModel = '';
  let aiRequestId = '';
  let lastError: { code: string; message: string } | null = null;
  const tried: string[] = [];

  for (const model of OPUS_FALLBACK_CHAIN) {
    tried.push(model);
    try {
      const resp = await callAnthropicApi({
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'analyze-open-answer',
        inputSummary: `l2_conversation:inv=${invitation_id},model=${model},turns=${candidateTurns}`,
        model,
        maxTokens: 2500,
        // Opus 4.x deprecates `temperature`; omit per-call override.
        promptTemplateVersion: 'l2_conversation_v1',
      });
      aiContent = resp.content;
      usedModel = resp.model;
      aiRequestId = resp.requestId;
      lastError = null;
      break;
    } catch (e) {
      if (e instanceof AnthropicError) {
        lastError = { code: e.errorCode, message: e.message };
        const msg = (e.message || '').toLowerCase();
        const isNotFound = e.statusCode === 404
          || (e.statusCode === 400 && msg.includes('model') && (msg.includes('not_found') || msg.includes('not found') || msg.includes('invalid') || msg.includes('does not exist')));
        if (!isNotFound) {
          return errorResponse(e.statusCode, e.errorCode, e.message);
        }
        console.warn(JSON.stringify({
          type: 'opus_model_fallback_attempt', correlation_id: correlationId,
          function_name: 'analyze-open-answer', tried_model: model, error: e.message,
        }));
        continue;
      }
      throw e;
    }
  }

  if (!aiContent) {
    try {
      const resp = await callAnthropicApi({
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'analyze-open-answer',
        inputSummary: `l2_conversation:inv=${invitation_id},sonnet_last_resort`,
        model: SONNET_LAST_RESORT,
        maxTokens: 2500,
        promptTemplateVersion: 'l2_conversation_v1',
      });
      aiContent = resp.content;
      usedModel = resp.model;
      aiRequestId = resp.requestId;
      tried.push(SONNET_LAST_RESORT);
      console.warn(JSON.stringify({
        type: 'model_fallback_to_sonnet', correlation_id: correlationId,
        function_name: 'analyze-open-answer', tried, last_opus_error: lastError,
      }));
    } catch (e) {
      if (e instanceof AnthropicError) return errorResponse(e.statusCode, e.errorCode, e.message);
      throw e;
    }
  }

  // 6. Parse + validate
  let parsed: any;
  try {
    parsed = extractJsonFromAiContent(aiContent);
    if (!parsed || typeof parsed !== 'object') throw new Error('non-object');
    for (const k of ['framing', 'execution_bias', 'impact_thinking', 'decision_quality', 'overall']) {
      if (typeof parsed[k] !== 'number') throw new Error(`missing ${k}`);
    }
    if (!Array.isArray(parsed.rubric_breakdown)) throw new Error('missing rubric_breakdown');
  } catch (e) {
    console.error(JSON.stringify({
      type: 'l2_parse_error', correlation_id: correlationId,
      function_name: 'analyze-open-answer', error: e instanceof Error ? e.message : 'unknown',
    }));
    return errorResponse(502, 'L2_PARSE_FAILED', 'AI evaluation failed to produce valid JSON');
  }

  const clamp = (n: any, lo: number, hi: number) => {
    const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
    return Math.max(lo, Math.min(hi, v));
  };
  const clampRound = (n: any, lo: number, hi: number) => Math.round(clamp(n, lo, hi));

  // 7. Confidence — string enum + low-engagement downgrade
  let confidence: 'low' | 'medium' | 'high';
  const rawConf = String(parsed.confidence || '').toLowerCase();
  confidence = (rawConf === 'low' || rawConf === 'high') ? rawConf : 'medium';
  const flags: string[] = Array.isArray(parsed.flags) ? parsed.flags.map((f: any) => String(f)) : [];
  if (candidateTurns < 4) {
    confidence = 'low';
    if (!flags.includes('low_engagement')) flags.push('low_engagement');
  }

  // 8. Rubric matching by criterion_id (not array order)
  const expectedIds = new Set(criterionMap.keys());
  const gotIds: string[] = [];
  const enrichedBreakdown: Array<Record<string, any>> = [];
  const pillarImpactFloat: Record<PillarKey, number> = {
    drive: 0, computational_power: 0, communication: 0, creativity: 0, knowledge: 0,
  };
  let nudgeSkipped = false;

  for (const entry of parsed.rubric_breakdown) {
    const cid = String(entry?.criterion_id || '');
    gotIds.push(cid);
    const cfg = criterionMap.get(cid);
    if (!cfg) continue;
    const score = clampRound(entry?.score, 0, 100);
    enrichedBreakdown.push({
      criterion_id: cid,
      criterion: cfg.criterion,
      primary_pillar: cfg.primary_pillar,
      weight: cfg.weight,
      score,
      evidence_quote: String(entry?.evidence_quote || '').slice(0, 500),
    });
    const pk = cfg.primary_pillar as PillarKey;
    if ((PILLAR_KEYS_L2 as readonly string[]).includes(pk)) {
      pillarImpactFloat[pk] += ((score - 50) / 50) * (cfg.weight / 100) * 5;
    }
  }

  const gotIdsSet = new Set(gotIds);
  const missing = [...expectedIds].filter(id => !gotIdsSet.has(id));
  const unknown = gotIds.filter(id => !expectedIds.has(id));
  if (missing.length > 0 || unknown.length > 0 || enrichedBreakdown.length !== rubricCfg.length) {
    nudgeSkipped = true;
    console.warn(JSON.stringify({
      type: 'rubric_mismatch', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      expected_ids: [...expectedIds], got_ids: gotIds, missing, unknown,
    }));
  }

  const pillarImpact: Record<PillarKey, number> = {
    drive: 0, computational_power: 0, communication: 0, creativity: 0, knowledge: 0,
  };
  for (const k of PILLAR_KEYS_L2) {
    const clamped = Math.max(-5, Math.min(5, pillarImpactFloat[k]));
    pillarImpact[k] = Math.round(clamped * 100) / 100;
  }

  const framing = clampRound(parsed.framing, 0, 100);
  const execution_bias = clampRound(parsed.execution_bias, 0, 100);
  const impact_thinking = clampRound(parsed.impact_thinking, 0, 100);
  const decision_quality = clampRound(parsed.decision_quality, 0, 100);
  const overall = clampRound(parsed.overall, 0, 100);

  // 9. Persist signals_payload
  const signalsPayload = {
    format: 'l2_conversation',
    signals_version: 'v1',
    scoring_context: 'l2_challenge',
    scored_at: new Date().toISOString(),
    model: usedModel,
    correlation_id: correlationId,
    framing, execution_bias, impact_thinking, decision_quality, overall,
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
    flags,
    confidence,
    rubric_breakdown: enrichedBreakdown,
    pillar_reasoning: typeof parsed.pillar_reasoning === 'string' ? parsed.pillar_reasoning : '',
    pillar_impact: pillarImpact,
    nudge_skipped: nudgeSkipped,
    ai_request_id: aiRequestId,
  };

  const { error: updErr } = await service
    .from('challenge_submissions')
    .update({ signals_payload: signalsPayload, signals_version: 'v1' })
    .eq('invitation_id', invitation_id);
  if (updErr) {
    console.error(JSON.stringify({
      type: 'l2_signals_write_failed', correlation_id: correlationId,
      function_name: 'analyze-open-answer', error: updErr.message,
    }));
    return errorResponse(500, 'L2_PERSIST_FAILED', updErr.message);
  }

  // 10. Trajectory persist (skipped on rubric mismatch)
  if (!nudgeSkipped) {
    try {
      await persistTrajectoryEvent({
        user_id: resolvedUserId,
        source_function: 'analyze-open-answer',
        source_type: 'l2_challenge',
        source_entity_id: invitation_id,
        correlation_id: correlationId,
        deltas: { ...pillarImpact },
        reasoning: signalsPayload.summary,
      });
    } catch (e) {
      console.error('[l2_trajectory] Error:', e instanceof Error ? e.message : e);
    }
  }

  emitAuditEventWithMetric({
    actorType: 'system',
    actorId: null,
    action: 'assessment.l2_conversation_scored',
    entityType: 'l2_submission',
    entityId: String(invitation_id),
    correlationId,
    metadata: { model: usedModel, tried, overall, confidence, nudge_skipped: nudgeSkipped, ai_request_id: aiRequestId },
    ipHash,
  }, 'l2_conversation.scored');

  console.log(JSON.stringify({
    type: 'l2_success', correlation_id: correlationId,
    function_name: 'analyze-open-answer', model: usedModel, tried, overall, confidence,
    nudge_skipped: nudgeSkipped, pillar_impact: pillarImpact,
  }));

  return jsonResponse({ status: 'ok', signals_payload: signalsPayload });
}

