import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateChallengeRequest {
  task_description: string;
  role_title?: string;
  experience_level?: string;
  work_model?: string;
  country?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      task_description, 
      role_title, 
      experience_level, 
      work_model, 
      country 
    }: GenerateChallengeRequest = await req.json();

    console.log('[generate-challenge] Received request:', { 
      task_description: task_description?.substring(0, 100), 
      role_title, 
      experience_level 
    });

    if (!task_description) {
      return new Response(
        JSON.stringify({ error: 'task_description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[generate-challenge] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contextParts = [
      `Task Description: ${task_description}`,
      role_title ? `Role: ${role_title}` : '',
      experience_level ? `Experience Level: ${experience_level}` : '',
      work_model ? `Work Model: ${work_model}` : '',
      country ? `Location: ${country}` : '',
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are an expert HR professional creating hiring challenges. 
Generate a practical, skills-based challenge that evaluates candidates fairly and effectively.
The challenge should be realistic, take-home style, and focus on demonstrating relevant skills.
Keep the tone professional but approachable.`;

    const userPrompt = `Based on this hiring context:
${contextParts}

Generate a hiring challenge with:
1. A compelling title (5-8 words)
2. A candidate-facing description (120-200 words) explaining what they'll do and why it matters
3. Exactly 3 success criteria as bullet points (what makes a great submission)
4. Estimated time to complete in minutes (realistic range like 30-60)

Return ONLY a JSON object with this exact structure:
{
  "title_suggestion": "string",
  "candidate_facing_description": "string",
  "success_criteria": ["string", "string", "string"],
  "time_estimate_minutes": number
}`;

    console.log('[generate-challenge] Calling Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-challenge] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate challenge' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    console.log('[generate-challenge] AI response content:', content?.substring(0, 200));

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[generate-challenge] Failed to parse AI response:', parseErr);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate response structure
    const result = {
      title_suggestion: parsed.title_suggestion || `${role_title || 'Skills'} Challenge`,
      candidate_facing_description: parsed.candidate_facing_description || '',
      success_criteria: Array.isArray(parsed.success_criteria) ? parsed.success_criteria.slice(0, 3) : [],
      time_estimate_minutes: typeof parsed.time_estimate_minutes === 'number' 
        ? parsed.time_estimate_minutes 
        : 45,
    };

    console.log('[generate-challenge] Generated challenge:', { 
      title: result.title_suggestion,
      criteriaCount: result.success_criteria.length,
      timeEstimate: result.time_estimate_minutes
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[generate-challenge] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
