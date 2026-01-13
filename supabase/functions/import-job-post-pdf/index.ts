import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedJobData {
  title: string;
  location: string | null;
  description: string;
  responsibilities: string | null;
  requirements_must: string | null;
  requirements_nice: string | null;
  benefits: string | null;
  employment_type: string | null;
  seniority: string | null;
  department: string | null;
  salary_range: string | null;
}

interface SectionMap {
  companyOverview: string;
  positionSummary: string;
  responsibilities: string;
  requirementsMust: string;
  requirementsNice: string;
  competencies: string;
  benefits: string;
}

function extractSections(text: string): SectionMap {
  const sections: SectionMap = {
    companyOverview: '',
    positionSummary: '',
    responsibilities: '',
    requirementsMust: '',
    requirementsNice: '',
    competencies: '',
    benefits: '',
  };

  // Normalize text
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');
  
  // Section heading patterns (case-insensitive)
  const sectionPatterns: { pattern: RegExp; key: keyof SectionMap }[] = [
    { pattern: /^(company\s*overview|about\s*(us|the\s*company)?|chi\s*siamo)/i, key: 'companyOverview' },
    { pattern: /^(position\s*summary|job\s*summary|role\s*overview|overview|sommario)/i, key: 'positionSummary' },
    { pattern: /^(key\s*responsibilities|responsibilities|duties|what\s*you.ll\s*do|mansioni|compiti)/i, key: 'responsibilities' },
    { pattern: /^(required\s*qualifications|requirements|must\s*have|requisiti\s*richiesti|qualifiche)/i, key: 'requirementsMust' },
    { pattern: /^(preferred\s*qualifications|nice\s*to\s*have|preferred|bonus|plus|requisiti\s*preferenziali)/i, key: 'requirementsNice' },
    { pattern: /^(professional\s*competencies|competencies|skills|competenze)/i, key: 'competencies' },
    { pattern: /^(what\s*we\s*offer|benefits|perks|offriamo|vantaggi)/i, key: 'benefits' },
  ];

  let currentSection: keyof SectionMap | null = null;
  let currentContent: string[] = [];

  const saveCurrentSection = () => {
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    currentContent = [];
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line is a section heading
    let matchedSection: keyof SectionMap | null = null;
    for (const { pattern, key } of sectionPatterns) {
      if (pattern.test(trimmedLine)) {
        matchedSection = key;
        break;
      }
    }

    if (matchedSection) {
      saveCurrentSection();
      currentSection = matchedSection;
    } else if (currentSection) {
      // Add line to current section
      if (trimmedLine) {
        currentContent.push(trimmedLine);
      }
    } else if (trimmedLine) {
      // No section yet, add to company overview as default
      sections.companyOverview += (sections.companyOverview ? '\n' : '') + trimmedLine;
    }
  }

  // Save last section
  saveCurrentSection();

  return sections;
}

function extractMetadata(text: string): Partial<ExtractedJobData> {
  const metadata: Partial<ExtractedJobData> = {};
  const lines = text.split('\n').slice(0, 30); // Check first 30 lines for metadata

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();

    // Extract title (first substantial line)
    if (!metadata.title) {
      const trimmed = line.trim();
      if (trimmed.length >= 5 && trimmed.length <= 100 && !lowerLine.includes(':')) {
        // Likely a title - check it's not a company name or generic header
        if (!lowerLine.includes('company') && !lowerLine.includes('overview')) {
          metadata.title = trimmed;
        }
      }
    }

    // Location
    if (lowerLine.includes('location:') || lowerLine.includes('sede:') || lowerLine.includes('place:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        metadata.location = line.substring(colonIdx + 1).trim();
      }
    }

    // Department
    if (lowerLine.includes('department:') || lowerLine.includes('team:') || lowerLine.includes('division:') || lowerLine.includes('area:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        metadata.department = line.substring(colonIdx + 1).trim();
      }
    }

    // Contract/Employment type
    if (lowerLine.includes('contract type:') || lowerLine.includes('employment type:') || lowerLine.includes('tipo contratto:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const value = line.substring(colonIdx + 1).trim().toLowerCase();
        if (value.includes('full')) metadata.employment_type = 'full-time';
        else if (value.includes('part')) metadata.employment_type = 'part-time';
        else if (value.includes('contract') || value.includes('tempo determinato')) metadata.employment_type = 'contract';
        else if (value.includes('intern') || value.includes('stage')) metadata.employment_type = 'internship';
        else metadata.employment_type = line.substring(colonIdx + 1).trim();
      }
    }

    // Detect employment type from text
    if (!metadata.employment_type) {
      if (lowerLine.includes('full-time') || lowerLine.includes('full time') || lowerLine.includes('tempo pieno')) {
        metadata.employment_type = 'full-time';
      } else if (lowerLine.includes('part-time') || lowerLine.includes('part time') || lowerLine.includes('tempo parziale')) {
        metadata.employment_type = 'part-time';
      }
    }

    // Seniority
    if (lowerLine.includes('seniority:') || lowerLine.includes('level:') || lowerLine.includes('experience level:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        metadata.seniority = line.substring(colonIdx + 1).trim().toLowerCase();
      }
    }

    // Detect seniority from text
    if (!metadata.seniority) {
      if (lowerLine.includes('senior') || lowerLine.includes('sr.')) {
        metadata.seniority = 'senior';
      } else if (lowerLine.includes('junior') || lowerLine.includes('jr.') || lowerLine.includes('entry')) {
        metadata.seniority = 'entry';
      } else if (lowerLine.includes('lead') || lowerLine.includes('principal')) {
        metadata.seniority = 'lead';
      } else if (lowerLine.includes('manager') || lowerLine.includes('director')) {
        metadata.seniority = 'executive';
      }
    }

    // Salary
    if (lowerLine.includes('salary') || lowerLine.includes('compensation') || lowerLine.includes('ral')) {
      const salaryMatch = line.match(/[\$€£]?\s*[\d,]+\s*[-–]\s*[\$€£]?\s*[\d,]+/);
      if (salaryMatch) {
        metadata.salary_range = salaryMatch[0];
      }
    }

    // Reporting line (extract but don't map to job_posts field - just for context)
    // Could be used for description enrichment
  }

  return metadata;
}

function formatBulletPoints(text: string): string {
  if (!text) return '';
  
  const lines = text.split('\n');
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    
    // Already a bullet point
    if (/^[-•*]\s/.test(trimmed)) return trimmed;
    
    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      return '• ' + trimmed.replace(/^\d+[.)]\s*/, '');
    }
    
    // Add bullet if substantial content
    if (trimmed.length > 10) {
      return '• ' + trimmed;
    }
    
    return trimmed;
  }).filter(Boolean);
  
  return formatted.join('\n');
}

function parseJobDescription(text: string): ExtractedJobData {
  // Extract sections
  const sections = extractSections(text);
  
  // Extract metadata (title, location, etc.)
  const metadata = extractMetadata(text);

  // Build description from company overview and position summary
  let description = '';
  if (sections.companyOverview) {
    description += sections.companyOverview;
  }
  if (sections.positionSummary) {
    description += (description ? '\n\n' : '') + sections.positionSummary;
  }

  // Format responsibilities with bullets
  const responsibilities = formatBulletPoints(sections.responsibilities);

  // Format requirements with bullets
  let requirementsMust = formatBulletPoints(sections.requirementsMust);
  if (sections.competencies && !requirementsMust) {
    requirementsMust = formatBulletPoints(sections.competencies);
  } else if (sections.competencies) {
    requirementsMust += '\n\n' + formatBulletPoints(sections.competencies);
  }

  const requirementsNice = formatBulletPoints(sections.requirementsNice);
  const benefits = formatBulletPoints(sections.benefits);

  // Fallback title if none found
  const title = metadata.title || 'Imported Job Position';

  // If no structured content, use first portion of text as description
  if (!description && text.length > 0) {
    description = text.substring(0, Math.min(2000, text.length));
  }

  return {
    title: title.substring(0, 200),
    location: metadata.location || null,
    description: description.trim().substring(0, 5000),
    responsibilities: responsibilities || null,
    requirements_must: requirementsMust || null,
    requirements_nice: requirementsNice || null,
    benefits: benefits || null,
    employment_type: metadata.employment_type || null,
    seniority: metadata.seniority || null,
    department: metadata.department || null,
    salary_range: metadata.salary_range || null,
  };
}

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
    console.log(`Extracted text length: ${extracted_text?.length || 0}`);

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

    // Parse the job description from extracted text
    console.log('Parsing job description from extracted text...');
    const parsedData = parseJobDescription(extracted_text);
    console.log('Parsed job data:', JSON.stringify({
      title: parsedData.title,
      descriptionLength: parsedData.description?.length,
      hasResponsibilities: !!parsedData.responsibilities,
      hasRequirements: !!parsedData.requirements_must,
    }));

    // Create a draft job post in job_posts table
    const { data: newJob, error: createError } = await serviceClient
      .from('job_posts')
      .insert({
        business_id: user.id,
        title: parsedData.title,
        description: parsedData.description,
        responsibilities: parsedData.responsibilities,
        requirements_must: parsedData.requirements_must,
        requirements_nice: parsedData.requirements_nice,
        benefits: parsedData.benefits,
        location: parsedData.location,
        employment_type: parsedData.employment_type,
        seniority: parsedData.seniority,
        department: parsedData.department,
        salary_range: parsedData.salary_range,
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

    // Extract section headings for debug info
    const headingPatterns = [
      /company\s*overview/i,
      /position\s*summary/i,
      /responsibilities/i,
      /requirements/i,
      /qualifications/i,
      /what\s*we\s*offer/i,
      /benefits/i,
    ];
    const detectedHeadings: string[] = [];
    for (const pattern of headingPatterns) {
      if (pattern.test(extracted_text)) {
        const match = extracted_text.match(pattern);
        if (match) detectedHeadings.push(match[0]);
      }
    }

    // Update import record with success
    await userClient
      .from('business_job_post_imports')
      .update({ 
        status: 'ready',
        new_job_post_id: newJob.id,
        extracted_data: {
          extracted_text_length: extracted_text.length,
          preview: extracted_text.substring(0, 1000),
          detected_headings: detectedHeadings,
          parsed_title: parsedData.title,
          parsed_sections: {
            has_description: !!parsedData.description,
            has_responsibilities: !!parsedData.responsibilities,
            has_requirements_must: !!parsedData.requirements_must,
            has_requirements_nice: !!parsedData.requirements_nice,
            has_benefits: !!parsedData.benefits,
          }
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
