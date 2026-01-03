import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

interface VerificationEmailRequest {
  email: string;
  name: string;
  verificationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, verificationUrl }: VerificationEmailRequest = await req.json();

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
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://your-domain.com/xima-logo.png" alt="XIMA Logo" style="height: 60px;">
          </div>
          
          <h1 style="color: #4171d6; text-align: center; margin-bottom: 30px;">Welcome to XIMA, ${escapeHtml(name)}!</h1>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for joining XIMA, the revolutionary platform for discovering your professional potential through XIMAtar assessment.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 30px;">
            To complete your registration and start your journey to discover your unique XIMAtar, please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" style="background-color: #4171d6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify My Account
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          <p style="font-size: 14px; color: #4171d6; word-break: break-all; margin-bottom: 30px;">
            ${verificationUrl}
          </p>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #666;">
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Complete your XIMA assessment to discover your XIMAtar</li>
              <li>Explore your professional strengths and growth areas</li>
              <li>Connect with mentors specialized in your development needs</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>This email was sent by XIMA Platform. If you didn't create an account, please ignore this email.</p>
            <p>&copy; 2024 XIMA Platform. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);