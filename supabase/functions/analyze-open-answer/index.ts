import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway, generateCorrelationId, AiGatewayError } from "../_shared/aiClient.ts";
import { validateOpenAnswerScoring } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse } from "../_shared/errors.ts";

// =====================================================
// NON-ANSWER DETECTION (Pre-LLM Hard Rules)
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
// LANGUAGE CONFIGS
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

// Max input length for answers
const MAX_ANSWER_LENGTH = 5000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    const { text, field, language, openKey, user_id } = await req.json();

    if (!field || !language || !openKey) {
      return errorResponse(400, 'INVALID_INPUT', 'Missing required parameters');
    }

    // ===== INPUT LENGTH VALIDATION =====
    const rawText = text || '';
    if (rawText.length > MAX_ANSWER_LENGTH) {
      return errorResponse(400, 'INPUT_TOO_LONG', `Answer too long. Maximum ${MAX_ANSWER_LENGTH} characters allowed.`);
    }

    // ===== GDPR: Profiling opt-out check =====
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
          console.log(JSON.stringify({
            type: 'gdpr_block', correlation_id: correlationId,
            function_name: 'analyze-open-answer', reason: 'profiling_opt_out',
          }));
          return profilingOptOutResponse();
        }
      }
    }

    const cleanedText = rawText
      .replace(/[._]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s*[._]+\s*/g, '')
      .replace(/\s*[._]+\s*$/g, '')
      .trim();

    const langConfig = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.en;
    const fieldContext = FIELD_CONTEXTS[field] || 'professional skills';

    // STEP 1: Pre-LLM Non-Answer Detection
    const nonAnswerCheck = detectNonAnswer(cleanedText);

    console.log(JSON.stringify({
      type: 'request', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      field, language, openKey,
      answer_length: cleanedText.length,
      word_count: nonAnswerCheck.debugInfo.wordCount,
      non_answer_detected: nonAnswerCheck.isNonAnswer,
    }));

    if (nonAnswerCheck.isNonAnswer) {
      return jsonResponse({
        score_total: 5,
        score_breakdown: { length: 0, relevance: 0, structure: 0, specificity: 0, action: 5 },
        quality_label: 'insufficient',
        steve_jobs_explanation: langConfig.nonAnswerFeedback,
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
      });
    }

    // STEP 2: LLM Evaluation
    const systemPrompt = `You are a strict but fair professional assessment evaluator. Your job is to score open-ended answers accurately and honestly.

CRITICAL RULES:
- ALWAYS respond in ${langConfig.name}. Every word must be in ${langConfig.name}.
- ${langConfig.feedbackStyle}
- Be honest and accurate. Do NOT inflate scores.
- NEVER give high scores to vague, generic, or off-topic answers.

EVALUATION CONTEXT:
- Field: ${fieldContext}
- Question type: ${openKey === 'open1' ? 'Creative thinking and problem-solving' : 'Goal-setting and professional drive'}

SCORING CRITERIA (strict scale 0-100):
- 0-20 (poor): Vague, off-topic, lacks substance, generic statements without examples
- 21-50 (fair): Some relevant content but lacking depth, specificity, or clear examples
- 51-75 (good): Clear, relevant response with some specific examples and logical structure
- 76-100 (excellent): Exceptional depth, specific examples, clear reasoning, strong connection to field

RED FLAGS (if detected, cap score accordingly):
- "generic": Uses only general statements without specifics → cap at 40
- "off_topic": Does not address the question → cap at 25
- "contradiction": Contains logical contradictions → cap at 35
- "copy_paste": Appears to be copied generic text → cap at 30
- "admission_of_not_knowing": Contains phrases like "I'm not sure" mid-answer → cap at 45

SELF-CHECK RULES:
1. If the answer lacks ANY specific examples or numbers, score cannot exceed 60.
2. If the answer does not mention the professional field context, score cannot exceed 50.
3. If the answer is under 50 words, score cannot exceed 40.
4. If you detect any red flags, apply the cap.

Return ONLY valid JSON with this exact structure:
{
  "score": <number 0-100>,
  "quality_label": "<poor|fair|good|excellent>",
  "reasons": ["<reason1>", "<reason2>"],
  "improvement_tips": ["<tip1>", "<tip2>", "<tip3>"],
  "detected_red_flags": ["<flag1>"] or []
}`;

    const userPrompt = `Evaluate this professional assessment answer strictly and fairly.

ANSWER TO EVALUATE:
"""
${cleanedText}
"""

Apply all scoring rules and self-checks. Be honest - do not inflate the score.
Return ONLY the JSON object, no other text.`;

    let parsedResult;

    try {
      const aiResp = await callAiGateway({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        correlationId,
        functionName: 'analyze-open-answer',
        inputSummary: `open_answer:field=${field},lang=${language},key=${openKey},len=${cleanedText.length}`,
      });

      try {
        const jsonMatch = aiResp.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          aiResp.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          aiResp.content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResp.content;
        const parsed = JSON.parse(jsonString.trim());
        parsedResult = validateOpenAnswerScoring(parsed);
      } catch {
        console.error(JSON.stringify({
          type: 'parse_error', correlation_id: correlationId,
          function_name: 'analyze-open-answer',
        }));
      }
    } catch (e) {
      if (e instanceof AiGatewayError) {
        // On AI failure, return explicit error — no silent defaults
        return errorResponse(e.statusCode, e.errorCode, e.message);
      }
      throw e;
    }

    // If validation failed, return explicit error
    if (!parsedResult) {
      return errorResponse(502, 'OPEN_ANSWER_PARSE_FAILED',
        'AI evaluation failed to produce valid results. Please try again.');
    }

    // STEP 3: Post-LLM Guardrails (enforce caps)
    let finalScore = parsedResult.score;
    const redFlags = parsedResult.detected_red_flags;

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

    let qualityLabel: 'poor' | 'fair' | 'good' | 'excellent' = parsedResult.quality_label;
    if (finalScore <= 20) qualityLabel = 'poor';
    else if (finalScore <= 50) qualityLabel = 'fair';
    else if (finalScore <= 75) qualityLabel = 'good';
    else qualityLabel = 'excellent';

    const scoreRatio = finalScore / 100;
    const mappedBreakdown = {
      length: Math.round(20 * scoreRatio),
      relevance: Math.round(25 * scoreRatio),
      structure: Math.round(20 * scoreRatio),
      specificity: Math.round(20 * scoreRatio),
      action: Math.round(15 * scoreRatio),
    };

    const cleanText = (str: string) => {
      if (!str) return '';
      return str.replace(/[._]{2,}/g, ' ').replace(/^\s*[._]+/g, '').replace(/[._]+\s*$/g, '').replace(/\s+/g, ' ').trim();
    };

    const result = {
      score_total: finalScore,
      score_breakdown: mappedBreakdown,
      quality_label: qualityLabel,
      steve_jobs_explanation: cleanText(parsedResult.reasons.join(' ')),
      improvement_suggestions: parsedResult.improvement_tips.map(cleanText).filter(Boolean),
      detected_red_flags: redFlags,
      cleaned_text: cleanedText,
      non_answer_detected: false,
    };

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      original_score: parsedResult.score,
      final_score: finalScore,
      quality_label: qualityLabel,
      red_flags_count: redFlags.length,
    }));

    return jsonResponse(result);

  } catch (error) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'analyze-open-answer',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
});
