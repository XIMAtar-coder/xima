import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkEmailVerified, unverifiedResponse } from "../_shared/emailVerification.ts";
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

// SECURITY FIX: Removed candidate_email parameter - email must be fetched server-side only
interface InvitationRequest {
  invitation_id: string;
  candidate_profile_id: string;  // Required - used to look up email server-side
  candidate_name: string;
  company_name: string;
  role_title: string | null;
  invite_token: string;
  language?: string;
}

const getEmailContent = (
  candidateName: string,
  companyName: string,
  roleTitle: string | null,
  inviteLink: string,
  language: string = 'en'
) => {
  // Escape all user-supplied data to prevent XSS
  const safeName = escapeHtml(candidateName);
  const safeCompany = escapeHtml(companyName);
  const safeRole = escapeHtml(roleTitle || 'Position');

  const translations: Record<string, { subject: string; greeting: string; intro: string; role: string; cta: string; footer: string }> = {
    en: {
      subject: `You're invited to a challenge on XIMA`,
      greeting: `Hello ${safeName},`,
      intro: `${safeCompany} has identified you as a great match and would like to invite you to participate in their hiring challenge.`,
      role: `Role: ${safeRole}`,
      cta: `View Challenge`,
      footer: `This invitation was sent via XIMA Platform. If you have questions, please contact us.`
    },
    it: {
      subject: `Sei stato invitato a una sfida su XIMA`,
      greeting: `Ciao ${safeName},`,
      intro: `${safeCompany} ti ha identificato come un ottimo match e vorrebbe invitarti a partecipare alla loro sfida di selezione.`,
      role: `Ruolo: ${safeRole}`,
      cta: `Visualizza Sfida`,
      footer: `Questo invito è stato inviato tramite XIMA Platform. Per domande, contattaci.`
    },
    es: {
      subject: `Has sido invitado a un desafío en XIMA`,
      greeting: `Hola ${safeName},`,
      intro: `${safeCompany} te ha identificado como un gran candidato y te invita a participar en su desafío de contratación.`,
      role: `Puesto: ${safeRole}`,
      cta: `Ver Desafío`,
      footer: `Esta invitación fue enviada a través de XIMA Platform. Si tienes preguntas, contáctanos.`
    }
  };

  const t = translations[language] || translations.en;

  return {
    subject: t.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4171d6; margin: 0;">XIMA</h1>
          </div>
          
          <h2 style="color: #1a1a2e; margin-bottom: 20px;">${t.greeting}</h2>
          
          <p style="font-size: 16px; color: #444; margin-bottom: 20px;">
            ${t.intro}
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #4171d6;">
            <p style="margin: 0; font-weight: bold; color: #1a1a2e;">${t.role}</p>
            <p style="margin: 8px 0 0; color: #666;">${escapeHtml(companyName)}</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${inviteLink}" style="background-color: #4171d6; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              ${t.cta}
            </a>
          </div>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            ${t.footer}
          </p>
        </div>
      </body>
      </html>
    `
  };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-challenge-invitation] Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === SECURITY: Verify caller has business role ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // First verify the caller's identity with anon key + their JWT
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[send-challenge-invitation] Auth failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email verification check
    const verifyResult = await checkEmailVerified(authHeader);
    if (!verifyResult.verified) {
      return unverifiedResponse(verifyResult.code, verifyResult.message, corsHeaders);
    }

    // Check if user has business role
    const { data: roles, error: rolesError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error("[send-challenge-invitation] Roles query error:", rolesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const hasBusiness = roles?.some(r => r.role === 'business');
    const hasAdmin = roles?.some(r => r.role === 'admin');

    if (!hasBusiness && !hasAdmin) {
      console.error("[send-challenge-invitation] User lacks business role:", user.id);
      return new Response(
        JSON.stringify({ error: 'Business role required to send invitations' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-challenge-invitation] User authorized:", user.id, "roles:", roles?.map(r => r.role).join(', '));

    // Now use service role for actual operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      invitation_id,
      candidate_profile_id,
      candidate_name,
      company_name,
      role_title,
      invite_token,
      language = 'en'
    }: InvitationRequest = await req.json();

    // SECURITY FIX: Validate required field
    if (!candidate_profile_id) {
      return new Response(
        JSON.stringify({ error: 'candidate_profile_id is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY FIX: Verify invitation ownership - caller must own this invitation
    const { data: invitation, error: invError } = await supabase
      .from('challenge_invitations')
      .select('candidate_profile_id, business_id, invite_token')
      .eq('id', invitation_id)
      .single();

    if (invError || !invitation) {
      console.error("[send-challenge-invitation] Invalid invitation:", invError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid invitation' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the invitation matches the provided profile
    if (invitation.candidate_profile_id !== candidate_profile_id) {
      console.error("[send-challenge-invitation] Profile mismatch");
      return new Response(
        JSON.stringify({ error: 'Invitation does not match candidate' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the caller owns this invitation (is the business that created it)
    // Get business profile for current user
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!hasAdmin && (!businessProfile || invitation.business_id !== businessProfile.id)) {
      console.error("[send-challenge-invitation] Not authorized to send this invitation");
      return new Response(
        JSON.stringify({ error: 'Not authorized to send this invitation' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY FIX: ALWAYS fetch email server-side - never trust client input
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', candidate_profile_id)
      .single();

    if (profileError || !profileData?.email) {
      console.warn("[send-challenge-invitation] Could not fetch candidate email:", profileError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid candidate profile or email not available' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const candidate_email = profileData.email;

    console.log("[send-challenge-invitation] Processing invitation:", {
      invitation_id,
      candidate_profile_id,
      has_email: !!candidate_email,
      company_name,
      role_title
    });

    // Build the invite link - points to the accept invitation page
    const baseUrl = Deno.env.get("SITE_URL") || "https://xima.app";
    const inviteLink = `${baseUrl}/challenge/accept?token=${invite_token}`;

    // Get email content
    const { subject, html } = getEmailContent(
      candidate_name,
      company_name,
      role_title,
      inviteLink,
      language
    );

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "XIMA Platform <challenges@xima.com>",
      to: [candidate_email],
      subject,
      html,
    });

    console.log("[send-challenge-invitation] Email sent:", emailResponse);

    // Update invitation to include email in sent_via
    const { error: updateError } = await supabase
      .from('challenge_invitations')
      .update({ sent_via: ['in_app', 'email'] })
      .eq('id', invitation_id);

    if (updateError) {
      console.warn("[send-challenge-invitation] Failed to update sent_via:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-challenge-invitation] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 200, // Return 200 to not break the flow
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
