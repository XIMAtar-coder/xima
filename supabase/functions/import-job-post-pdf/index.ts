import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedJobData {
  title: string;
  company: string;
  location: string | null;
  description: string;
  skills: string[];
  requirements: string[];
  responsibilities: string[];
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
  let company = '';
  let location: string | null = null;
  const skills: string[] = [];
  const requirements: string[] = [];
  const responsibilities: string[] = [];
  let description = '';
  
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
    
    // Detect company
    if (lowerLine.includes('company:') || lowerLine.includes('employer:') || lowerLine.includes('organization:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        company = line.substring(colonIdx + 1).trim();
      }
    }
    
    // Detect location
    if (lowerLine.includes('location:') || lowerLine.includes('place:') || lowerLine.includes('city:')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        location = line.substring(colonIdx + 1).trim();
      }
    }
    
    // Detect sections
    if (lowerLine.includes('skill') || lowerLine.includes('competenc') || lowerLine.includes('tecnolog')) {
      currentSection = 'skills';
      continue;
    }
    if (lowerLine.includes('requirement') || lowerLine.includes('requisit') || lowerLine.includes('qualific')) {
      currentSection = 'requirements';
      continue;
    }
    if (lowerLine.includes('responsibilit') || lowerLine.includes('duties') || lowerLine.includes('mansioni')) {
      currentSection = 'responsibilities';
      continue;
    }
    if (lowerLine.includes('about') || lowerLine.includes('description') || lowerLine.includes('overview')) {
      currentSection = 'description';
      continue;
    }
    
    // Add to appropriate section
    if (line.match(/^[-•*]\s*/) || line.match(/^\d+\.\s*/)) {
      const cleanLine = line.replace(/^[-•*\d.]\s*/, '').trim();
      if (cleanLine.length > 3) {
        switch (currentSection) {
          case 'skills':
            skills.push(cleanLine);
            break;
          case 'requirements':
            requirements.push(cleanLine);
            break;
          case 'responsibilities':
            responsibilities.push(cleanLine);
            break;
          default:
            description += cleanLine + '\n';
        }
      }
    } else if (currentSection === 'description') {
      description += line + '\n';
    }
  }
  
  // Extract skills from text if none found
  if (skills.length === 0) {
    const skillPatterns = /\b(JavaScript|TypeScript|Python|Java|React|Angular|Vue|Node\.?js|SQL|AWS|Azure|GCP|Docker|Kubernetes|Git|Agile|Scrum|REST|GraphQL|HTML|CSS|SASS|MongoDB|PostgreSQL|Redis|Linux|CI\/CD|DevOps|Machine Learning|AI|Data Analysis|Excel|Word|PowerPoint|Communication|Leadership|Teamwork|Problem.?Solving)\b/gi;
    const foundSkills = text.match(skillPatterns);
    if (foundSkills) {
      const uniqueSkills = [...new Set(foundSkills.map(s => s.trim()))];
      skills.push(...uniqueSkills.slice(0, 10));
    }
  }
  
  return {
    title: title.substring(0, 200),
    company: company || 'To be specified',
    location,
    description: description.trim().substring(0, 5000) || text.substring(0, 2000),
    skills: skills.slice(0, 15),
    requirements: requirements.slice(0, 20),
    responsibilities: responsibilities.slice(0, 20)
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

    // Create a draft job post in opportunities table using service client
    const { data: newJob, error: createError } = await serviceClient
      .from('opportunities')
      .insert({
        title: parsedData.title,
        company: parsedData.company,
        location: parsedData.location,
        description: parsedData.description,
        skills: parsedData.skills,
        is_public: false, // Draft by default
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
        job_post_id: newJob.id,
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
        jobPostId: newJob.id,
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
