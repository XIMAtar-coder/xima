import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      console.error("Authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication required. Please log in and try again." }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Parse form-data file
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "File missing or invalid" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received file:", file.name, file.type, file.size);

    // === SECURITY: File size validation (10MB limit) ===
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum 10MB allowed." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SECURITY: File type validation (whitelist) ===
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // === SECURITY: Validate PDF content (magic bytes check) ===
    if (file.type === 'application/pdf') {
      const isPDF = fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && 
                    fileBytes[2] === 0x44 && fileBytes[3] === 0x46; // %PDF
      if (!isPDF) {
        return new Response(
          JSON.stringify({ error: "File claims to be PDF but content validation failed." }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === SECURITY: Sanitize filename to prevent path traversal ===
    const sanitizeFilename = (name: string): string => {
      return name
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special chars
        .replace(/\.\./g, '_') // Prevent directory traversal
        .substring(0, 255); // Limit length
    };
    const safeFilename = sanitizeFilename(file.name);
    const filename = `${Date.now()}_${safeFilename}`;
    const storagePath = `${user.id}/${filename}`;

    // Upload to storage bucket (cv-uploads) - use validated file type, no fallback
    const { error: uploadError } = await supabase.storage
      .from("cv-uploads")
      .upload(storagePath, fileBytes, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("File uploaded successfully to:", storagePath);

    // Convert file to text for AI analysis
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(fileBytes);
    
    // Take first 10000 chars to avoid token limits
    const truncatedText = text.substring(0, 10000);
    console.log("Extracted text length:", truncatedText.length);

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI for CV analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to your workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    console.log("AI analysis complete");
    const aiData = await aiResponse.json();
    const analysisResult = JSON.parse(aiData.choices[0].message.content || "{}");
    
    // Extract cv_scores (pillar scores)
    const cv_scores = {
      computational_power: analysisResult.computational_power || 50,
      communication: analysisResult.communication || 50,
      knowledge: analysisResult.knowledge || 50,
      creativity: analysisResult.creativity || 50,
      drive: analysisResult.drive || 50
    };

    const cv_comments = analysisResult.comments || {};
    
    console.log("CV Scores:", cv_scores);
    console.log("CV Comments:", cv_comments);

    // Update profile row (RLS safe)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cv_scores, cv_comments })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to save analysis: ${updateError.message}` }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile updated successfully with cv_scores");

    // Also save detailed analysis to assessment_cv_analysis for historical records
    await supabase
      .from("assessment_cv_analysis")
      .insert({
        user_id: user.id,
        cv_text: truncatedText.substring(0, 5000),
        summary: analysisResult.summary || "CV analyzed successfully",
        strengths: analysisResult.strengths || [],
        soft_skills: analysisResult.soft_skills || [],
        pillar_vector: cv_scores,
        ximatar_suggestions: []
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        cv_scores,
        cv_comments,
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        soft_skills: analysisResult.soft_skills
      }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in analyze-cv function:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
