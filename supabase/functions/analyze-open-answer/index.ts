import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language-specific prompts for natural, clean output
const LANGUAGE_CONFIGS: Record<string, { name: string; feedbackStyle: string; toneGuidance: string }> = {
  en: {
    name: 'English',
    feedbackStyle: 'Write in clear, inspiring English. Be direct yet warm.',
    toneGuidance: 'Use motivational language that encourages growth. Avoid jargon.'
  },
  it: {
    name: 'Italian',
    feedbackStyle: 'Scrivi in italiano chiaro e ispirante. Sii diretto ma caloroso.',
    toneGuidance: 'Usa un linguaggio motivazionale che incoraggi la crescita. Evita il gergo tecnico.'
  },
  es: {
    name: 'Spanish',
    feedbackStyle: 'Escribe en español claro e inspirador. Sé directo pero cálido.',
    toneGuidance: 'Usa un lenguaje motivacional que fomente el crecimiento. Evita la jerga.'
  }
};

const FIELD_CONTEXTS: Record<string, string> = {
  science_tech: 'science, technology, engineering, data analysis, and technical problem-solving',
  business_leadership: 'business strategy, leadership, management, and organizational development',
  arts_creative: 'creative arts, design, storytelling, and artistic expression',
  service_ops: 'service delivery, operations, customer experience, and process optimization'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, field, language, openKey } = await req.json();

    if (!text || !field || !language || !openKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Clean the input text thoroughly
    const cleanedText = text
      .replace(/[._]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s*[._]+\s*/g, '')
      .replace(/\s*[._]+\s*$/g, '')
      .trim();

    const langConfig = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.en;
    const fieldContext = FIELD_CONTEXTS[field] || 'professional skills';

    console.log('Analyzing answer with Lovable AI:', { 
      field, 
      language, 
      openKey, 
      textLength: cleanedText.length,
      wordCount: cleanedText.split(/\s+/).filter(Boolean).length
    });

    const systemPrompt = `You are a supportive career coach and assessment expert. Your role is to evaluate open-ended professional answers with empathy, insight, and constructive guidance.

CRITICAL RULES:
- ALWAYS respond in ${langConfig.name}. Every word of your response must be in ${langConfig.name}.
- ${langConfig.feedbackStyle}
- ${langConfig.toneGuidance}
- Never use placeholder text, dots, underscores, or technical artifacts in your response.
- Write naturally as if speaking to a motivated professional who wants to grow.

EVALUATION CONTEXT:
- Field: ${fieldContext}
- Question type: ${openKey === 'open1' ? 'Creative thinking and problem-solving approach' : 'Goal-setting and professional drive'}

SCORING CRITERIA (be fair but encouraging):
1. CLARITY (0-20): How clear and well-articulated is the response? Can the reader easily understand the main points?
2. DEPTH (0-25): Does the answer show thoughtful analysis? Does it go beyond surface-level thinking?
3. RELEVANCE (0-20): How well does the answer relate to the professional field and question context?
4. COHERENCE (0-20): Is the answer well-organized with logical flow from start to finish?
5. INSIGHT (0-15): Does the answer demonstrate unique perspective, self-awareness, or actionable thinking?

YOUR RESPONSE STRUCTURE:
Provide a JSON object with:
1. "score_breakdown": numeric scores for each criterion
2. "explanation": A warm, 2-3 sentence explanation of the score that highlights what the person did well AND where they can grow. Be specific and encouraging.
3. "suggestions": 2-3 practical, actionable tips written in a friendly, coaching tone. Each should be a complete, helpful sentence.

Return ONLY valid JSON:
{
  "score_breakdown": {
    "clarity": 16,
    "depth": 20,
    "relevance": 17,
    "coherence": 15,
    "insight": 12
  },
  "explanation": "Your response shows genuine self-awareness and a clear understanding of your strengths. You could take it to the next level by adding a specific example that brings your ideas to life.",
  "suggestions": [
    "Try including one concrete example from your experience to illustrate your main point",
    "Consider adding what specific outcome or result you achieved",
    "Think about connecting your approach to a broader professional goal"
  ]
}`;

    const userPrompt = `Evaluate this open-ended professional assessment answer.

Answer to evaluate:
"""
${cleanedText}
"""

Remember: 
- Respond entirely in ${langConfig.name}
- Be encouraging but honest
- Focus on growth potential
- Keep suggestions practical and specific`;

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
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ error: "No content in AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the AI response
    let parsedResult;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      parsedResult = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", rawResponse: aiContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map new criteria to legacy format for backward compatibility
    const breakdown = parsedResult.score_breakdown;
    const mappedBreakdown = {
      length: Math.round(breakdown.clarity || 0),        // clarity -> length slot
      relevance: Math.round(breakdown.depth || 0),       // depth -> relevance slot  
      structure: Math.round(breakdown.relevance || 0),   // relevance -> structure slot
      specificity: Math.round(breakdown.coherence || 0), // coherence -> specificity slot
      action: Math.round(breakdown.insight || 0)         // insight -> action slot
    };

    const total = mappedBreakdown.length + 
                  mappedBreakdown.relevance + 
                  mappedBreakdown.structure + 
                  mappedBreakdown.specificity + 
                  mappedBreakdown.action;

    // Clean any artifacts from the explanation and suggestions
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
      score_total: Math.round(Math.min(100, total)),
      score_breakdown: mappedBreakdown,
      steve_jobs_explanation: cleanText(parsedResult.explanation || ""),
      improvement_suggestions: (parsedResult.suggestions || []).map(cleanText).filter(Boolean),
      cleaned_text: cleanedText
    };

    console.log('Analysis complete:', { 
      total: result.score_total, 
      language,
      explanationLength: result.steve_jobs_explanation.length,
      suggestionsCount: result.improvement_suggestions.length
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
