import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface GenerateXimaCoreRequest {
  mode: 'xima_core';
  context: {
    companyIndustry?: string;
    companySize?: string;
    companyMaturity?: string;
    decisionStyle?: string;
    roleTitle?: string;
    functionArea?: string;
    experienceLevel?: string;
    taskDescription?: string;
  };
}

const XIMA_CORE_BASE_SCENARIO = `You join a team working on an important initiative. The goal is clear, but progress is slow. Stakeholders have different expectations, priorities conflict, and no one fully owns the outcome. You have no formal authority, but the deadline is approaching.`;

serve(async (req) => {
  console.log('[generate-challenge] Function invoked - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[generate-challenge] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[generate-challenge] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-challenge] Authenticated user:', user.id);

    // Check if user has business role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('[generate-challenge] Roles query error:', rolesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasBusiness = roles?.some(r => r.role === 'business');
    const hasAdmin = roles?.some(r => r.role === 'admin');

    if (!hasBusiness && !hasAdmin) {
      console.error('[generate-challenge] User lacks business role:', user.id);
      return new Response(
        JSON.stringify({ error: 'Business role required to generate challenges' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-challenge] User authorized - roles:', roles?.map(r => r.role).join(', '));

    const body = await req.json();
    console.log('[generate-challenge] Request body received:', JSON.stringify(body).substring(0, 300));
    console.log('[generate-challenge] Mode check:', body.mode, 'is xima_core:', body.mode === 'xima_core');
    
    // Check if this is a XIMA Core Challenge request
    if (body.mode === 'xima_core') {
      console.log('[generate-challenge] Routing to XIMA Core generation');
      return await handleXimaCoreGeneration(body as GenerateXimaCoreRequest, user.id);
    }
    
    // Legacy challenge generation
    console.log('[generate-challenge] Routing to Legacy generation');
    return await handleLegacyGeneration(body as GenerateChallengeRequest, user.id);

  } catch (err) {
    console.error('[generate-challenge] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleXimaCoreGeneration(request: GenerateXimaCoreRequest, userId: string): Promise<Response> {
  const { context } = request;
  console.log('[generate-challenge] XIMA Core mode - context:', context, 'userId:', userId);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('[generate-challenge] LOVABLE_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'AI service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build context description for AI
  const contextParts: string[] = [];
  if (context.companyIndustry) contextParts.push(`Industry: ${context.companyIndustry}`);
  if (context.companySize) contextParts.push(`Company size: ${context.companySize}`);
  if (context.companyMaturity) contextParts.push(`Organizational maturity: ${context.companyMaturity}`);
  if (context.decisionStyle) contextParts.push(`Decision-making environment: ${context.decisionStyle}`);
  if (context.roleTitle) contextParts.push(`Role being hired: ${context.roleTitle}`);
  if (context.functionArea) contextParts.push(`Function area: ${context.functionArea}`);
  if (context.experienceLevel) contextParts.push(`Seniority: ${context.experienceLevel}`);
  if (context.taskDescription) contextParts.push(`Role context: ${context.taskDescription.substring(0, 200)}`);

  const hasContext = contextParts.length > 0;
  const contextBlock = hasContext 
    ? `\n\nOrganizational context (use to make the scenario feel realistic, but do NOT include company-specific details):\n${contextParts.join('\n')}`
    : '';

  const systemPrompt = `You are an expert organizational psychologist creating assessment scenarios for hiring.
Your task is to generate a realistic business scenario that:
- Features ambiguous ownership and conflicting priorities
- Has no single correct answer
- Feels authentic to the given organizational context
- Does NOT reveal or reference specific company information
- Creates genuine tension that requires judgment to navigate

The scenario should feel like a real situation a professional might encounter.`;

  const userPrompt = `Generate a scenario for a hiring assessment challenge.

Base template (adapt but keep the core tension):
"${XIMA_CORE_BASE_SCENARIO}"
${contextBlock}

Requirements:
1. Keep the scenario 80-120 words
2. Maintain the core tension: unclear ownership, deadline pressure, conflicting stakeholders
3. Adapt the business type and environment to feel realistic (e.g., SaaS product launch, enterprise integration, operations optimization, etc.)
4. Do NOT use real company names or specific proprietary details
5. Make it feel like a genuine professional challenge

Return ONLY a JSON object:
{
  "scenario": "The adapted scenario text...",
  "business_type": "Brief label like 'SaaS startup' or 'Enterprise consulting'"
}`;

  console.log('[generate-challenge] Calling Lovable AI for XIMA Core scenario...');

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
      temperature: 0.8, // Higher temperature for more variety
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
    
    // Fallback to base scenario
    console.log('[generate-challenge] Falling back to base scenario');
    return new Response(
      JSON.stringify({ 
        scenario: XIMA_CORE_BASE_SCENARIO,
        business_type: 'General business'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;
  
  console.log('[generate-challenge] AI response:', content?.substring(0, 200));

  if (!content) {
    return new Response(
      JSON.stringify({ 
        scenario: XIMA_CORE_BASE_SCENARIO,
        business_type: 'General business'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse JSON from response
  let parsed;
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('[generate-challenge] Failed to parse AI response:', parseErr);
    return new Response(
      JSON.stringify({ 
        scenario: XIMA_CORE_BASE_SCENARIO,
        business_type: 'General business'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const result = {
    scenario: parsed.scenario || XIMA_CORE_BASE_SCENARIO,
    business_type: parsed.business_type || 'General business',
  };

  console.log('[generate-challenge] Generated XIMA Core scenario:', {
    length: result.scenario.length,
    businessType: result.business_type,
    generatedBy: userId
  });

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleLegacyGeneration(body: GenerateChallengeRequest, userId: string): Promise<Response> {
  const { 
    task_description, 
    role_title, 
    experience_level, 
    work_model, 
    country 
  } = body;

  console.log('[generate-challenge] Legacy mode - parsed request:', { 
    task_description: task_description?.substring(0, 100), 
    role_title, 
    experience_level,
    generatedBy: userId
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
    timeEstimate: result.time_estimate_minutes,
    generatedBy: userId
  });

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
