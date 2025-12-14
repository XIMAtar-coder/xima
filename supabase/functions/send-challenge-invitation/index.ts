import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  invitation_id: string;
  candidate_email: string;
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
  const translations: Record<string, { subject: string; greeting: string; intro: string; role: string; cta: string; footer: string }> = {
    en: {
      subject: `You're invited to a challenge on XIMA`,
      greeting: `Hello ${candidateName},`,
      intro: `${companyName} has identified you as a great match and would like to invite you to participate in their hiring challenge.`,
      role: `Role: ${roleTitle || 'Position'}`,
      cta: `View Challenge`,
      footer: `This invitation was sent via XIMA Platform. If you have questions, please contact us.`
    },
    it: {
      subject: `Sei stato invitato a una sfida su XIMA`,
      greeting: `Ciao ${candidateName},`,
      intro: `${companyName} ti ha identificato come un ottimo match e vorrebbe invitarti a partecipare alla loro sfida di selezione.`,
      role: `Ruolo: ${roleTitle || 'Posizione'}`,
      cta: `Visualizza Sfida`,
      footer: `Questo invito è stato inviato tramite XIMA Platform. Per domande, contattaci.`
    },
    es: {
      subject: `Has sido invitado a un desafío en XIMA`,
      greeting: `Hola ${candidateName},`,
      intro: `${companyName} te ha identificado como un gran candidato y te invita a participar en su desafío de contratación.`,
      role: `Puesto: ${roleTitle || 'Posición'}`,
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
            <p style="margin: 8px 0 0; color: #666;">${companyName}</p>
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      invitation_id,
      candidate_email,
      candidate_name,
      company_name,
      role_title,
      invite_token,
      language = 'en'
    }: InvitationRequest = await req.json();

    console.log("[send-challenge-invitation] Processing invitation:", {
      invitation_id,
      candidate_email,
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
