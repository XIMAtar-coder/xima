import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Clean the input text
    const cleanedText = text
      .replace(/[._]{2,}/g, ' ') // Remove repeated dots/underscores
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();

    console.log('Analyzing answer with Lovable AI:', { field, language, openKey, textLength: cleanedText.length });

    const systemPrompt = `You are an expert assessment evaluator. Analyze open-ended professional answers and score them across multiple criteria.

Your task:
1. Evaluate the answer based on these rubric criteria (return scores out of the max for each):
   - length (0-20): Reward 80-250 words, penalize too short or too long
   - relevance (0-25): How well does the answer relate to the field (${field})?
   - structure (0-20): Is it well-organized with clear beginning, middle, end?
   - specificity (0-20): Does it include concrete details, numbers, examples?
   - action (0-15): Does it demonstrate proactive thinking and impact?

2. Provide a Steve Jobs-style explanation (2-4 sentences):
   - Be visionary and inspiring
   - Use clear, simple, high-impact language
   - Focus on ONE key insight about what would elevate this answer
   - Explain why improving this matters for professional growth

3. Give 2-3 concrete improvement suggestions as bullet points

Return ONLY valid JSON in this exact format:
{
  "score_breakdown": {
    "length": 18,
    "relevance": 22,
    "structure": 15,
    "specificity": 19,
    "action": 14
  },
  "steve_jobs_explanation": "The answer shows promise, but it's missing the wow factor. Great ideas need specificity—real numbers, real outcomes, real impact. When you add those details, you don't just tell a story, you make people believe in your vision.",
  "improvement_suggestions": [
    "Add specific metrics or outcomes to demonstrate impact",
    "Structure your response with a clear beginning, middle, and conclusion",
    "Include concrete examples from your experience"
  ]
}`;

    const userPrompt = `Field: ${field}
Question Type: ${openKey}
Language: ${language}

Answer to evaluate:
"""
${cleanedText}
"""

Analyze this answer and provide scoring + Steve Jobs-style feedback.`;

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
        temperature: 0.7,
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
      // Extract JSON from markdown code blocks if present
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

    // Calculate total score
    const breakdown = parsedResult.score_breakdown;
    const total = (breakdown.length || 0) + 
                  (breakdown.relevance || 0) + 
                  (breakdown.structure || 0) + 
                  (breakdown.specificity || 0) + 
                  (breakdown.action || 0);

    const result = {
      score_total: Math.round(total),
      score_breakdown: {
        length: Math.round(breakdown.length || 0),
        relevance: Math.round(breakdown.relevance || 0),
        structure: Math.round(breakdown.structure || 0),
        specificity: Math.round(breakdown.specificity || 0),
        action: Math.round(breakdown.action || 0),
      },
      steve_jobs_explanation: parsedResult.steve_jobs_explanation || "",
      improvement_suggestions: parsedResult.improvement_suggestions || [],
      cleaned_text: cleanedText
    };

    console.log('Analysis complete:', { total: result.score_total });

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
