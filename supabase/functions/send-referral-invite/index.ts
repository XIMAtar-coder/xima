import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Auth client to verify the user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("[send-referral-invite] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipient_email, locale = "en" } = await req.json();

    if (!recipient_email || typeof recipient_email !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_EMAIL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_EMAIL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-invite
    if (recipient_email.toLowerCase() === user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "SELF_INVITE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's referral code + name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("referral_code, full_name")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.referral_code) {
      console.error("[send-referral-invite] Profile error:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: "NO_REFERRAL_CODE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteLink = `https://xima.lovable.app/register?ref=${profile.referral_code}`;
    const inviterName = profile.full_name || "A XIMA user";

    // Store the invite in referrals table (status='invited', no invited_user_id yet)
    // We'll use a separate approach: store in referrals only once they sign up.
    // For now, just log the email send attempt.
    console.log(`[send-referral-invite] Sending invite from ${user.id} to ${recipient_email}`);

    // Send email via Resend
    if (!resendApiKey) {
      console.warn("[send-referral-invite] RESEND_API_KEY not set, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "INVITE_LINK_GENERATED", invite_link: inviteLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailSubject = locale === "it"
      ? `${inviterName} ti invita su XIMA`
      : locale === "es"
        ? `${inviterName} te invita a XIMA`
        : `${inviterName} invites you to XIMA`;

    const emailBody = locale === "it"
      ? `<h2>Sei stato invitato su XIMA!</h2><p>${inviterName} ti ha invitato a unirti a XIMA — la piattaforma che valorizza le tue soft skills professionali.</p><p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#3A9FFF;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Registrati ora</a></p><p style="color:#888;font-size:12px;">Se non conosci chi ti ha inviato questo invito, puoi ignorare questa email.</p>`
      : locale === "es"
        ? `<h2>¡Te han invitado a XIMA!</h2><p>${inviterName} te ha invitado a unirte a XIMA — la plataforma que valora tus habilidades profesionales.</p><p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#3A9FFF;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Regístrate ahora</a></p><p style="color:#888;font-size:12px;">Si no conoces a quien te envió esta invitación, puedes ignorar este correo.</p>`
        : `<h2>You've been invited to XIMA!</h2><p>${inviterName} has invited you to join XIMA — the platform that values your professional soft skills.</p><p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#3A9FFF;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Sign up now</a></p><p style="color:#888;font-size:12px;">If you don't know who sent you this invitation, you can safely ignore this email.</p>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "XIMA <noreply@xima.lovable.app>",
        to: [recipient_email],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    const resendData = await resendRes.json();
    console.log("[send-referral-invite] Resend response:", JSON.stringify(resendData));

    if (!resendRes.ok) {
      console.error("[send-referral-invite] Resend error:", resendData);
      return new Response(
        JSON.stringify({ success: false, error: "EMAIL_SEND_FAILED", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "INVITE_SENT" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-referral-invite] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
