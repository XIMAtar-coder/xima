import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = extractCorrelationId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse();
    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return unauthorizedResponse();

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { offer_id, response, candidate_message } = body;

    if (!offer_id || !["accepted", "declined"].includes(response)) {
      return errorResponse(400, "INVALID_INPUT", "offer_id and response (accepted/declined) required");
    }

    // Fetch offer — verify candidate ownership
    const { data: offer, error: offerError } = await serviceClient
      .from("hiring_offers")
      .select("*")
      .eq("id", offer_id)
      .eq("candidate_user_id", user.id)
      .single();

    if (offerError || !offer) return errorResponse(404, "NOT_FOUND", "Offer not found");

    if (offer.offer_status !== "sent") {
      return errorResponse(400, "INVALID_STATE", "This offer is not in a state that can be responded to");
    }

    // Update the offer
    await serviceClient
      .from("hiring_offers")
      .update({
        offer_status: response,
        candidate_response: candidate_message || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer_id);

    // Update pipeline stage
    const newStage = response === "accepted" ? "hired" : "declined";
    await serviceClient
      .from("shortlist_results")
      .update({ pipeline_stage: newStage, status: newStage, updated_at: new Date().toISOString() })
      .eq("id", offer.shortlist_id);

    // If accepted, mark the hiring goal as filled
    if (response === "accepted") {
      await serviceClient
        .from("hiring_goal_drafts")
        .update({ status: "filled", filled_at: new Date().toISOString(), filled_by: user.id })
        .eq("id", offer.hiring_goal_id);
    }

    // Fetch candidate name for notification
    const { data: candidateProfile } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const candidateName = candidateProfile?.full_name || "The candidate";

    // Notify business via feed
    await serviceClient.from("feed_items").insert({
      user_id: offer.business_id,
      feed_type: "actor_interaction",
      title: response === "accepted"
        ? `${candidateName} accepted the offer!`
        : `${candidateName} declined the offer`,
      body: response === "accepted"
        ? "Congratulations! The candidate has accepted your job offer."
        : candidate_message
          ? `The candidate declined with this message: "${candidate_message.substring(0, 100)}"`
          : "The candidate declined the offer.",
      icon: response === "accepted" ? "check-circle" : "x-circle",
      action_url: `/business/dashboard`,
      action_label: "View Details",
      actor_type: "candidate",
      priority: response === "accepted" ? 5 : 3,
    }).then(() => {}).catch(e => console.warn("[respond-offer] Feed insert failed:", e));

    // Insert chat message
    const { data: thread } = await serviceClient
      .from("pipeline_chat_threads")
      .select("id")
      .eq("hiring_goal_id", offer.hiring_goal_id)
      .eq("candidate_user_id", user.id)
      .maybeSingle();

    if (thread) {
      await serviceClient.from("pipeline_chat_messages").insert({
        thread_id: thread.id,
        sender_id: user.id,
        sender_role: "system",
        message_type: "stage_update",
        content: response === "accepted" ? "Candidate accepted the offer!" : "Candidate declined the offer",
        stage_from: "offered",
        stage_to: newStage,
      });

      if (candidate_message) {
        await serviceClient.from("pipeline_chat_messages").insert({
          thread_id: thread.id,
          sender_id: user.id,
          sender_role: "candidate",
          message_type: "text",
          content: candidate_message,
        });
      }

      await serviceClient.from("pipeline_chat_threads")
        .update({ unread_business: 1, current_stage: newStage, last_message_at: new Date().toISOString() })
        .eq("id", thread.id);
    }

    // Audit
    emitAuditEventWithMetric({
      actorType: "candidate",
      actorId: user.id,
      action: response === "accepted" ? "hiring.offer_accepted" : "hiring.offer_declined",
      entityType: "hiring_offer",
      entityId: offer_id,
      correlationId,
      metadata: {
        business_id: offer.business_id,
        hiring_goal_id: offer.hiring_goal_id,
        has_message: !!candidate_message,
      },
    }, response === "accepted" ? "offers_accepted" : "offers_declined");

    return jsonResponse({
      success: true,
      offer_id,
      response,
      message: response === "accepted"
        ? "Congratulations! You've accepted the offer."
        : "You've declined the offer.",
    });

  } catch (err: any) {
    console.error(JSON.stringify({ type: "error", correlation_id: correlationId, error: err.message }));
    return errorResponse(500, "INTERNAL_ERROR", err.message);
  }
});
