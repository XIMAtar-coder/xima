import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Auth required");
    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return unauthorizedResponse("Auth required");

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { shortlist_id, hiring_goal_id } = body;

    if (!shortlist_id) return errorResponse(400, "INVALID_INPUT", "shortlist_id required");

    // Verify ownership
    const { data: shortlistEntry, error: slError } = await serviceClient
      .from("shortlist_results")
      .select("*")
      .eq("id", shortlist_id)
      .eq("business_id", user.id)
      .single();

    if (slError || !shortlistEntry) {
      return errorResponse(404, "NOT_FOUND", "Shortlist entry not found");
    }

    const candidateUserId = shortlistEntry.candidate_user_id;

    // If already revealed, just return the data
    if (shortlistEntry.identity_revealed) {
      const [profileResult, credResult, cvResult] = await Promise.all([
        serviceClient.from("profiles").select("user_id, full_name, preferred_language").eq("user_id", candidateUserId).maybeSingle(),
        serviceClient.from("cv_credentials").select("full_name, email, phone, location_city, location_country, seniority_level, total_years_experience").eq("user_id", candidateUserId).maybeSingle(),
        serviceClient.from("cv_identity_analysis").select("tension_narrative, cv_archetype_primary, alignment_score").eq("user_id", candidateUserId).maybeSingle(),
      ]);

      const { data: authUser } = await serviceClient.auth.admin.getUserById(candidateUserId);

      return jsonResponse({
        success: true,
        already_revealed: true,
        candidate: {
          full_name: credResult.data?.full_name || profileResult.data?.full_name || "Unknown",
          email: credResult.data?.email || authUser?.user?.email || null,
          phone: credResult.data?.phone || null,
          location: [credResult.data?.location_city, credResult.data?.location_country].filter(Boolean).join(", ") || null,
          seniority_level: credResult.data?.seniority_level || null,
          total_years_experience: credResult.data?.total_years_experience || null,
          cv_summary: cvResult.data?.tension_narrative || null,
          cv_archetype: cvResult.data?.cv_archetype_primary || null,
          alignment_score: cvResult.data?.alignment_score || null,
        },
      });
    }

    // Fetch candidate's real profile
    const [profileResult, credResult, cvResult] = await Promise.all([
      serviceClient.from("profiles").select("user_id, full_name, preferred_language").eq("user_id", candidateUserId).maybeSingle(),
      serviceClient.from("cv_credentials").select("full_name, email, phone, location_city, location_country, seniority_level, total_years_experience").eq("user_id", candidateUserId).maybeSingle(),
      serviceClient.from("cv_identity_analysis").select("tension_narrative, cv_archetype_primary, alignment_score").eq("user_id", candidateUserId).maybeSingle(),
    ]);

    // Get user email from auth
    const { data: authUser } = await serviceClient.auth.admin.getUserById(candidateUserId);

    const candidateData = {
      full_name: credResult.data?.full_name || profileResult.data?.full_name || "Unknown",
      email: credResult.data?.email || authUser?.user?.email || null,
      phone: credResult.data?.phone || null,
      location: [credResult.data?.location_city, credResult.data?.location_country].filter(Boolean).join(", ") || null,
      seniority_level: credResult.data?.seniority_level || null,
      total_years_experience: credResult.data?.total_years_experience || null,
      cv_summary: cvResult.data?.tension_narrative || null,
      cv_archetype: cvResult.data?.cv_archetype_primary || null,
      alignment_score: cvResult.data?.alignment_score || null,
    };

    // Mark as revealed
    await serviceClient.from("shortlist_results").update({
      identity_revealed: true,
      identity_revealed_at: new Date().toISOString(),
      identity_revealed_by: user.id,
      pipeline_stage: "offer_pending",
    }).eq("id", shortlist_id);

    // Create hiring offer record
    await serviceClient.from("hiring_offers").insert({
      shortlist_id,
      hiring_goal_id: hiring_goal_id || shortlistEntry.hiring_goal_id,
      business_id: user.id,
      candidate_user_id: candidateUserId,
      offer_status: "draft",
      identity_revealed_at: new Date().toISOString(),
    });

    // Notify candidate via feed
    await serviceClient.from("feed_items").insert({
      user_id: candidateUserId,
      feed_type: "actor_interaction",
      title: "A company is interested in you!",
      body: "A company has reviewed your XIMA profile through their challenge pipeline and wants to connect. Check your messages for details.",
      icon: "briefcase",
      action_url: "/messages",
      action_label: "View Messages",
      actor_type: "company",
      priority: 3,
    });

    // Audit
    emitAuditEventWithMetric({
      actorType: "business",
      actorId: user.id,
      action: "candidate.identity_revealed",
      entityType: "shortlist_result",
      entityId: shortlist_id,
      metadata: {
        candidate_user_id: candidateUserId,
        hiring_goal_id: hiring_goal_id || shortlistEntry.hiring_goal_id,
        anonymous_label: shortlistEntry.anonymous_label,
      },
    }, "identity_reveals");

    return jsonResponse({
      success: true,
      candidate: candidateData,
      message: "Candidate identity revealed. You can now prepare and send an offer.",
    });

  } catch (err: any) {
    console.error("[reveal-identity] Error:", err.message);
    return errorResponse(500, "INTERNAL_ERROR", err.message);
  }
});
