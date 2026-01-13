import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeJobPostText } from "./normalizeJobPostText.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client for bypassing RLS when needed
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { importId, extracted_text, locale } = body;
    
    console.log(`Processing import ${importId} for user ${user.id}`);
    console.log(`Raw extracted text length: ${extracted_text?.length || 0}`);

    // Fetch the import record
    const { data: importRecord, error: importError } = await userClient
      .from('business_job_post_imports')
      .select('*')
      .eq('id', importId)
      .eq('business_id', user.id)
      .single();

    if (importError || !importRecord) {
      console.error('Import record not found:', importError);
      return new Response(
        JSON.stringify({ success: false, error: 'Import record not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await userClient
      .from('business_job_post_imports')
      .update({ status: 'processing' })
      .eq('id', importId);

    // Validate extracted text
    if (!extracted_text || extracted_text.length < 50) {
      console.error('No extracted text provided or text too short');
      await userClient
        .from('business_job_post_imports')
        .update({ 
          status: 'error', 
          error_message: 'No extractable text found in PDF' 
        })
        .eq('id', importId);
      return new Response(
        JSON.stringify({ success: false, error: 'No extractable text found in PDF. Please ensure the PDF contains text (not scanned images).' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize and structure the job post text
    console.log('Normalizing job post text...');
    const { jobPost, preview } = normalizeJobPostText(extracted_text);
    
    // CRITICAL: Log content_json to verify it's being generated
    console.log('CONTENT_BLOCKS:', JSON.stringify(jobPost.content_json, null, 2));
    console.log('content_json exists:', !!jobPost.content_json);
    console.log('content_json blocks count:', jobPost.content_json?.blocks?.length || 0);
    console.log('content_html length:', jobPost.content_html?.length || 0);
    
    console.log('Normalized job data:', JSON.stringify({
      title: jobPost.title,
      descriptionLength: jobPost.description?.length,
      hasResponsibilities: !!jobPost.responsibilities,
      responsibilitiesCount: preview.sections.responsibilities_count,
      hasRequirements: !!jobPost.requirements_must,
      requirementsCount: preview.sections.must_count,
      hasBenefits: !!jobPost.benefits,
      benefitsCount: preview.sections.benefits_count,
      blocksCount: preview.blocks_count,
      hasContentJson: !!jobPost.content_json,
      contentJsonBlocksCount: jobPost.content_json?.blocks?.length || 0,
      hasContentHtml: !!jobPost.content_html,
    }));

    // GUARD: Ensure content_json is never null before insert
    const finalContentJson = jobPost.content_json || {
      hero: {
        title: jobPost.title,
        company: null,
        location: jobPost.location,
        employmentType: jobPost.employment_type,
        seniority: jobPost.seniority,
        department: jobPost.department,
      },
      blocks: [{
        type: 'section',
        title: 'Job Description',
        body: [jobPost.description || extracted_text.substring(0, 2000)],
      }],
    };

    const finalContentHtml = jobPost.content_html || `<section class="job-section"><h2>Job Description</h2><p>${jobPost.description || 'Imported from PDF'}</p></section>`;

    // Create a draft job post in job_posts table
    const { data: newJob, error: createError } = await serviceClient
      .from('job_posts')
      .insert({
        business_id: user.id,
        title: jobPost.title,
        description: jobPost.description,
        responsibilities: jobPost.responsibilities,
        requirements_must: jobPost.requirements_must,
        requirements_nice: jobPost.requirements_nice,
        benefits: jobPost.benefits,
        location: jobPost.location,
        employment_type: jobPost.employment_type,
        seniority: jobPost.seniority,
        department: jobPost.department,
        salary_range: jobPost.salary_range,
        content_json: finalContentJson,  // GUARANTEED not null
        content_html: finalContentHtml,   // GUARANTEED not null
        source_pdf_path: importRecord.pdf_path,
        status: 'draft',
        locale: locale || 'en',
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create job post:', createError);
      await userClient
        .from('business_job_post_imports')
        .update({ 
          status: 'error', 
          error_message: 'Failed to create job post: ' + createError.message 
        })
        .eq('id', importId);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job post' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update import record with success
    await userClient
      .from('business_job_post_imports')
      .update({ 
        status: 'ready',
        new_job_post_id: newJob.id,
        extracted_data: {
          cleaned_preview: preview,
          raw_text_preview: extracted_text.substring(0, 1000),
          normalization_applied: true,
          content_blocks_generated: true,
          sections_detected: {
            has_overview: preview.sections.has_overview,
            has_summary: preview.sections.has_summary,
            responsibilities: preview.sections.responsibilities_count,
            must_have: preview.sections.must_count,
            nice_to_have: preview.sections.nice_count,
            benefits: preview.sections.benefits_count,
          },
          metadata_extracted: preview.meta,
          blocks_count: preview.blocks_count,
        }
      })
      .eq('id', importId);

    console.log('Successfully created job post:', newJob.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_post_id: newJob.id,
        import_id: importId,
        status: 'ready',
        preview: preview,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unexpected error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
