import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS in email templates
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Allowlist of acceptable host domains for the verification URL.
// Prevents attackers from coercing this endpoint into sending phishing links.
const ALLOWED_HOSTS = new Set<string>([
  "xima.lovable.app",
  "ximatar.com",
  "www.ximatar.com",
  "id-preview--c7e7b232-49aa-4c31-a2c1-90384a7f553e.lovable.app",
]);

function isAllowedVerificationUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.host);
  } catch {
    return false;
  }
}

interface VerificationEmailRequest {
  email: string;
  name: string;
  verificationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller (defense-in-depth against abuse).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, name, verificationUrl }: VerificationEmailRequest = await req.json();

    if (!email || !name || !verificationUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAllowedVerificationUrl(verificationUrl)) {
      return new Response(JSON.stringify({ error: "Invalid verification URL host" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeUrl = escapeHtml(verificationUrl);
    const safeName = escapeHtml(name);

    const emailResponse = await resend.emails.send({
      from: "XIMA Platform <verification@xima.com>",
      to: [email],
      subject: "Welcome to XIMA - Verify Your Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to XIMA</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4171d6; text-align: center; margin-bottom: 30px;">Welcome to XIMA, ${safeName}!</h1>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for joining XIMA, the platform for discovering your professional potential through XIMAtar assessment.
          </p>
          <p style="font-size: 16px; margin-bottom: 30px;">
            To complete your registration, please verify your email address by clicking the button below:
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${safeUrl}" style="background-color: #4171d6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify My Account
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 14px; color: #4171d6; word-break: break-all; margin-bottom: 30px;">
            ${safeUrl}
          </p>
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error?.message);
    return new Response(
      JSON.stringify({ error: "Failed to send verification email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
