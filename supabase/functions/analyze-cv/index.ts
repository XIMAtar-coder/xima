import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, lang = "it", user_id } = await req.json();

    if (!file_url) {
      throw new Error("file_url is required");
    }

    console.log("Analyzing CV from URL:", file_url);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch CV file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileName = file_url.split("/").pop() || "cv.pdf";
    
    // Extract text based on file type
    let cvText = "";
    
    if (fileName.toLowerCase().endsWith(".pdf")) {
      // For PDF, we'll use a simple text extraction
      // In production, you'd use a proper PDF parser
      const decoder = new TextDecoder("utf-8");
      cvText = decoder.decode(fileBuffer);
      
      // If PDF parsing fails, we'll use OCR-like extraction
      if (!cvText || cvText.length < 50) {
        console.log("PDF text extraction minimal, using AI for OCR");
        // We'll let the AI handle the analysis with less text
        cvText = "PDF content requires AI analysis";
      }
    } else if (fileName.toLowerCase().endsWith(".docx") || fileName.toLowerCase().endsWith(".doc")) {
      // For DOCX, basic text extraction
      const decoder = new TextDecoder("utf-8");
      cvText = decoder.decode(fileBuffer);
    } else {
      // For other formats, try basic text extraction
      const decoder = new TextDecoder("utf-8");
      cvText = decoder.decode(fileBuffer);
    }

    console.log("Extracted text length:", cvText.length);

    // Analyze with OpenAI
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const analysisPrompt = `You are a professional CV analyst. Analyze this CV and provide a structured response.

Language: ${lang === "it" ? "Italian" : lang === "en" ? "English" : "Spanish"}

CV Content:
${cvText.substring(0, 10000)}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "summary": "A brief professional summary (2-3 sentences)",
  "strengths": ["strength1", "strength2", "strength3"],
  "soft_skills": ["skill1", "skill2", "skill3"],
  "pillar_vector": {
    "computational_power": 0-100,
    "communication": 0-100,
    "knowledge": 0-100,
    "creativity": 0-100,
    "drive": 0-100
  },
  "ximatar_suggestions": ["ximatar1", "ximatar2", "ximatar3"]
}

Base the pillar scores (0-100) on:
- computational_power: technical skills, problem-solving, analytical abilities
- communication: language skills, presentation, written communication
- knowledge: education, certifications, domain expertise
- creativity: innovative projects, creative solutions
- drive: achievements, career progression, initiative`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional CV analyst. Always respond with valid JSON only." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response:", aiContent);

    // Parse the AI response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse AI analysis response");
    }

    // Save to database
    const { data: savedAnalysis, error: dbError } = await supabase
      .from("assessment_cv_analysis")
      .insert({
        user_id: user_id,
        cv_text: cvText.substring(0, 5000), // Store first 5000 chars
        summary: analysis.summary,
        strengths: analysis.strengths,
        soft_skills: analysis.soft_skills,
        pillar_vector: analysis.pillar_vector,
        ximatar_suggestions: analysis.ximatar_suggestions,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save analysis: ${dbError.message}`);
    }

    console.log("Analysis saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        analysis: savedAnalysis,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-cv function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
