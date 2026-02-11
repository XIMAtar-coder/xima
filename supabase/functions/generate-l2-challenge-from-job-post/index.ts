import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway, extractJsonFromAiContent, generateCorrelationId, AiGatewayError } from "../_shared/aiClient.ts";
import { validateL2ChallengeConfig } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

interface L2ConfigStep {
  type: 'screening_questions' | 'scenario_task' | 'skills_check' | 'culture_fit';
  items: Array<{ id: string; text: string; required?: boolean }>;
}

interface L2Config {
  overview: string;
  steps: L2ConfigStep[];
  scoring_rubric: Array<{ criterion: string; weight: number; description: string }>;
  estimated_time_minutes: number;
  language: string;
}

interface JobContentBlocks {
  hero?: { title?: string; company?: string; location?: string; employmentType?: string; seniority?: string; department?: string };
  blocks?: Array<{ type: string; title: string; body?: string[]; bullets?: string[] }>;
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish' };

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `\n\nCRITICAL LANGUAGE INSTRUCTION:\nYou MUST respond ONLY in ${targetLanguage}.\nAll text values must be in ${targetLanguage}.\nJSON keys must remain in English, but ALL values must be in ${targetLanguage}.`;
}

function generateMinimalSkeleton(jobTitle: string, locale: string): L2Config {
  const isItalian = locale === 'it';
  const isSpanish = locale === 'es';
  
  return {
    overview: isItalian 
      ? `Questa sfida valuta le tue competenze tecniche per la posizione di ${jobTitle}. Completa i seguenti task per dimostrare le tue capacità.`
      : isSpanish
      ? `Este desafío evalúa tus habilidades técnicas para el puesto de ${jobTitle}. Completa las siguientes tareas para demostrar tus capacidades.`
      : `This challenge assesses your technical skills for the ${jobTitle} position. Complete the following tasks to demonstrate your capabilities.`,
    steps: [
      {
        type: 'screening_questions',
        items: [
          { id: 'sq_1', text: isItalian ? 'Descrivi la tua esperienza rilevante per questo ruolo.' : isSpanish ? 'Describe tu experiencia relevante para este puesto.' : 'Describe your relevant experience for this role.', required: true },
          { id: 'sq_2', text: isItalian ? 'Quali strumenti o tecnologie hai utilizzato in ruoli simili?' : isSpanish ? '¿Qué herramientas o tecnologías has utilizado en roles similares?' : 'What tools or technologies have you used in similar roles?', required: true },
        ],
      },
      {
        type: 'scenario_task',
        items: [
          { id: 'st_1', text: isItalian ? 'Descrivi come affronteresti un progetto complesso in questa posizione.' : isSpanish ? 'Describe cómo abordarías un proyecto complejo en esta posición.' : 'Describe how you would approach a complex project in this position.', required: true },
        ],
      },
    ],
    scoring_rubric: [
      { criterion: isItalian ? 'Rilevanza' : isSpanish ? 'Relevancia' : 'Relevance', weight: 25, description: isItalian ? 'La risposta affronta direttamente i requisiti del ruolo' : isSpanish ? 'La respuesta aborda directamente los requisitos del puesto' : 'Response directly addresses role requirements' },
      { criterion: isItalian ? 'Chiarezza' : isSpanish ? 'Claridad' : 'Clarity', weight: 25, description: isItalian ? 'Comunicazione chiara e ben strutturata' : isSpanish ? 'Comunicación clara y bien estructurada' : 'Clear and well-structured communication' },
      { criterion: isItalian ? 'Competenza tecnica' : isSpanish ? 'Competencia técnica' : 'Technical competence', weight: 25, description: isItalian ? 'Dimostra conoscenza tecnica appropriata' : isSpanish ? 'Demuestra conocimiento técnico apropiado' : 'Demonstrates appropriate technical knowledge' },
      { criterion: isItalian ? 'Problem solving' : isSpanish ? 'Resolución de problemas' : 'Problem solving', weight: 25, description: isItalian ? 'Mostra capacità di analisi e risoluzione problemi' : isSpanish ? 'Muestra habilidades analíticas y de resolución de problemas' : 'Shows analytical and problem-solving skills' },
    ],
    estimated_time_minutes: 45,
    language: locale,
  };
}

function extractJobContext(jobPost: any): Record<string, any> {
  const contentJson = jobPost.content_json as JobContentBlocks | null;
  const job: Record<string, any> = {
    title: contentJson?.hero?.title || jobPost.title,
    location: contentJson?.hero?.location || jobPost.location,
    employmentType: contentJson?.hero?.employmentType || jobPost.employment_type,
    seniority: contentJson?.hero?.seniority || jobPost.seniority,
    department: contentJson?.hero?.department || jobPost.department,
    intro: '', responsibilities: [] as string[], mustHave: [] as string[],
    niceToHave: [] as string[], offer: [] as string[],
  };

  if (contentJson?.blocks && Array.isArray(contentJson.blocks)) {
    for (const block of contentJson.blocks) {
      if (block.type === 'intro' && block.body) job.intro = block.body.join(' ');
      else if (block.title?.toLowerCase().includes('do') || block.title?.toLowerCase().includes('responsibilit')) job.responsibilities = block.bullets || [];
      else if (block.title?.toLowerCase().includes('bring') || block.title?.toLowerCase().includes('require')) job.mustHave = block.bullets || [];
      else if (block.title?.toLowerCase().includes('nice')) job.niceToHave = block.bullets || [];
      else if (block.title?.toLowerCase().includes('offer')) job.offer = block.bullets || [];
    }
  }

  if (!job.intro && jobPost.description) job.intro = jobPost.description;
  if (job.responsibilities.length === 0 && jobPost.responsibilities) job.responsibilities = jobPost.responsibilities.split('\n').filter((l: string) => l.trim());
  if (job.mustHave.length === 0 && jobPost.requirements_must) job.mustHave = jobPost.requirements_must.split('\n').filter((l: string) => l.trim());
  if (job.niceToHave.length === 0 && jobPost.requirements_nice) job.niceToHave = jobPost.requirements_nice.split('\n').filter((l: string) => l.trim());
  if (job.offer.length === 0 && jobPost.benefits) job.offer = jobPost.benefits.split('\n').filter((l: string) => l.trim());

  return job;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return unauthorizedResponse();

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedResponse('Authentication failed');

    const body = await req.json();
    const { challenge_id, job_post_id, locale = 'en' } = body;

    if (!challenge_id || !job_post_id) {
      return errorResponse(400, 'INVALID_INPUT', 'challenge_id and job_post_id are required');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: jobPost, error: jobError } = await supabaseAdmin
      .from('job_posts').select('*').eq('id', job_post_id).single();

    if (jobError || !jobPost) {
      return errorResponse(404, 'NOT_FOUND', 'Job post not found');
    }

    const { data: companyProfile } = await supabaseAdmin
      .from('company_profiles').select('*').eq('company_id', jobPost.business_id).maybeSingle();

    const { data: businessProfile } = await supabaseAdmin
      .from('business_profiles').select('*').eq('user_id', jobPost.business_id).maybeSingle();

    const jobContext = extractJobContext(jobPost);
    
    const companyContext = {
      name: businessProfile?.company_name || 'Company',
      industry: companyProfile?.operating_style || businessProfile?.snapshot_industry || businessProfile?.manual_industry,
      pillars: companyProfile?.pillar_vector || {},
      idealXimatars: companyProfile?.ideal_ximatar_profile_ids || [],
      cultureNotes: companyProfile?.summary || companyProfile?.communication_style,
    };

    const contextPackage = {
      job: jobContext, company: companyContext,
      constraints: { keepMeaning: true, noHallucinations: true },
      generatedAt: new Date().toISOString(), locale,
    };

    const langInstruction = getLanguageInstruction(locale);

    const systemPrompt = `You are an expert HR professional creating Level 2 (role-based) hiring challenges.
Your task is to generate a structured assessment challenge based on a job post.
The challenge should test hard skills relevant to the role through realistic scenarios.

RULES:
- Use ONLY the information provided in the job context
- Do NOT invent requirements, skills, or responsibilities not mentioned
- Map job requirements to screening questions
- Map responsibilities to scenario tasks
- Create a scoring rubric based on actual job requirements
- Keep questions practical and relevant${langInstruction}`;

    const userPrompt = `Generate a Level 2 challenge configuration based on this job context:

JOB CONTEXT:
${JSON.stringify(jobContext, null, 2)}

COMPANY CONTEXT:
${JSON.stringify(companyContext, null, 2)}

Generate a structured L2 challenge with:
1. overview: 2-3 sentence summary of what the challenge assesses (80-120 words)
2. steps: Array of assessment steps
3. scoring_rubric: 4-6 evaluation criteria with weights (must sum to 100)
4. estimated_time_minutes: Realistic completion time (30-60 minutes)
5. language: "${locale}"

Return ONLY valid JSON.`;

    let config: L2Config;
    let generationStatus = 'ready';
    let generationError: string | null = null;

    try {
      const aiResp = await callAiGateway({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        correlationId,
        functionName: 'generate-l2-challenge-from-job-post',
      });

      const jsonStr = extractJsonFromAiContent(aiResp.content);
      const parsed = JSON.parse(jsonStr);
      const validated = validateL2ChallengeConfig(parsed);

      if (!validated) {
        config = generateMinimalSkeleton(jobContext.title, locale);
        generationStatus = 'needs_review';
        generationError = 'AI response schema validation failed';
      } else {
        config = { ...validated, language: locale };
      }
    } catch (e) {
      if (e instanceof AiGatewayError && (e.statusCode === 429 || e.statusCode === 402)) {
        generationError = e.message;
      } else {
        generationError = e instanceof Error ? e.message : 'Unknown AI error';
      }
      config = generateMinimalSkeleton(jobContext.title, locale);
      generationStatus = 'needs_review';
    }

    // If fallback was used, mark it
    const usedFallback = generationStatus === 'needs_review';

    const { error: updateError } = await supabaseAdmin
      .from('business_challenges')
      .update({
        config_json: config,
        context_snapshot: contextPackage,
        generation_status: generationStatus,
        generation_error: generationError,
        time_estimate_minutes: config.estimated_time_minutes,
      })
      .eq('id', challenge_id);

    if (updateError) {
      return errorResponse(500, 'DB_ERROR', 'Failed to save challenge configuration');
    }

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'generate-l2-challenge-from-job-post',
      status: generationStatus, used_fallback: usedFallback,
    }));

    return jsonResponse({ 
      success: true, status: generationStatus, config,
      error: generationError, used_fallback: usedFallback,
    });

  } catch (err) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'generate-l2-challenge-from-job-post',
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error');
  }
});
