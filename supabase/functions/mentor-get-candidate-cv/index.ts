import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  candidate_profile_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { candidate_profile_id } = body;

    if (!candidate_profile_id) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "candidate_profile_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requester is a mentor
    const { data: mentorData, error: mentorError } = await supabaseAdmin
      .from("mentors")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (mentorError) {
      console.error("[mentor-get-candidate-cv] Error checking mentor status:", mentorError);
      return new Response(
        JSON.stringify({ error: "Server Error", message: "Failed to verify mentor status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mentorData) {
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Only mentors can access candidate CVs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mentorId = mentorData.id;

    // Check CV access consent
    const { data: accessData, error: accessError } = await supabaseAdmin
      .from("mentor_cv_access")
      .select("is_allowed")
      .eq("mentor_id", mentorId)
      .eq("candidate_profile_id", candidate_profile_id)
      .maybeSingle();

    if (accessError) {
      console.error("[mentor-get-candidate-cv] Error checking CV access:", accessError);
      return new Response(
        JSON.stringify({ error: "Server Error", message: "Failed to verify access consent" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!accessData || !accessData.is_allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Forbidden", 
          message: "Candidate has not granted CV access to this mentor" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional hardening: Check if there's an active coaching relationship
    const { data: relationshipData } = await supabaseAdmin
      .from("mentor_coaching_relationships")
      .select("id")
      .eq("mentor_id", mentorId)
      .eq("candidate_profile_id", candidate_profile_id)
      .eq("status", "active")
      .maybeSingle();

    // Get the candidate's profile to find their user_id
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, name, full_name")
      .eq("id", candidate_profile_id)
      .maybeSingle();

    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: "Not Found", message: "Candidate profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the CV data - try cv_uploads first
    const { data: cvUploadData, error: cvUploadError } = await supabaseAdmin
      .from("cv_uploads")
      .select("file_path, file_name, analysis_results")
      .eq("user_id", profileData.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let cvResult: { type: string; data: any } | null = null;

    if (cvUploadData?.file_path) {
      // Generate signed URL for the CV file (valid for 5 minutes)
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
        .storage
        .from("cv-uploads")
        .createSignedUrl(cvUploadData.file_path, 300); // 5 minutes

      if (signedUrlError) {
        console.error("[mentor-get-candidate-cv] Error creating signed URL:", signedUrlError);
      } else if (signedUrlData?.signedUrl) {
        cvResult = {
          type: "file",
          data: {
            signed_url: signedUrlData.signedUrl,
            file_name: cvUploadData.file_name,
            analysis_summary: cvUploadData.analysis_results,
          },
        };
      }
    }

    // If no file, try assessment_cv_analysis for text-based CV
    if (!cvResult) {
      const { data: cvAnalysisData, error: cvAnalysisError } = await supabaseAdmin
        .from("assessment_cv_analysis")
        .select("cv_text, summary, strengths, soft_skills")
        .eq("user_id", profileData.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cvAnalysisData) {
        cvResult = {
          type: "text",
          data: {
            cv_text: cvAnalysisData.cv_text,
            summary: cvAnalysisData.summary,
            strengths: cvAnalysisData.strengths,
            soft_skills: cvAnalysisData.soft_skills,
          },
        };
      }
    }

    if (!cvResult) {
      return new Response(
        JSON.stringify({ error: "Not Found", message: "No CV found for this candidate" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the access in audit log
    const userAgent = req.headers.get("user-agent") || "unknown";
    const { error: auditError } = await supabaseAdmin
      .from("mentor_access_audit_logs")
      .insert({
        mentor_id: mentorId,
        candidate_profile_id: candidate_profile_id,
        action: "CV_VIEWED",
        actor_user_id: user.id,
        actor_role: "mentor",
        metadata: {
          source: "mentor-get-candidate-cv",
          user_agent: userAgent,
          has_active_relationship: !!relationshipData,
          cv_type: cvResult.type,
        },
      });

    if (auditError) {
      console.error("[mentor-get-candidate-cv] Error logging audit:", auditError);
      // Don't fail the request, just log the error
    }

    // Return the CV data
    return new Response(
      JSON.stringify({
        success: true,
        candidate_name: profileData.full_name || profileData.name || "Anonymous",
        cv: cvResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[mentor-get-candidate-cv] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Server Error", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
