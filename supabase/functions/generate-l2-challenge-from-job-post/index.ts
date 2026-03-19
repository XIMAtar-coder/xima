import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES } from "../_shared/ximatarTaxonomy.ts";

// =====================================================
// Types
// =====================================================

interface L2ConfigStep {
  type: 'screening_questions' | 'scenario_task' | 'skills_check' | 'culture_fit';
  items: Array<{ id: string; text: string; required?: boolean }>;
}

interface L2Config {
  overview: string;
  steps: L2ConfigStep[];
  scoring_rubric: Array<{ criterion: string; weight: number; description: string; primary_pillar?: string }>;
  estimated_time_minutes: number;
  language: string;
}

interface JobContentBlocks {
  hero?: { title?: string; company?: string; location?: string; employmentType?: string; seniority?: string; department?: string };
  blocks?: Array<{ type: string; title: string; body?: string[]; bullets?: string[] }>;
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish' };

const VALID_PILLARS = ['drive', 'computational_power', 'communication', 'creativity', 'knowledge'];

// =====================================================
// Helpers — kept from current version
// =====================================================

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `\n\nCRITICAL LANGUAGE INSTRUCTION:\nYou MUST respond ONLY in ${targetLanguage}.\nAll text values must be in ${targetLanguage}.\nJSON keys must remain in English, but ALL values must be in ${targetLanguage}.`;
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

function generateMinimalSkeleton(jobTitle: string, locale: string): L2Config {
  const isItalian = locale === 'it';
  const isSpanish = locale === 'es';

  return {
    overview: isItalian
      ? `Questa sfida valuta le tue competenze tecniche per la posizione di ${jobTitle}.`
      : isSpanish
      ? `Este desafío evalúa tus habilidades técnicas para el puesto de ${jobTitle}.`
      : `This challenge assesses your technical skills for the ${jobTitle} position.`,
    steps: [
      {
        type: 'screening_questions',
        items: [
          { id: 'sq_1', text: isItalian ? 'Descrivi la tua esperienza rilevante per questo ruolo.' : isSpanish ? 'Describe tu experiencia relevante para este puesto.' : 'Describe your relevant experience for this role.', required: true },
          { id: 'sq_2', text: isItalian ? 'Quali strumenti o tecnologie hai utilizzato?' : isSpanish ? '¿Qué herramientas o tecnologías has utilizado?' : 'What tools or technologies have you used in similar roles?', required: true },
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
      { criterion: isItalian ? 'Rilevanza' : isSpanish ? 'Relevancia' : 'Relevance', weight: 25, description: isItalian ? 'La risposta affronta i requisiti del ruolo' : isSpanish ? 'La respuesta aborda los requisitos del puesto' : 'Response addresses role requirements', primary_pillar: 'knowledge' },
      { criterion: isItalian ? 'Chiarezza' : isSpanish ? 'Claridad' : 'Clarity', weight: 25, description: isItalian ? 'Comunicazione chiara e strutturata' : isSpanish ? 'Comunicación clara y estructurada' : 'Clear and structured communication', primary_pillar: 'communication' },
      { criterion: isItalian ? 'Competenza tecnica' : isSpanish ? 'Competencia técnica' : 'Technical competence', weight: 25, description: isItalian ? 'Dimostra conoscenza tecnica' : isSpanish ? 'Demuestra conocimiento técnico' : 'Demonstrates technical knowledge', primary_pillar: 'computational_power' },
      { criterion: 'Problem solving', weight: 25, description: isItalian ? 'Capacità di analisi e risoluzione problemi' : isSpanish ? 'Habilidades analíticas y de resolución' : 'Analytical and problem-solving skills', primary_pillar: 'creativity' },
    ],
    estimated_time_minutes: 45,
    language: locale,
  };
}

// =====================================================
// Main handler
// =====================================================

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

    if (jobError || !jobPost) return errorResponse(404, 'NOT_FOUND', 'Job post not found');

    const [companyProfileRes, businessProfileRes] = await Promise.all([
      supabaseAdmin.from('company_profiles').select('*').eq('company_id', jobPost.business_id).maybeSingle(),
      supabaseAdmin.from('business_profiles').select('*').eq('user_id', jobPost.business_id).maybeSingle(),
    ]);

    const companyProfile = companyProfileRes.data;
    const businessProfile = businessProfileRes.data;

    const jobContext = extractJobContext(jobPost);

    const companyContext = {
      name: businessProfile?.company_name || 'Company',
      industry: companyProfile?.operating_style || businessProfile?.snapshot_industry || businessProfile?.manual_industry,
      pillars: companyProfile?.pillar_vector || {},
      idealXimatars: companyProfile?.ideal_ximatar_profile_ids || [],
      cultureNotes: companyProfile?.summary || companyProfile?.communication_style,
    };

    // Build ideal XIMAtar context for pillar mapping
    let idealXimatarContext = '';
    const idealIds = (companyProfile?.ideal_ximatar_profile_ids || []) as string[];
    if (idealIds.length > 0) {
      const firstIdeal = XIMATAR_PROFILES[idealIds[0]];
      if (firstIdeal) {
        idealXimatarContext = `
XIMA PILLAR MAPPING:
Each scoring criterion you generate must indicate which XIMA pillar it primarily tests:
- "drive": Leadership, initiative, ownership, proactivity
- "computational_power": Technical depth, analytical skills, problem-solving
- "communication": Clarity, collaboration, stakeholder management
- "creativity": Innovation, novel approaches, lateral thinking
- "knowledge": Domain expertise, best practices, formal education application

The company's ideal XIMAtar for this role is: ${firstIdeal.name} (${firstIdeal.title})
Key traits: ${firstIdeal.tags.join(', ')}`;
      }
    }

    const contextPackage = {
      job: jobContext, company: companyContext,
      constraints: { keepMeaning: true, noHallucinations: true },
      generatedAt: new Date().toISOString(), locale,
    };

    const langInstruction = getLanguageInstruction(locale);

    const systemPrompt = `You are an expert HR professional creating Level 2 (role-based) hiring challenges for the XIMA psychometric talent platform.
Your task is to generate a structured assessment challenge based on a job post.
The challenge should test hard skills relevant to the role through realistic scenarios.

RULES:
- Use ONLY the information provided in the job context
- Do NOT invent requirements, skills, or responsibilities not mentioned
- Map job requirements to screening questions
- Map responsibilities to scenario tasks
- Create a scoring rubric based on actual job requirements
- Each rubric criterion MUST include a "primary_pillar" field from: drive, computational_power, communication, creativity, knowledge
${idealXimatarContext}${langInstruction}

Return ONLY valid JSON:
{
  "overview": "2-3 sentence summary (80-120 words)",
  "steps": [{"type": "screening_questions|scenario_task|skills_check|culture_fit", "items": [{"id": "sq_1", "text": "string", "required": true}]}],
  "scoring_rubric": [{"criterion": "string", "weight": 25, "description": "string", "primary_pillar": "drive|computational_power|communication|creativity|knowledge"}],
  "estimated_time_minutes": 45,
  "language": "${locale}"
}`;

    const userPrompt = `Generate a Level 2 challenge configuration:

JOB CONTEXT:
${JSON.stringify(jobContext, null, 2)}

COMPANY CONTEXT:
${JSON.stringify(companyContext, null, 2)}

Return ONLY valid JSON.`;

    let config: L2Config;
    let generationStatus = 'ready';
    let generationError: string | null = null;
    let usedFallback = false;

    try {
      const aiResp = await callAnthropicApi({
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'generate-l2-challenge-from-job-post',
        inputSummary: `l2_gen:job=${job_post_id},locale=${locale}`,
        temperature: 0.6,
        maxTokens: 4096,
      });

      const jsonStr = extractJsonFromAiContent(aiResp.content);
      const parsed = JSON.parse(jsonStr);

      // Validate
      if (!parsed?.overview || !Array.isArray(parsed?.steps) || parsed.steps.length === 0) {
        throw new Error('Schema validation failed');
      }

      // Validate and normalize rubric pillar mappings
      if (Array.isArray(parsed.scoring_rubric)) {
        for (const criterion of parsed.scoring_rubric) {
          if (!criterion.primary_pillar || !VALID_PILLARS.includes(criterion.primary_pillar)) {
            criterion.primary_pillar = 'knowledge'; // safe default
          }
        }
      }

      config = { ...parsed, language: locale };
    } catch (e) {
      if (e instanceof AnthropicError && e.statusCode === 429) {
        generationError = e.message;
      } else {
        generationError = e instanceof Error ? e.message : 'Unknown AI error';
      }
      config = generateMinimalSkeleton(jobContext.title, locale);
      generationStatus = 'needs_review';
      usedFallback = true;
    }

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

    // Audit
    emitAuditEventWithMetric({
      actorType: "business",
      actorId: user.id,
      action: "challenge.l2_generated",
      entityType: "business_challenge",
      entityId: challenge_id,
      correlationId,
      metadata: { job_post_id, locale, used_fallback: usedFallback },
    }, "l2_challenges_generated");

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
