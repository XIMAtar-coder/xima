/**
 * send-welcome-email Edge Function
 *
 * Called by a DB trigger (via pg_net) after a new profile is inserted.
 * Forwards the send to the Lovable transactional email pipeline
 * (send-transactional-email) which uses the queued, branded
 * "welcome" template.
 *
 * Security: Accepts only service-role Bearer tokens.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (token !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Idempotency: skip if welcome email already sent
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select(
        "welcome_email_sent_at, name, first_name, full_name, preferred_locale, user_id",
      )
      .eq("user_id", user_id)
      .single();

    if (profileErr || !profile) {
      console.error("Profile not found:", profileErr?.message);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (profile.welcome_email_sent_at) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Resolve recipient email from auth.users
    const { data: authUser, error: authErr } =
      await supabase.auth.admin.getUserById(user_id);

    if (authErr || !authUser?.user?.email) {
      console.error("Auth user not found:", authErr?.message);
      return new Response(
        JSON.stringify({ error: "Auth user email not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const email = authUser.user.email;
    const rawLocale =
      (profile as any).preferred_locale ||
      (authUser.user.user_metadata?.locale as string | undefined) ||
      "it";
    const locale = ["it", "en", "es"].includes(rawLocale) ? rawLocale : "it";
    const name =
      (profile as any).first_name ||
      (profile as any).full_name ||
      (profile as any).name ||
      undefined;

    // Forward to the Lovable transactional email pipeline.
    const invokeRes = await fetch(
      `${SUPABASE_URL}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          templateName: "welcome",
          recipientEmail: email,
          idempotencyKey: `welcome-${user_id}`,
          templateData: { name, locale },
        }),
      },
    );

    if (!invokeRes.ok) {
      const errBody = await invokeRes.text();
      console.error(
        "send-transactional-email failed:",
        invokeRes.status,
        errBody,
      );
      return new Response(
        JSON.stringify({ error: "Email send failed", details: errBody }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("user_id", user_id);

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("send-welcome-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
