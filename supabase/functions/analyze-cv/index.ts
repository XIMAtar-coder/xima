import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway, extractJsonFromAiContent, generateCorrelationId, AiGatewayError } from "../_shared/aiClient.ts";
import { validateCvAnalysis } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse, unauthorizedResponse } from "../_shared/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    // Extract JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorizedResponse('Missing Authorization header');
    }

    const jwt = authHeader.replace("Bearer ", "").trim();

    // Create client with user's auth context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Retrieve authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return unauthorizedResponse('Authentication required. Please log in and try again.');
    }

    // ===== GDPR Art. 21/22: Check profiling opt-out =====
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('profiling_opt_out')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error(JSON.stringify({
        type: 'db_error', correlation_id: correlationId,
        function_name: 'analyze-cv', error: 'Profile fetch failed',
      }));
    }

    if (profile?.profiling_opt_out === true) {
      console.log(JSON.stringify({
        type: 'gdpr_block', correlation_id: correlationId,
        function_name: 'analyze-cv', reason: 'profiling_opt_out',
      }));
      return profilingOptOutResponse();
    }

    // Parse form-data file
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'INVALID_INPUT', 'File missing or invalid');
    }

    // === SECURITY: File size validation (10MB limit) ===
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(400, 'FILE_TOO_LARGE', 'File too large. Maximum 10MB allowed.');
    }

    // === SECURITY: File type validation (whitelist) ===
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(400, 'INVALID_FILE_TYPE', 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.');
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // === SECURITY: Validate PDF content (magic bytes check) ===
    if (file.type === 'application/pdf') {
      const isPDF = fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && 
                    fileBytes[2] === 0x44 && fileBytes[3] === 0x46;
      if (!isPDF) {
        return errorResponse(400, 'INVALID_FILE_CONTENT', 'File claims to be PDF but content validation failed.');
      }
    }

    // === SECURITY: Sanitize filename to prevent path traversal ===
    const sanitizeFilename = (name: string): string => {
      return name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.\./g, '_')
        .substring(0, 255);
    };
    const safeFilename = sanitizeFilename(file.name);
    const filename = `${Date.now()}_${safeFilename}`;
    const storagePath = `${user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("cv-uploads")
      .upload(storagePath, fileBytes, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return errorResponse(400, 'UPLOAD_FAILED', `Upload failed: ${uploadError.message}`);
    }

    // Convert file to text for AI analysis
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(fileBytes);
    const truncatedText = text.substring(0, 10000);

    console.log(JSON.stringify({
      type: 'request', correlation_id: correlationId,
      function_name: 'analyze-cv',
      text_length: truncatedText.length,
    }));

    // Call Lovable AI for CV analysis via shared client
    let aiContent: string;
    try {
      const aiResp = await callAiGateway({
        messages: [
          {
            role: "system",
            content: `You are a CV analyzer for the XIMA assessment system. Analyze CVs and score candidates on 5 pillars (0-100 scale):

1. computational_power: Technical skills, problem-solving, analytical abilities
2. communication: Language skills, presentation, written communication  
3. knowledge: Education, certifications, domain expertise
4. creativity: Innovative projects, creative solutions, unique approaches
5. drive: Achievements, career progression, initiative, proactivity

Also provide:
- summary: Brief 2-3 sentence professional summary
- strengths: Array of 3-5 key strengths
- soft_skills: Array of 3-5 soft skills identified
- comments: Object with brief 1-2 sentence explanations for each pillar score

Return ONLY valid JSON with this structure:
{
  "computational_power": <number 0-100>,
  "communication": <number 0-100>,
  "knowledge": <number 0-100>,
  "creativity": <number 0-100>,
  "drive": <number 0-100>,
  "summary": "<string>",
  "strengths": ["<string>", "<string>", "<string>"],
  "soft_skills": ["<string>", "<string>", "<string>"],
  "comments": {
    "computational_power": "<explanation>",
    "communication": "<explanation>",
    "knowledge": "<explanation>",
    "creativity": "<explanation>",
    "drive": "<explanation>"
  }
}`
          },
          { 
            role: "user", 
            content: `Analyze this CV and provide scores with explanations:\n\n${truncatedText}` 
          }
        ],
        response_format: { type: "json_object" },
        correlationId,
        functionName: 'analyze-cv',
      });
      aiContent = aiResp.content;
    } catch (e) {
      if (e instanceof AiGatewayError) return e.toResponse();
      throw e;
    }

    // ===== RELIABILITY: Strict schema validation (no silent defaults) =====
    let analysisResult;
    try {
      const parsed = JSON.parse(aiContent);
      analysisResult = validateCvAnalysis(parsed);
    } catch (parseErr) {
      console.error(JSON.stringify({
        type: 'parse_error', correlation_id: correlationId,
        function_name: 'analyze-cv',
      }));
    }

    if (!analysisResult) {
      return errorResponse(502, 'CV_AI_PARSE_FAILED', 
        'AI analysis did not return valid results. Previous scores are preserved. Please try again.');
    }

    const cv_scores = {
      computational_power: analysisResult.computational_power,
      communication: analysisResult.communication,
      knowledge: analysisResult.knowledge,
      creativity: analysisResult.creativity,
      drive: analysisResult.drive,
    };

    const cv_comments = analysisResult.comments;

    // Update profile row (RLS safe)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cv_scores, cv_comments })
      .eq("user_id", user.id);

    if (updateError) {
      return errorResponse(400, 'DB_ERROR', `Failed to save analysis: ${updateError.message}`);
    }

    // Save detailed analysis (minimize stored CV text to first 2000 chars)
    await supabase
      .from("assessment_cv_analysis")
      .insert({
        user_id: user.id,
        cv_text: truncatedText.substring(0, 2000),
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        soft_skills: analysisResult.soft_skills,
        pillar_vector: cv_scores,
        ximatar_suggestions: []
      });

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'analyze-cv',
    }));

    return jsonResponse({ 
      success: true, 
      cv_scores,
      cv_comments,
      summary: analysisResult.summary,
      strengths: analysisResult.strengths,
      soft_skills: analysisResult.soft_skills
    });
  } catch (err) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'analyze-cv',
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'An unexpected error occurred');
  }
});
