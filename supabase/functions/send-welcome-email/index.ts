/**
 * send-welcome-email Edge Function
 *
 * Called by a DB trigger (via pg_net) after a new profile is inserted.
 * Sends a "Welcome to XIMA" email using Resend.
 *
 * SMTP PREREQUISITE: Requires the RESEND_API_KEY secret to be configured
 * in Supabase Edge Function secrets. Without it, the function logs a
 * warning and exits gracefully.
 *
 * Security: Accepts only service-role Bearer tokens (verified below).
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: only allow service-role calls ---
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

    // --- Idempotency check ---
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("welcome_email_sent_at, name, first_name, full_name, user_id")
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
      console.log("Welcome email already sent for user:", user_id);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // --- Get user email from auth.users via Admin API ---
    const { data: authUser, error: authErr } =
      await supabase.auth.admin.getUserById(user_id);

    if (authErr || !authUser?.user?.email) {
      console.error("Auth user not found:", authErr?.message);
      return new Response(
        JSON.stringify({ error: "Auth user email not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const email = authUser.user.email;
    const displayName = escapeHtml(
      profile.first_name || profile.full_name || profile.name || "there"
    );

    // --- Send email via Resend if API key is configured ---
    if (!RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY not configured. Welcome email NOT sent for:",
        email
      );
      // Still mark as sent to avoid retry loops
      await supabase
        .from("profiles")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("user_id", user_id);
      return new Response(
        JSON.stringify({ ok: true, fallback: "no_smtp_provider" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "XIMA Platform <noreply@xima.com>",
        to: [email],
        subject: "Welcome to XIMA! 🎉",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4171d6;">Welcome to XIMA, ${displayName}!</h1>
  </div>
  <p style="font-size: 16px;">Thank you for joining XIMA — the platform that helps you discover your professional potential through XIMAtar assessment.</p>
  <p style="font-size: 16px;">Here's what you can do next:</p>
  <ul style="font-size: 15px;">
    <li>Complete your XIMA assessment to discover your XIMAtar</li>
    <li>Explore your professional strengths and growth areas</li>
    <li>Connect with mentors specialized in your development needs</li>
  </ul>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://xima.lovable.app" style="background-color: #4171d6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Get Started</a>
  </div>
  <div style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
    <p>This email was sent by XIMA Platform. If you didn't create an account, please ignore this email.</p>
    <p>&copy; 2025 XIMA Platform. All rights reserved.</p>
  </div>
</body>
</html>`,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errBody);
      return new Response(
        JSON.stringify({ error: "Email send failed", details: errBody }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // --- Mark as sent ---
    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("user_id", user_id);

    console.log("Welcome email sent to:", email);
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
