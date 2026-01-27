import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// NON-ANSWER DETECTION (Pre-LLM Hard Rules)
// =====================================================

const NON_ANSWER_PATTERNS: RegExp[] = [
  // English patterns
  /^(i\s*)?don'?t\s*know/i,
  /^idk$/i,
  /^no\s*idea/i,
  /^not\s*sure/i,
  /^n\/?a$/i,
  /^none$/i,
  /^nothing$/i,
  /^can'?t\s*answer/i,
  /^no\s*comment/i,
  /^pass$/i,
  /^skip$/i,
  /^dunno$/i,
  /^\?+$/,
  // Italian patterns
  /^non\s*(lo\s*)?so/i,
  /^boh$/i,
  /^non\s*saprei/i,
  /^niente$/i,
  /^nessuna?\s*idea/i,
  /^non\s*ho\s*idea/i,
  // Spanish patterns
  /^no\s*s[eé]/i,
  /^ni\s*idea/i,
  /^nada$/i,
  /^sin\s*idea/i,
  /^no\s*tengo\s*idea/i,
];

const FILLER_ONLY_PATTERNS: RegExp[] = [
  /^[.\s]+$/,          // Only dots/spaces
  /^[-_\s]+$/,         // Only dashes/underscores/spaces
  /^[…\s]+$/,          // Only ellipsis
  /^\p{Emoji}+$/u,     // Only emojis
  /^(\.{2,}\s*)+$/,    // Repeated dots
  /^[x]+$/i,           // Just x's
  /^(test|testing)$/i, // Test submissions
  /^(asdf|qwerty|abc)/i, // Keyboard mashing
];

interface NonAnswerResult {
  isNonAnswer: boolean;
  reason?: string;
  debugInfo: {
    normalizedLength: number;
    wordCount: number;
    matchedPattern?: string;
  };
}

function detectNonAnswer(text: string): NonAnswerResult {
  // Normalize: lowercase, trim, collapse whitespace
  const normalized = (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  const debugInfo = {
    normalizedLength: normalized.length,
    wordCount,
    matchedPattern: undefined as string | undefined,
  };

  // Rule 1: Too short (< 15 chars = non-answer)
  if (normalized.length < 15) {
    return {
      isNonAnswer: true,
      reason: 'too_short',
      debugInfo: { ...debugInfo, matchedPattern: 'length < 15' },
    };
  }

  // Rule 2: Filler-only content
  for (const pattern of FILLER_ONLY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isNonAnswer: true,
        reason: 'filler_only',
        debugInfo: { ...debugInfo, matchedPattern: pattern.source },
      };
    }
  }

  // Rule 3: Known non-answer phrases
  for (const pattern of NON_ANSWER_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isNonAnswer: true,
        reason: 'non_answer_phrase',
        debugInfo: { ...debugInfo, matchedPattern: pattern.source },
      };
    }
  }

  // Rule 4: Very low word count (< 5 words after normalization)
  if (wordCount < 5) {
    return {
      isNonAnswer: true,
      reason: 'insufficient_words',
      debugInfo: { ...debugInfo, matchedPattern: 'wordCount < 5' },
    };
  }

  return { isNonAnswer: false, debugInfo };
}

// =====================================================
// LLM RESPONSE SCHEMA VALIDATION
// =====================================================

interface LLMScoringResponse {
  score: number;
  quality_label: 'poor' | 'fair' | 'good' | 'excellent';
  reasons: string[];
  improvement_tips: string[];
  detected_red_flags: string[];
}

function validateLLMResponse(parsed: unknown): LLMScoringResponse | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;

  // Validate score
  if (typeof obj.score !== 'number' || obj.score < 0 || obj.score > 100) return null;

  // Validate quality_label
  const validLabels = ['poor', 'fair', 'good', 'excellent'];
  if (!validLabels.includes(obj.quality_label as string)) return null;

  // Validate arrays
  if (!Array.isArray(obj.reasons)) return null;
  if (!Array.isArray(obj.improvement_tips)) return null;
  if (!Array.isArray(obj.detected_red_flags)) return null;

  return {
    score: Math.round(obj.score),
    quality_label: obj.quality_label as LLMScoringResponse['quality_label'],
    reasons: obj.reasons.map(String),
    improvement_tips: obj.improvement_tips.map(String),
    detected_red_flags: obj.detected_red_flags.map(String),
  };
}

// =====================================================
// LANGUAGE CONFIGS
// =====================================================

const LANGUAGE_CONFIGS: Record<string, { name: string; feedbackStyle: string; nonAnswerFeedback: string }> = {
  en: {
    name: 'English',
    feedbackStyle: 'Write in clear, professional English.',
    nonAnswerFeedback: 'Your response was too brief or unclear. To receive a meaningful score, please provide a substantive answer that demonstrates your thinking. Try to include specific examples, explain your reasoning, and connect your ideas to the question asked.'
  },
  it: {
    name: 'Italian',
    feedbackStyle: 'Scrivi in italiano chiaro e professionale.',
    nonAnswerFeedback: 'La tua risposta era troppo breve o poco chiara. Per ricevere un punteggio significativo, fornisci una risposta sostanziale che dimostri il tuo ragionamento. Prova a includere esempi specifici, spiega il tuo pensiero e collega le tue idee alla domanda posta.'
  },
  es: {
    name: 'Spanish',
    feedbackStyle: 'Escribe en español claro y profesional.',
    nonAnswerFeedback: 'Tu respuesta fue demasiado breve o poco clara. Para recibir una puntuación significativa, proporciona una respuesta sustancial que demuestre tu razonamiento. Intenta incluir ejemplos específicos, explica tu pensamiento y conecta tus ideas con la pregunta formulada.'
  }
};

const FIELD_CONTEXTS: Record<string, string> = {
  science_tech: 'science, technology, engineering, data analysis, and technical problem-solving',
  business_leadership: 'business strategy, leadership, management, and organizational development',
  arts_creative: 'creative arts, design, storytelling, and artistic expression',
  service_ops: 'service delivery, operations, customer experience, and process optimization'
};

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, field, language, openKey } = await req.json();

    // Validate required params (but allow empty text - it will be caught as non-answer)
    if (!field || !language || !openKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle null/undefined text as empty string
    const rawText = text || '';

    // Clean the input text
    const cleanedText = rawText
      .replace(/[._]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s*[._]+\s*/g, '')
      .replace(/\s*[._]+\s*$/g, '')
      .trim();

    const langConfig = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.en;
    const fieldContext = FIELD_CONTEXTS[field] || 'professional skills';

    // =====================================================
    // STEP 1: Pre-LLM Non-Answer Detection
    // =====================================================
    const nonAnswerCheck = detectNonAnswer(cleanedText);

    // Log minimal debug info (no PII)
    console.log('Open answer analysis:', {
      field,
      language,
      openKey,
      answer_length: cleanedText.length,
      word_count: nonAnswerCheck.debugInfo.wordCount,
      non_answer_detected: nonAnswerCheck.isNonAnswer,
      non_answer_reason: nonAnswerCheck.reason || null,
    });

    // If non-answer detected, return low score immediately (skip LLM)
    if (nonAnswerCheck.isNonAnswer) {
      const result = {
        score_total: 5, // Very low score
        score_breakdown: {
          length: 0,
          relevance: 0,
          structure: 0,
          specificity: 0,
          action: 5, // Minimal credit for attempting
        },
        quality_label: 'insufficient',
        steve_jobs_explanation: langConfig.nonAnswerFeedback,
        improvement_suggestions: [
          language === 'it' 
            ? 'Scrivi almeno 3-4 frasi complete che rispondano direttamente alla domanda.'
            : language === 'es'
            ? 'Escribe al menos 3-4 oraciones completas que respondan directamente a la pregunta.'
            : 'Write at least 3-4 complete sentences that directly address the question.',
          language === 'it'
            ? 'Includi un esempio concreto dalla tua esperienza.'
            : language === 'es'
            ? 'Incluye un ejemplo concreto de tu experiencia.'
            : 'Include a concrete example from your experience.',
          language === 'it'
            ? 'Spiega il tuo ragionamento e perché hai scelto questo approccio.'
            : language === 'es'
            ? 'Explica tu razonamiento y por qué elegiste este enfoque.'
            : 'Explain your reasoning and why you chose this approach.',
        ],
        detected_red_flags: ['non_answer', nonAnswerCheck.reason || 'unspecified'],
        cleaned_text: cleanedText,
        non_answer_detected: true,
      };

      console.log('Non-answer detected, returning low score:', { 
        reason: nonAnswerCheck.reason,
        final_score: result.score_total 
      });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // STEP 2: LLM Evaluation (only for substantive answers)
    // =====================================================
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Fallback: return conservative score on LLM failure
      return new Response(
        JSON.stringify({
          score_total: 25,
          score_breakdown: { length: 5, relevance: 5, structure: 5, specificity: 5, action: 5 },
          quality_label: 'fair',
          steve_jobs_explanation: 'We could not fully evaluate your response at this time. Please try again later.',
          improvement_suggestions: ['Please resubmit your answer for a complete evaluation.'],
          detected_red_flags: ['evaluation_error'],
          cleaned_text: cleanedText,
          non_answer_detected: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in AI response:", data);
      // Fallback on empty response
      return new Response(
        JSON.stringify({
          score_total: 25,
          score_breakdown: { length: 5, relevance: 5, structure: 5, specificity: 5, action: 5 },
          quality_label: 'fair',
          steve_jobs_explanation: 'We could not fully evaluate your response. Please try again.',
          improvement_suggestions: ['Please resubmit your answer for evaluation.'],
          detected_red_flags: ['empty_ai_response'],
          cleaned_text: cleanedText,
          non_answer_detected: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate LLM response
    let parsedResult: LLMScoringResponse | null = null;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        aiContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      const parsed = JSON.parse(jsonString.trim());
      parsedResult = validateLLMResponse(parsed);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
    }

    // If validation failed, return conservative fallback
    if (!parsedResult) {
      console.error("LLM response validation failed, using fallback");
      return new Response(
        JSON.stringify({
          score_total: 20,
          score_breakdown: { length: 4, relevance: 4, structure: 4, specificity: 4, action: 4 },
          quality_label: 'fair',
          steve_jobs_explanation: 'Your response has been recorded. We encountered an issue during evaluation.',
          improvement_suggestions: ['Please ensure your answer is detailed and specific.'],
          detected_red_flags: ['validation_failed'],
          cleaned_text: cleanedText,
          non_answer_detected: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // STEP 3: Post-LLM Guardrails (enforce caps)
    // =====================================================
    let finalScore = parsedResult.score;
    const redFlags = parsedResult.detected_red_flags;

    // Apply red flag caps
    if (redFlags.includes('generic') && finalScore > 40) finalScore = 40;
    if (redFlags.includes('off_topic') && finalScore > 25) finalScore = 25;
    if (redFlags.includes('contradiction') && finalScore > 35) finalScore = 35;
    if (redFlags.includes('copy_paste') && finalScore > 30) finalScore = 30;
    if (redFlags.includes('admission_of_not_knowing') && finalScore > 45) finalScore = 45;

    // Additional word count check
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 30 && finalScore > 35) {
      finalScore = 35;
      if (!redFlags.includes('too_short')) redFlags.push('too_short');
    }

    // Recalculate quality label based on capped score
    let qualityLabel: 'poor' | 'fair' | 'good' | 'excellent' = parsedResult.quality_label;
    if (finalScore <= 20) qualityLabel = 'poor';
    else if (finalScore <= 50) qualityLabel = 'fair';
    else if (finalScore <= 75) qualityLabel = 'good';
    else qualityLabel = 'excellent';

    // Map to legacy breakdown format (distribute score proportionally)
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
      return str
        .replace(/[._]{2,}/g, ' ')
        .replace(/^\s*[._]+/g, '')
        .replace(/[._]+\s*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
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

    console.log('LLM evaluation complete:', { 
      original_score: parsedResult.score,
      final_score: finalScore,
      quality_label: qualityLabel,
      red_flags: redFlags.length,
      word_count: wordCount,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-open-answer function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
