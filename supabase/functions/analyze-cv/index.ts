import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";

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

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const filename = `${Date.now()}_${file.name}`;
    const storagePath = `${user.id}/${filename}`;

    // Upload to storage bucket (cv-uploads)
    const { error: uploadError } = await supabase.storage
      .from("cv-uploads")
      .upload(storagePath, fileBytes, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
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

    // OpenAI scoring
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Analyze this CV text and return JSON with these exact fields:
{
  "computational_power": <score 0-100>,
  "communication": <score 0-100>,
  "knowledge": <score 0-100>,
  "creativity": <score 0-100>,
  "drive": <score 0-100>,
  "summary": "<brief summary>",
  "strengths": ["strength1", "strength2", "strength3"],
  "soft_skills": ["skill1", "skill2", "skill3"]
}
Base scores on: technical skills, communication ability, education/expertise, innovative thinking, and achievements/initiative.`
        },
        { role: "user", content: truncatedText }
      ]
    });

    console.log("AI analysis complete");
    const analysisResult = JSON.parse(aiResponse.choices[0].message.content || "{}");
    
    // Extract cv_scores (pillar scores)
    const cv_scores = {
      computational_power: analysisResult.computational_power || 50,
      communication: analysisResult.communication || 50,
      knowledge: analysisResult.knowledge || 50,
      creativity: analysisResult.creativity || 50,
      drive: analysisResult.drive || 50
    };

    // Update profile row (RLS safe)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cv_scores })
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
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        soft_skills: analysisResult.soft_skills,
        pillar_vector: cv_scores,
        ximatar_suggestions: []
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        cv_scores,
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
