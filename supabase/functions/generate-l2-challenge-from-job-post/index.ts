import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface L2ConfigStep {
  type: 'screening_questions' | 'scenario_task' | 'skills_check' | 'culture_fit';
  items: Array<{
    id: string;
    text: string;
    required?: boolean;
  }>;
}

interface L2Config {
  overview: string;
  steps: L2ConfigStep[];
  scoring_rubric: Array<{
    criterion: string;
    weight: number;
    description: string;
  }>;
  estimated_time_minutes: number;
  language: string;
}

interface JobContentBlocks {
  hero?: {
    title?: string;
    company?: string;
    location?: string;
    employmentType?: string;
    seniority?: string;
    department?: string;
  };
  blocks?: Array<{
    type: string;
    title: string;
    body?: string[];
    bullets?: string[];
  }>;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  es: 'Spanish',
};

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `

CRITICAL LANGUAGE INSTRUCTION:
You MUST respond ONLY in ${targetLanguage}.
All text values must be in ${targetLanguage}.
JSON keys must remain in English, but ALL values must be in ${targetLanguage}.`;
}

/**
 * Generates minimal skeleton config when AI fails
 */
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
          {
            id: 'sq_1',
            text: isItalian ? 'Descrivi la tua esperienza rilevante per questo ruolo.' 
                  : isSpanish ? 'Describe tu experiencia relevante para este puesto.'
                  : 'Describe your relevant experience for this role.',
            required: true,
          },
          {
            id: 'sq_2',
            text: isItalian ? 'Quali strumenti o tecnologie hai utilizzato in ruoli simili?'
                  : isSpanish ? '¿Qué herramientas o tecnologías has utilizado en roles similares?'
                  : 'What tools or technologies have you used in similar roles?',
            required: true,
          },
        ],
      },
      {
        type: 'scenario_task',
        items: [
          {
            id: 'st_1',
            text: isItalian 
              ? 'Descrivi come affronteresti un progetto complesso in questa posizione. Includi il tuo approccio, i passaggi chiave e come gestiresti eventuali sfide.'
              : isSpanish
              ? 'Describe cómo abordarías un proyecto complejo en esta posición. Incluye tu enfoque, los pasos clave y cómo manejarías los desafíos.'
              : 'Describe how you would approach a complex project in this position. Include your approach, key steps, and how you would handle challenges.',
            required: true,
          },
        ],
      },
    ],
    scoring_rubric: [
      {
        criterion: isItalian ? 'Rilevanza' : isSpanish ? 'Relevancia' : 'Relevance',
        weight: 25,
        description: isItalian 
          ? 'La risposta affronta direttamente i requisiti del ruolo'
          : isSpanish 
          ? 'La respuesta aborda directamente los requisitos del puesto'
          : 'Response directly addresses role requirements',
      },
      {
        criterion: isItalian ? 'Chiarezza' : isSpanish ? 'Claridad' : 'Clarity',
        weight: 25,
        description: isItalian 
          ? 'Comunicazione chiara e ben strutturata'
          : isSpanish 
          ? 'Comunicación clara y bien estructurada'
          : 'Clear and well-structured communication',
      },
      {
        criterion: isItalian ? 'Competenza tecnica' : isSpanish ? 'Competencia técnica' : 'Technical competence',
        weight: 25,
        description: isItalian 
          ? 'Dimostra conoscenza tecnica appropriata'
          : isSpanish 
          ? 'Demuestra conocimiento técnico apropiado'
          : 'Demonstrates appropriate technical knowledge',
      },
      {
        criterion: isItalian ? 'Problem solving' : isSpanish ? 'Resolución de problemas' : 'Problem solving',
        weight: 25,
        description: isItalian 
          ? 'Mostra capacità di analisi e risoluzione problemi'
          : isSpanish 
          ? 'Muestra habilidades analíticas y de resolución de problemas'
          : 'Shows analytical and problem-solving skills',
      },
    ],
    estimated_time_minutes: 45,
    language: locale,
  };
}

/**
 * Extract structured job data from job_posts row
 */
function extractJobContext(jobPost: any): Record<string, any> {
  // Try structured content_json first
  const contentJson = jobPost.content_json as JobContentBlocks | null;
  
  const job: Record<string, any> = {
    title: contentJson?.hero?.title || jobPost.title,
    location: contentJson?.hero?.location || jobPost.location,
    employmentType: contentJson?.hero?.employmentType || jobPost.employment_type,
    seniority: contentJson?.hero?.seniority || jobPost.seniority,
    department: contentJson?.hero?.department || jobPost.department,
    intro: '',
    responsibilities: [] as string[],
    mustHave: [] as string[],
    niceToHave: [] as string[],
    offer: [] as string[],
  };

  // Extract from structured blocks if available
  if (contentJson?.blocks && Array.isArray(contentJson.blocks)) {
    for (const block of contentJson.blocks) {
      if (block.type === 'intro' && block.body) {
        job.intro = block.body.join(' ');
      } else if (block.title?.toLowerCase().includes('do') || block.title?.toLowerCase().includes('responsibilit')) {
        job.responsibilities = block.bullets || [];
      } else if (block.title?.toLowerCase().includes('bring') || block.title?.toLowerCase().includes('require')) {
        job.mustHave = block.bullets || [];
      } else if (block.title?.toLowerCase().includes('nice')) {
        job.niceToHave = block.bullets || [];
      } else if (block.title?.toLowerCase().includes('offer')) {
        job.offer = block.bullets || [];
      }
    }
  }

  // Fallback to legacy fields
  if (!job.intro && jobPost.description) {
    job.intro = jobPost.description;
  }
  if (job.responsibilities.length === 0 && jobPost.responsibilities) {
    job.responsibilities = jobPost.responsibilities.split('\n').filter((l: string) => l.trim());
  }
  if (job.mustHave.length === 0 && jobPost.requirements_must) {
    job.mustHave = jobPost.requirements_must.split('\n').filter((l: string) => l.trim());
  }
  if (job.niceToHave.length === 0 && jobPost.requirements_nice) {
    job.niceToHave = jobPost.requirements_nice.split('\n').filter((l: string) => l.trim());
  }
  if (job.offer.length === 0 && jobPost.benefits) {
    job.offer = jobPost.benefits.split('\n').filter((l: string) => l.trim());
  }

  return job;
}

serve(async (req) => {
  console.log('[generate-l2-challenge] Function invoked - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[generate-l2-challenge] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[generate-l2-challenge] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-l2-challenge] Authenticated user:', user.id);

    // Parse request
    const body = await req.json();
    const { challenge_id, job_post_id, locale = 'en' } = body;

    if (!challenge_id || !job_post_id) {
      return new Response(
        JSON.stringify({ error: 'challenge_id and job_post_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-l2-challenge] Processing:', { challenge_id, job_post_id, locale });

    // Use service role for data fetching to bypass RLS for reading context
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job post
    const { data: jobPost, error: jobError } = await supabaseAdmin
      .from('job_posts')
      .select('*')
      .eq('id', job_post_id)
      .single();

    if (jobError || !jobPost) {
      console.error('[generate-l2-challenge] Job post not found:', jobError?.message);
      return new Response(
        JSON.stringify({ error: 'Job post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-l2-challenge] Job post loaded:', jobPost.title);

    // Fetch company profile (if exists)
    const { data: companyProfile } = await supabaseAdmin
      .from('company_profiles')
      .select('*')
      .eq('company_id', jobPost.business_id)
      .maybeSingle();

    // Fetch business profile for fallback
    const { data: businessProfile } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', jobPost.business_id)
      .maybeSingle();

    // Build context package
    const jobContext = extractJobContext(jobPost);
    
    const companyContext = {
      name: businessProfile?.company_name || 'Company',
      industry: companyProfile?.operating_style || businessProfile?.snapshot_industry || businessProfile?.manual_industry,
      pillars: companyProfile?.pillar_vector || {},
      idealXimatars: companyProfile?.ideal_ximatar_profile_ids || [],
      cultureNotes: companyProfile?.summary || companyProfile?.communication_style,
    };

    const contextPackage = {
      job: jobContext,
      company: companyContext,
      constraints: { keepMeaning: true, noHallucinations: true },
      generatedAt: new Date().toISOString(),
      locale,
    };

    console.log('[generate-l2-challenge] Context package built:', {
      jobTitle: jobContext.title,
      companyName: companyContext.name,
      hasResponsibilities: jobContext.responsibilities.length,
      hasMustHave: jobContext.mustHave.length,
    });

    // Call AI to generate L2 config
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[generate-l2-challenge] LOVABLE_API_KEY not configured');
      // Fall back to skeleton
      const skeleton = generateMinimalSkeleton(jobContext.title, locale);
      await supabaseAdmin
        .from('business_challenges')
        .update({
          config_json: skeleton,
          context_snapshot: contextPackage,
          generation_status: 'needs_review',
          generation_error: 'AI service not configured',
        })
        .eq('id', challenge_id);

      return new Response(
        JSON.stringify({ success: true, status: 'needs_review', config: skeleton }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
2. steps: Array of assessment steps:
   - screening_questions (3-6 items): Initial qualification questions based on requirements
   - scenario_task (1 item): A realistic work scenario based on responsibilities
   - skills_check (5-10 items): Technical knowledge verification
   - culture_fit (3-6 items): Behavioral/culture alignment questions
3. scoring_rubric: 4-6 evaluation criteria with weights (must sum to 100)
4. estimated_time_minutes: Realistic completion time (30-60 minutes)
5. language: "${locale}"

Return ONLY valid JSON with this structure:
{
  "overview": "string",
  "steps": [
    { "type": "screening_questions", "items": [{ "id": "sq_1", "text": "string", "required": true }] },
    { "type": "scenario_task", "items": [{ "id": "st_1", "text": "string", "required": true }] },
    { "type": "skills_check", "items": [{ "id": "sc_1", "text": "string", "required": false }] },
    { "type": "culture_fit", "items": [{ "id": "cf_1", "text": "string", "required": false }] }
  ],
  "scoring_rubric": [
    { "criterion": "string", "weight": 25, "description": "string" }
  ],
  "estimated_time_minutes": 45,
  "language": "${locale}"
}`;

    console.log('[generate-l2-challenge] Calling Lovable AI...');

    let config: L2Config;
    let generationStatus = 'ready';
    let generationError: string | null = null;

    try {
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
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generate-l2-challenge] AI gateway error:', response.status, errorText);
        
        if (response.status === 429) {
          generationError = 'Rate limit exceeded. Please try again.';
        } else if (response.status === 402) {
          generationError = 'AI credits exhausted.';
        } else {
          generationError = `AI gateway error: ${response.status}`;
        }
        
        config = generateMinimalSkeleton(jobContext.title, locale);
        generationStatus = 'needs_review';
      } else {
        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;

        console.log('[generate-l2-challenge] AI response received:', content?.substring(0, 200));

        if (!content) {
          throw new Error('Empty AI response');
        }

        // Parse JSON from response
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);

        // Validate and normalize
        config = {
          overview: parsed.overview || generateMinimalSkeleton(jobContext.title, locale).overview,
          steps: Array.isArray(parsed.steps) ? parsed.steps : [],
          scoring_rubric: Array.isArray(parsed.scoring_rubric) ? parsed.scoring_rubric : [],
          estimated_time_minutes: typeof parsed.estimated_time_minutes === 'number' 
            ? parsed.estimated_time_minutes 
            : 45,
          language: locale,
        };

        // Validate minimum structure
        if (config.steps.length === 0) {
          config = generateMinimalSkeleton(jobContext.title, locale);
          generationStatus = 'needs_review';
          generationError = 'AI generated empty steps';
        }
      }
    } catch (aiError) {
      console.error('[generate-l2-challenge] AI processing error:', aiError);
      config = generateMinimalSkeleton(jobContext.title, locale);
      generationStatus = 'needs_review';
      generationError = aiError instanceof Error ? aiError.message : 'Unknown AI error';
    }

    // Update challenge with generated config
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
      console.error('[generate-l2-challenge] Failed to update challenge:', updateError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save challenge configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-l2-challenge] Challenge updated successfully:', {
      challenge_id,
      status: generationStatus,
      stepsCount: config.steps.length,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: generationStatus, 
        config,
        error: generationError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[generate-l2-challenge] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
