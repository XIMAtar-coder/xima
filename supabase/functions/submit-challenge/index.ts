// SCHEMA PREFLIGHT (verified 2026-08-08):
// challenge_invitations: id, candidate_profile_id, business_id, hiring_goal_id,
//   challenge_id, status, responded_at
// challenge_submissions: id, invitation_id (unique), candidate_profile_id, business_id,
//   hiring_goal_id, challenge_id, status, submitted_payload, draft_payload,
//   submitted_at, signals_payload, signals_version
// profiles: id, user_id
//
// signals_payload and signals_version are guarded by BEFORE UPDATE triggers
// (guard_submission_scoring_columns) and can only be written by the service role.
// That is the whole reason this function exists.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { computeSignals } from "../_shared/computeSignals.ts";

/**
 * Submitting a challenge, with the score computed on this side of the wire.
 *
 * The candidate's client used to write challenge_submissions.signals_payload
 * itself — the column that feeds the 20-point performance axis of the shortlist.
 * The heuristic ran in the browser, so anyone could set their own score to 100
 * by editing the request. Locking that column (guard_submission_scoring_columns)
 * closed the hole and broke submission at the same time, because the app had no
 * other way to produce the value.
 *
 * The heuristic is pure and deterministic over the candidate's own answers, so
 * it is recomputed here from the payload they submitted. They still influence
 * the score by writing a better answer; they no longer choose it.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = extractCorrelationId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Missing auth");
    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !user) return unauthorizedResponse("Auth required");

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "INVALID_INPUT", "Invalid JSON body");
    }

    const invitationId = String(body.invitation_id || "");
    const payload = body.payload as Record<string, unknown> | undefined;
    const level = Number(body.level ?? 1);

    if (!invitationId || !payload || typeof payload !== "object") {
      return errorResponse(400, "INVALID_INPUT", "invitation_id and payload are required");
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // The invitation is the authority for who this submission belongs to. Every
    // id written below comes from here rather than from the request body, so a
    // caller cannot file a submission against someone else's invitation or
    // attribute one to a business they were never invited by.
    const { data: invitation, error: invErr } = await serviceClient
      .from("challenge_invitations")
      .select("id, candidate_profile_id, business_id, hiring_goal_id, challenge_id, status")
      .eq("id", invitationId)
      .maybeSingle();

    if (invErr || !invitation) {
      return errorResponse(404, "INVITATION_NOT_FOUND", "Invitation not found");
    }

    // Ownership: the caller must be the candidate this invitation was issued to.
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || profile.id !== invitation.candidate_profile_id) {
      console.warn(JSON.stringify({
        type: "submit_challenge_ownership_denied",
        correlation_id: correlationId, invitation_id: invitationId, caller: user.id,
      }));
      return forbiddenResponse("This invitation does not belong to you");
    }

    // Idempotence: a submitted challenge is final. Without this, re-posting would
    // re-run the grading and overwrite a reviewed submission.
    const { data: existing } = await serviceClient
      .from("challenge_submissions")
      .select("id, status")
      .eq("invitation_id", invitationId)
      .maybeSingle();

    if (existing?.status === "submitted") {
      return jsonResponse({ status: "already_submitted", submission_id: existing.id });
    }

    // Level 1 is the only level this heuristic describes. Other levels are graded
    // by their own paths and must not get an L1 payload attached.
    const signals = level === 1
      ? computeSignals({
          approach: String(payload.approach || ""),
          assumptions: String(payload.assumptions || ""),
          first_actions: Array.isArray(payload.first_actions) ? payload.first_actions.map(String) : [],
          tradeoff_priority: String(payload.tradeoff_priority || ""),
          confidence: String(payload.confidence || ""),
        })
      : null;

    const now = new Date().toISOString();

    const row: Record<string, unknown> = {
      invitation_id: invitation.id,
      candidate_profile_id: invitation.candidate_profile_id,
      business_id: invitation.business_id,
      hiring_goal_id: invitation.hiring_goal_id,
      challenge_id: invitation.challenge_id,
      status: "submitted",
      submitted_payload: payload,
      draft_payload: payload,
      submitted_at: now,
      signals_version: "v1",
    };
    if (signals) row.signals_payload = signals;

    const { data: saved, error: saveErr } = await serviceClient
      .from("challenge_submissions")
      .upsert(row, { onConflict: "invitation_id" })
      .select("id")
      .single();

    if (saveErr) {
      console.error(JSON.stringify({
        type: "submit_challenge_save_failed",
        correlation_id: correlationId, error: saveErr.message,
      }));
      return errorResponse(500, "SAVE_FAILED", "Could not save the submission");
    }

    // Awaited, not fired and forgotten: this write failed silently for months
    // once already, leaving businesses unable to see who had responded.
    const { error: invStatusErr } = await serviceClient
      .from("challenge_invitations")
      .update({ status: "submitted", responded_at: now })
      .eq("id", invitation.id);

    if (invStatusErr) {
      console.error(JSON.stringify({
        type: "submit_challenge_invitation_status_failed",
        correlation_id: correlationId, error: invStatusErr.message,
      }));
    }

    console.log(JSON.stringify({
      type: "submit_challenge_success",
      correlation_id: correlationId,
      invitation_id: invitation.id,
      level,
      scored: !!signals,
      overall: signals?.overall ?? null,
    }));

    return jsonResponse({
      status: "submitted",
      submission_id: saved.id,
      submitted_at: now,
      signals,
    });
  } catch (err) {
    console.error("[submit-challenge] FATAL:", err instanceof Error ? err.message : err);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
  }
});
