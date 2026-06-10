import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const APP_BASE = Deno.env.get("PUBLIC_APP_URL") ?? "https://preview--xima.lovable.app";
const LOGO_URL = `${APP_BASE}/images/xima-full-dark.png`;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function renderEmailHtml(name: string, verifyUrl: string, deadlineText: string): string {
  const safeName = escapeHtml(name || "");
  const safeUrl = escapeHtml(verifyUrl);
  const safeDeadline = escapeHtml(deadlineText);
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Conferma il tuo account XIMA</title></head>
<body style="margin:0; padding:0; background:#F7FAFF; font-family: Arial, Helvetica, sans-serif; color:#071E3A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFF;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 6px 24px rgba(7,30,58,0.06);">
        <tr><td align="center" style="background:#071E3A; padding:28px 24px;">
          <img src="${LOGO_URL}" alt="XIMA" width="120" style="display:block; max-width:120px; height:auto;" />
        </td></tr>
        <tr><td style="padding:36px 32px 8px 32px;">
          <h1 style="margin:0 0 12px 0; font-size:24px; line-height:1.3; color:#071E3A;">Benvenuto in XIMA${safeName ? ", " + safeName : ""}</h1>
          <p style="margin:0 0 18px 0; font-size:15px; line-height:1.6; color:#3C4A63;">
            Hai 72 ore per confermare la tua email e mantenere pieno accesso a tutte le funzionalit&agrave; XIMA.
            Puoi gi&agrave; usare la dashboard, completare il tuo XIMAtar e modificare il profilo.
          </p>
          <p style="margin:0 0 24px 0; font-size:14px; line-height:1.6; color:#6B7790;">
            Scadenza conferma: <strong style="color:#071E3A;">${safeDeadline}</strong>
          </p>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 32px 32px;">
          <a href="${safeUrl}" style="display:inline-block; background:#1E5BFF; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:bold; font-size:15px;">Conferma la mia email</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px 32px;">
          <p style="margin:0 0 8px 0; font-size:12px; color:#6B7790;">Se il bottone non funziona, copia questo link nel browser:</p>
          <p style="margin:0; font-size:12px; color:#1E5BFF; word-break:break-all;">${safeUrl}</p>
        </td></tr>
        <tr><td style="background:#071E3A; padding:20px 24px; text-align:center;">
          <p style="margin:0; font-size:13px; color:#D6DEEC;">XIMA &mdash; Discover Your Professional Potential</p>
          <p style="margin:8px 0 0 0; font-size:11px; color:#7F8DA3;">&copy; 2026 XIMA. Tutti i diritti riservati.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { user_id, email, name, verification_deadline } = body || {};
    if (!user_id || !email || !verification_deadline) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Generate random token + hash
    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(verification_deadline);

    const { error: insertErr } = await admin
      .from("email_verification_tokens")
      .insert({ user_id, token_hash: tokenHash, expires_at: expiresAt.toISOString() });

    if (insertErr) {
      console.error("Token insert error:", insertErr.message);
      return new Response(JSON.stringify({ error: "Failed to create token" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyUrl = `${APP_BASE}/verify-email?token=${rawToken}`;
    const deadlineText = expiresAt.toLocaleString("it-IT", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const emailResp = await resend.emails.send({
      from: "XIMA <noreply@ximatar.com>",
      to: [email],
      subject: "Conferma il tuo account XIMA (entro 72 ore)",
      html: renderEmailHtml(name || "", verifyUrl, deadlineText),
    });

    if ((emailResp as any)?.error) {
      console.error("Resend error:", (emailResp as any).error);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-verification-email error:", e?.message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
