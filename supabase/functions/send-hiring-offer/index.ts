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
    const { offer_id, offer_message, offer_salary, offer_start_date, offer_notes } = body;

    if (!offer_id) return errorResponse(400, "INVALID_INPUT", "offer_id required");

    // Fetch the offer — verify ownership
    const { data: offer, error: offerError } = await serviceClient
      .from("hiring_offers")
      .select("*")
      .eq("id", offer_id)
      .eq("business_id", user.id)
      .single();

    if (offerError || !offer) return errorResponse(404, "NOT_FOUND", "Offer not found");

    if (offer.offer_status !== "draft") {
      return errorResponse(400, "ALREADY_SENT", "This offer has already been sent");
    }

    // Update the offer
    const { error: updateError } = await serviceClient
      .from("hiring_offers")
      .update({
        offer_status: "sent",
        offer_message: offer_message || offer.offer_message,
        offer_salary: offer_salary || offer.offer_salary,
        offer_start_date: offer_start_date || offer.offer_start_date,
        offer_notes: offer_notes || offer.offer_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer_id);

    if (updateError) {
      return errorResponse(500, "DB_ERROR", "Failed to update offer");
    }

    // Update pipeline stage
    await serviceClient
      .from("shortlist_results")
      .update({ pipeline_stage: "offered", updated_at: new Date().toISOString() })
      .eq("id", offer.shortlist_id);

    // Fetch business info for the notification
    const { data: bizProfile } = await serviceClient
      .from("business_profiles")
      .select("company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyName = bizProfile?.company_name || "A company";

    // Notify candidate via feed
    await serviceClient.from("feed_items").insert({
      user_id: offer.candidate_user_id,
      feed_type: "actor_interaction",
      title: `${companyName} sent you an offer!`,
      body: "You received a job offer. Check the details and respond.",
      icon: "gift",
      action_url: "/offers",
      action_label: "View Offer",
      actor_type: "company",
      priority: 5,
    }).then(() => {}).catch(e => console.warn("[send-offer] Feed insert failed:", e));

    // Insert chat message about offer
    const { data: thread } = await serviceClient
      .from("pipeline_chat_threads")
      .select("id")
      .eq("hiring_goal_id", offer.hiring_goal_id)
      .eq("candidate_user_id", offer.candidate_user_id)
      .maybeSingle();

    if (thread) {
      await serviceClient.from("pipeline_chat_messages").insert({
        thread_id: thread.id,
        sender_id: user.id,
        sender_role: "system",
        message_type: "stage_update",
        content: "Offer sent to candidate",
        stage_from: "offer_pending",
        stage_to: "offered",
      });

      await serviceClient.from("pipeline_chat_threads")
        .update({ unread_candidate: 1, last_message_at: new Date().toISOString() })
        .eq("id", thread.id);
    }

    // Audit
    emitAuditEventWithMetric({
      actorType: "business",
      actorId: user.id,
      action: "hiring.offer_sent",
      entityType: "hiring_offer",
      entityId: offer_id,
      correlationId,
      metadata: {
        candidate_user_id: offer.candidate_user_id,
        hiring_goal_id: offer.hiring_goal_id,
        has_salary: !!offer_salary,
        has_start_date: !!offer_start_date,
      },
    }, "offers_sent");

    return jsonResponse({ success: true, offer_id, status: "sent" });

  } catch (err: any) {
    console.error(JSON.stringify({ type: "error", correlation_id: correlationId, error: err.message }));
    return errorResponse(500, "INTERNAL_ERROR", err.message);
  }
});
