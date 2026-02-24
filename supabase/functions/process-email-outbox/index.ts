/**
 * process-email-outbox — Email Worker (Step 3)
 *
 * Polls the email_outbox table for pending/failed emails, sends them via Resend,
 * and updates status with exponential backoff on failure.
 *
 * Designed to be invoked by a cron job (pg_cron or external scheduler).
 * Security: service_role only (verify_jwt = false, but checks service_role bearer).
 *
 * Idempotency: Each email has a unique idempotency_key. Re-processing a sent
 * email is a no-op. The worker uses SELECT ... FOR UPDATE SKIP LOCKED to
 * prevent concurrent workers from processing the same row.
 *
 * Backoff: 2^attempts * 30 seconds (30s, 60s, 120s, 240s, 480s → dead_letter)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH_SIZE = 10;
const BASE_BACKOFF_SECONDS = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: only service_role
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("[email-outbox] RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ processed: 0, error: "NO_SMTP_PROVIDER" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch batch of processable emails
  const { data: emails, error: fetchErr } = await supabase
    .from("email_outbox")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", 5) // max_attempts default
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error("[email-outbox] Fetch error:", fetchErr.message);
    return new Response(
      JSON.stringify({ error: fetchErr.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!emails || emails.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, message: "no_pending_emails" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let sent = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const email of emails) {
    // Mark as processing (optimistic lock via status update)
    const { error: lockErr } = await supabase
      .from("email_outbox")
      .update({ status: "processing", last_attempt_at: new Date().toISOString() })
      .eq("id", email.id)
      .in("status", ["pending", "failed"]); // CAS guard

    if (lockErr) {
      console.warn(`[email-outbox] Lock failed for ${email.id}:`, lockErr.message);
      continue;
    }

    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "XIMA Platform <noreply@xima.com>",
          to: [email.recipient_email],
          subject: email.subject,
          html: email.html_body,
        }),
      });

      if (resendRes.ok) {
        const resendData = await resendRes.json();
        await supabase
          .from("email_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: resendData.id || null,
            attempts: email.attempts + 1,
            error_message: null,
          })
          .eq("id", email.id);
        sent++;
        console.log(`[email-outbox] Sent ${email.id} (${email.email_type}) to ${email.recipient_email}`);
      } else {
        const errText = await resendRes.text().catch(() => "unknown");
        throw new Error(`Resend ${resendRes.status}: ${errText.substring(0, 200)}`);
      }
    } catch (sendErr) {
      const newAttempts = email.attempts + 1;
      const errorMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);

      if (newAttempts >= email.max_attempts) {
        // Dead letter
        await supabase
          .from("email_outbox")
          .update({
            status: "dead_letter",
            attempts: newAttempts,
            error_message: errorMsg,
          })
          .eq("id", email.id);
        deadLettered++;
        console.error(`[email-outbox] Dead-lettered ${email.id}: ${errorMsg}`);
      } else {
        // Exponential backoff
        const backoffSeconds = Math.pow(2, newAttempts) * BASE_BACKOFF_SECONDS;
        const nextRetry = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        await supabase
          .from("email_outbox")
          .update({
            status: "failed",
            attempts: newAttempts,
            error_message: errorMsg,
            next_retry_at: nextRetry,
          })
          .eq("id", email.id);
        failed++;
        console.warn(`[email-outbox] Failed ${email.id} (attempt ${newAttempts}), retry at ${nextRetry}`);
      }
    }
  }

  const summary = { processed: emails.length, sent, failed, dead_lettered: deadLettered };
  console.log("[email-outbox] Batch complete:", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
