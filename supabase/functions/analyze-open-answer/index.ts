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
    const { text, field, language, openKey, user_id, challenge_id, scoring_context } = await req.json();

    if (!field || !language || !openKey) {
      return errorResponse(400, 'INVALID_INPUT', 'Missing required parameters');
    }

    const rawText = text || '';
    if (rawText.length > MAX_ANSWER_LENGTH) {
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

    // Input cleaning — KEPT EXACTLY
    const cleanedText = rawText
      .replace(/[._]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s*[._]+\s*/g, '')
      .replace(/\s*[._]+\s*$/g, '')
      .trim();

    const langConfig = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.en;
    const fieldContext = FIELD_CONTEXTS[field] || 'professional skills';

    // STEP 1: Pre-LLM Non-Answer Detection — KEPT EXACTLY
    const nonAnswerCheck = detectNonAnswer(cleanedText);

    console.log(JSON.stringify({
      type: 'request', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      field, language, openKey,
      answer_length: cleanedText.length,
      word_count: nonAnswerCheck.debugInfo.wordCount,
      non_answer_detected: nonAnswerCheck.isNonAnswer,
      scoring_context: scoring_context || 'core_assessment',
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

    // STEP 2: Claude Evaluation
    const systemPrompt = `You are a strict but fair professional assessment evaluator for the XIMA psychometric talent platform.

CRITICAL RULES:
- ALWAYS respond in ${langConfig.name}. Every word must be in ${langConfig.name}.
- ${langConfig.feedbackStyle}
- Be honest and accurate. Do NOT inflate scores.
- NEVER give high scores to vague, generic, or off-topic answers.

EVALUATION CONTEXT:
- Field: ${fieldContext}
- Question type: ${openKey === 'open1' ? 'Creative thinking and problem-solving' : 'Goal-setting and professional drive'}
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
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'analyze-open-answer',
        inputSummary: `open_answer:field=${field},lang=${language},key=${openKey},len=${cleanedText.length},ctx=${scoring_context || 'core'}`,
        maxTokens: 2048,
      });

      aiRequestId = aiResp.requestId;
      const jsonStr = extractJsonFromAiContent(aiResp.content);
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (typeof parsed?.score !== 'number' || parsed.score < 0 || parsed.score > 100) throw new Error('Invalid score');
      if (!Array.isArray(parsed?.reasons)) throw new Error('Missing reasons');
      if (!Array.isArray(parsed?.improvement_tips)) throw new Error('Missing tips');
      if (!Array.isArray(parsed?.detected_red_flags)) throw new Error('Missing flags');
      if (!parsed?.score_breakdown || typeof parsed.score_breakdown !== 'object') throw new Error('Missing breakdown');

      parsedResult = parsed;
    } catch (e) {
      if (e instanceof AnthropicError) {
        return errorResponse(e.statusCode, e.errorCode, e.message);
      }
      console.error(JSON.stringify({ type: 'parse_error', correlation_id: correlationId, function_name: 'analyze-open-answer', error: e instanceof Error ? e.message : 'Unknown' }));
      return errorResponse(502, 'OPEN_ANSWER_PARSE_FAILED', 'AI evaluation failed to produce valid results. Please try again.');
    }

    // STEP 3: Post-LLM Guardrails — KEPT EXACTLY
    let finalScore = Math.round(parsedResult.score);
    const redFlags: string[] = parsedResult.detected_red_flags.map(String);

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

    let qualityLabel: string;
    if (finalScore <= 20) qualityLabel = 'poor';
    else if (finalScore <= 50) qualityLabel = 'fair';
    else if (finalScore <= 75) qualityLabel = 'good';
    else qualityLabel = 'excellent';

    // Use real breakdown from Claude (not synthetic proportional split)
    const scoreBreakdown = parsedResult.score_breakdown || {
      relevance: Math.round(25 * finalScore / 100),
      depth: Math.round(25 * finalScore / 100),
      structure: Math.round(25 * finalScore / 100),
      originality: Math.round(25 * finalScore / 100),
    };

    const cleanText = (str: string) => {
      if (!str) return '';
      return str.replace(/[._]{2,}/g, ' ').replace(/^\s*[._]+/g, '').replace(/[._]+\s*$/g, '').replace(/\s+/g, ' ').trim();
    };

    const pillarImpact = parsedResult.pillar_impact || null;

    // Audit event
    emitAuditEventWithMetric({
      actorType: 'system',
      actorId: null,
      action: 'assessment.open_answer_scored',
      entityType: 'open_answer',
      entityId: `${field}:${openKey}`,
      correlationId,
      metadata: { field, openKey, finalScore, qualityLabel, redFlagsCount: redFlags.length, ai_request_id: aiRequestId, scoring_context: scoring_context || 'core_assessment' },
      ipHash,
    }, 'open_answer.scored');

    // ===== EVIDENCE LEDGER — KEPT EXACTLY =====
    if (user_id && typeof user_id === 'string') {
      try {
        const contentHash = await computeContentHash(cleanedText);
        const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        
        const { data: profile } = await serviceClient.from('profiles').select('id').eq('user_id', user_id).single();

        if (profile) {
          const { data: openResp } = await serviceClient
            .from('assessment_open_responses')
            .select('id, attempt_id')
            .eq('user_id', user_id)
            .eq('field_key', field)
            .eq('open_key', openKey)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (openResp) {
            persistEvidenceLedgerEntry({
              open_response_id: openResp.id,
              subject_profile_id: profile.id,
              attempt_id: openResp.attempt_id,
              field_key: field,
              open_key: openKey,
              ai_request_id: aiRequestId,
              final_score: finalScore,
              quality_label: qualityLabel,
              key_reasons: parsedResult.reasons.slice(0, 5).map(String),
              detected_red_flags: redFlags,
              score_breakdown: scoreBreakdown,
              content_hash: contentHash,
              content_length: cleanedText.length,
              content_language: language,
            });
          }
        }
      } catch (ledgerErr) {
        console.error('[evidence_ledger] Outer error:', ledgerErr instanceof Error ? ledgerErr.message : ledgerErr);
      }
    }

    // ===== PILLAR TRAJECTORY — NEW =====
    let levelUpStatus: any = null;
    if (user_id && typeof user_id === 'string' && pillarImpact && !nonAnswerCheck.isNonAnswer) {
      const sourceType = scoring_context === 'l1_challenge' ? 'l1_challenge' as const
        : scoring_context === 'l2_challenge' ? 'l2_challenge' as const
        : 'open_answer' as const;

      try {
        const levelCheck = await persistTrajectoryEvent({
          user_id,
          source_function: "analyze-open-answer",
          source_type: sourceType,
          source_entity_id: challenge_id || `${field}:${openKey}`,
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

        if (levelCheck?.eligible || levelCheck?.evolution_eligible) {
          levelUpStatus = { eligible: levelCheck.eligible, evolution_eligible: levelCheck.evolution_eligible, current_level: levelCheck.current_level };
        }
      } catch (trajErr) {
        console.error('[trajectory] Error:', trajErr instanceof Error ? trajErr.message : trajErr);
      }
    }

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      original_score: parsedResult.score, final_score: finalScore,
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
    return errorResponse(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
});
