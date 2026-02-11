import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway, extractJsonFromAiContent, generateCorrelationId, AiGatewayError } from "../_shared/aiClient.ts";
import { validateGeneratedChallenge, validateXimaCoreScenario } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";

interface GenerateChallengeRequest {
  task_description: string;
  role_title?: string;
  experience_level?: string;
  work_model?: string;
  country?: string;
  locale?: string;
}

interface GenerateXimaCoreRequest {
  mode: 'xima_core';
  locale?: string;
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

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish' };

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `\n\nCRITICAL LANGUAGE INSTRUCTION:\nYou MUST respond ONLY in ${targetLanguage}.\nDo NOT include any English words unless they are proper nouns, code identifiers, or product names.\nJSON keys must remain in English, but ALL values must be in ${targetLanguage}.`;
}

const XIMA_CORE_BASE_SCENARIO = `You join a team working on an important initiative. The goal is clear, but progress is slow. Stakeholders have different expectations, priorities conflict, and no one fully owns the outcome. You have no formal authority, but the deadline is approaching.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return unauthorizedResponse();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedResponse('Authentication failed');

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const hasBusiness = roles?.some(r => r.role === 'business');
    const hasAdmin = roles?.some(r => r.role === 'admin');
    if (!hasBusiness && !hasAdmin) return forbiddenResponse('Business role required to generate challenges');

    const body = await req.json();
    
    if (body.mode === 'xima_core') {
      return await handleXimaCoreGeneration(body as GenerateXimaCoreRequest, user.id, correlationId);
    }
    return await handleLegacyGeneration(body as GenerateChallengeRequest, user.id, correlationId);

  } catch (err) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'generate-challenge',
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error');
  }
});

async function handleXimaCoreGeneration(request: GenerateXimaCoreRequest, userId: string, correlationId: string): Promise<Response> {
  const { context, locale = 'en' } = request;
  const langInstruction = getLanguageInstruction(locale);

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

The scenario should feel like a real situation a professional might encounter.${langInstruction}`;

  const userPrompt = `Generate a scenario for a hiring assessment challenge.

Base template (adapt but keep the core tension):
"${XIMA_CORE_BASE_SCENARIO}"
${contextBlock}

Requirements:
1. Keep the scenario 80-120 words
2. Maintain the core tension: unclear ownership, deadline pressure, conflicting stakeholders
3. Adapt the business type and environment to feel realistic
4. Do NOT use real company names or specific proprietary details
5. Make it feel like a genuine professional challenge

Return ONLY a JSON object:
{
  "scenario": "The adapted scenario text...",
  "business_type": "Brief label like 'SaaS startup' or 'Enterprise consulting'"
}`;

  try {
    const aiResp = await callAiGateway({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      correlationId,
      functionName: 'generate-challenge',
    });

    const jsonStr = extractJsonFromAiContent(aiResp.content);
    const parsed = JSON.parse(jsonStr);
    const validated = validateXimaCoreScenario(parsed);

    if (!validated) {
      console.log(JSON.stringify({
        type: 'validation_fallback', correlation_id: correlationId,
        function_name: 'generate-challenge', used_fallback: true,
      }));
      return jsonResponse({ scenario: XIMA_CORE_BASE_SCENARIO, business_type: 'General business', used_fallback: true });
    }

    return jsonResponse(validated);
  } catch (e) {
    if (e instanceof AiGatewayError) {
      if (e.statusCode === 429 || e.statusCode === 402) return e.toResponse();
    }
    // Deterministic fallback
    return jsonResponse({ scenario: XIMA_CORE_BASE_SCENARIO, business_type: 'General business', used_fallback: true });
  }
}

async function handleLegacyGeneration(body: GenerateChallengeRequest, userId: string, correlationId: string): Promise<Response> {
  const { task_description, role_title, experience_level, work_model, country, locale = 'en' } = body;
  const langInstruction = getLanguageInstruction(locale);

  if (!task_description) {
    return errorResponse(400, 'INVALID_INPUT', 'task_description is required');
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
Keep the tone professional but approachable.${langInstruction}`;

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

  try {
    const aiResp = await callAiGateway({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      correlationId,
      functionName: 'generate-challenge',
    });

    const jsonStr = extractJsonFromAiContent(aiResp.content);
    const parsed = JSON.parse(jsonStr);
    const validated = validateGeneratedChallenge(parsed);

    if (!validated) {
      // Deterministic fallback
      return jsonResponse({
        title_suggestion: `${role_title || 'Skills'} Challenge`,
        candidate_facing_description: task_description,
        success_criteria: ['Clear and structured response', 'Demonstrates relevant skills', 'Realistic and practical approach'],
        time_estimate_minutes: 45,
        used_fallback: true,
      });
    }

    return jsonResponse(validated);
  } catch (e) {
    if (e instanceof AiGatewayError) {
      if (e.statusCode === 429 || e.statusCode === 402) return e.toResponse();
    }
    return jsonResponse({
      title_suggestion: `${role_title || 'Skills'} Challenge`,
      candidate_facing_description: task_description || '',
      success_criteria: ['Clear and structured response', 'Demonstrates relevant skills', 'Realistic approach'],
      time_estimate_minutes: 45,
      used_fallback: true,
    });
  }
}
