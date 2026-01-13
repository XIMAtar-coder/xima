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

function extractTextFromPdf(pdfBytes: Uint8Array): string {
  // Simple text extraction from PDF
  // This looks for text streams in the PDF and extracts readable content
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(pdfBytes);
  
  // Extract text between stream markers (basic PDF text extraction)
  const textParts: string[] = [];
  
  // Look for text objects in PDF
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  
  while ((match = streamRegex.exec(content)) !== null) {
    const streamContent = match[1];
    // Extract text from Tj and TJ operators
    const textMatches = streamContent.match(/\(([^)]+)\)\s*Tj|\[([^\]]+)\]\s*TJ/g);
    if (textMatches) {
      textMatches.forEach(tm => {
        // Clean up the text
        const cleaned = tm
          .replace(/\(([^)]+)\)\s*Tj/g, '$1')
          .replace(/\[([^\]]+)\]\s*TJ/g, '$1')
          .replace(/\([^)]*\)/g, (m) => m.slice(1, -1))
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/<[0-9A-Fa-f]+>/g, '')
          .trim();
        if (cleaned) {
          textParts.push(cleaned);
        }
      });
    }
  }

  // If no text found via streams, try to find plain text content
  if (textParts.length === 0) {
    // Look for text that might be embedded
    const plainTextRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = plainTextRegex.exec(content)) !== null) {
      const btContent = match[1];
      const texts = btContent.match(/\(([^)]+)\)/g);
      if (texts) {
        texts.forEach(t => {
          const clean = t.slice(1, -1).trim();
          if (clean && clean.length > 2) {
            textParts.push(clean);
          }
        });
      }
    }
  }

  // Fallback: extract any readable text from the PDF
  if (textParts.length === 0) {
    // Get ASCII readable content
    const readable = content.split('').filter(c => {
      const code = c.charCodeAt(0);
      return (code >= 32 && code <= 126) || code === 10 || code === 13;
    }).join('');
    
    // Try to find structured content
    const lines = readable.split(/[\r\n]+/).filter(line => {
      return line.trim().length > 10 && 
             !line.includes('obj') && 
             !line.includes('endobj') &&
             !line.includes('/Type') &&
             !line.includes('/Length');
    });
    
    textParts.push(...lines);
  }

  return textParts.join('\n');
}

function parseJobDescription(text: string): ExtractedJobData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Try to extract title (usually first meaningful line or line after "Job Title:")
  let title = 'Imported Job Position';
  let location: string | null = null;
  let department: string | null = null;
  let employment_type: string | null = null;
  let seniority: string | null = null;
  let salary_range: string | null = null;
  let description = '';
  let responsibilities = '';
  let requirements_must = '';
  let requirements_nice = '';
  let benefits = '';
  
  let currentSection = 'description';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Detect title
    if (i === 0 && line.length > 5 && line.length < 100) {
      title = line;
    } else if (lowerLine.includes('job title') || lowerLine.includes('position:')) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.length > 3 && nextLine.length < 100) {
        title = nextLine;
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          title = line.substring(colonIdx + 1).trim() || title;
        }
      }
    }
    
    // Detect location
    if (lowerLine.includes('location:') || lowerLine.includes('place:') || lowerLine.includes('city:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        location = line.substring(colonIdx + 1).trim();
      }
    }
    
    // Detect department
    if (lowerLine.includes('department:') || lowerLine.includes('team:') || lowerLine.includes('division:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        department = line.substring(colonIdx + 1).trim();
      }
    }
    
    // Detect employment type
    if (lowerLine.includes('full-time') || lowerLine.includes('full time')) {
      employment_type = 'full-time';
    } else if (lowerLine.includes('part-time') || lowerLine.includes('part time')) {
      employment_type = 'part-time';
    } else if (lowerLine.includes('contract')) {
      employment_type = 'contract';
    } else if (lowerLine.includes('internship') || lowerLine.includes('intern')) {
      employment_type = 'internship';
    }
    
    // Detect seniority
    if (lowerLine.includes('senior') || lowerLine.includes('sr.')) {
      seniority = 'senior';
    } else if (lowerLine.includes('junior') || lowerLine.includes('jr.') || lowerLine.includes('entry')) {
      seniority = 'entry';
    } else if (lowerLine.includes('lead') || lowerLine.includes('principal')) {
      seniority = 'lead';
    } else if (lowerLine.includes('manager') || lowerLine.includes('director') || lowerLine.includes('executive')) {
      seniority = 'executive';
    }
    
    // Detect salary
    if (lowerLine.includes('salary') || lowerLine.includes('compensation') || lowerLine.includes('€') || lowerLine.includes('$')) {
      const salaryMatch = line.match(/[\$€£]?\s*[\d,]+\s*[-–]\s*[\$€£]?\s*[\d,]+/);
      if (salaryMatch) {
        salary_range = salaryMatch[0];
      }
    }
    
    // Detect sections
    if (lowerLine.includes('responsibilit') || lowerLine.includes('duties') || lowerLine.includes('mansioni') || lowerLine.includes('what you\'ll do')) {
      currentSection = 'responsibilities';
      continue;
    }
    if (lowerLine.includes('requirement') || lowerLine.includes('requisit') || lowerLine.includes('qualific') || lowerLine.includes('must have') || lowerLine.includes('what we need')) {
      currentSection = 'requirements_must';
      continue;
    }
    if (lowerLine.includes('nice to have') || lowerLine.includes('preferred') || lowerLine.includes('bonus') || lowerLine.includes('plus')) {
      currentSection = 'requirements_nice';
      continue;
    }
    if (lowerLine.includes('benefit') || lowerLine.includes('perks') || lowerLine.includes('what we offer') || lowerLine.includes('vantaggi')) {
      currentSection = 'benefits';
      continue;
    }
    if (lowerLine.includes('about') || lowerLine.includes('description') || lowerLine.includes('overview') || lowerLine.includes('chi siamo')) {
      currentSection = 'description';
      continue;
    }
    
    // Add to appropriate section
    const cleanLine = line.replace(/^[-•*\d.]\s*/, '').trim();
    if (cleanLine.length > 3) {
      switch (currentSection) {
        case 'responsibilities':
          responsibilities += (responsibilities ? '\n' : '') + '• ' + cleanLine;
          break;
        case 'requirements_must':
          requirements_must += (requirements_must ? '\n' : '') + '• ' + cleanLine;
          break;
        case 'requirements_nice':
          requirements_nice += (requirements_nice ? '\n' : '') + '• ' + cleanLine;
          break;
        case 'benefits':
          benefits += (benefits ? '\n' : '') + '• ' + cleanLine;
          break;
        default:
          description += (description ? '\n' : '') + cleanLine;
      }
    }
  }
  
  return {
    title: title.substring(0, 200),
    location,
    description: description.trim().substring(0, 5000) || text.substring(0, 2000),
    responsibilities: responsibilities.trim() || null,
    requirements_must: requirements_must.trim() || null,
    requirements_nice: requirements_nice.trim() || null,
    benefits: benefits.trim() || null,
    employment_type,
    seniority,
    department,
    salary_range
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

    const { importId } = await req.json();
    console.log(`Processing import ${importId} for user ${user.id}`);

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

    // Download the PDF from storage
    const { data: pdfData, error: downloadError } = await userClient.storage
      .from('job_posts_pdfs')
      .download(importRecord.pdf_path);

    if (downloadError || !pdfData) {
      console.error('PDF download error:', downloadError);
      await userClient
        .from('business_job_post_imports')
        .update({ status: 'error', error_message: 'Failed to download PDF' })
        .eq('id', importId);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download PDF' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const extractedText = extractTextFromPdf(pdfBytes);
    
    console.log('Extracted text length:', extractedText.length);

    // Parse the job description
    const parsedData = parseJobDescription(extractedText);
    console.log('Parsed job data:', JSON.stringify(parsedData, null, 2));

    // Create a draft job post in job_posts table (NOT opportunities)
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
        locale: 'en',
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

    // Update import record with success - link to new_job_post_id
    await userClient
      .from('business_job_post_imports')
      .update({ 
        status: 'ready',
        new_job_post_id: newJob.id,
        extracted_data: {
          ...parsedData,
          rawTextLength: extractedText.length
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
        extractedData: parsedData
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
