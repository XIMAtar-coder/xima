/**
 * XIMA Challenge Invitation v2.0
 * 
 * Sends personalized challenge invitations to candidates.
 * Uses Claude for personalized email content with template fallback.
 * Security: business role required, email fetched server-side only.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric, hashForAudit } from "../_shared/auditEvents.ts";

// =====================================================
// Types
// =====================================================

interface InvitationRequest {
  invitation_id: string;
  candidate_profile_id: string;
  candidate_name: string;
  company_name: string;
  role_title: string | null;
  invite_token: string;
  language?: string;
  challenge_type?: string; // "L1" | "L2"
  personal_message?: string;
}

// =====================================================
// HTML escape
// =====================================================

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// Template fallback email
// =====================================================

const TRANSLATIONS: Record<string, { subject: string; greeting: string; intro: string; role: string; cta: string; footer: string }> = {
  en: {
    subject: "You're invited to a challenge on XIMA",
    greeting: "Hello",
    intro: "has identified you as a great match and would like to invite you to participate in their hiring challenge.",
    role: "Role",
    cta: "View Challenge",
    footer: "This invitation was sent via XIMA Platform.",
  },
  it: {
    subject: "Sei stato invitato a una sfida su XIMA",
    greeting: "Ciao",
    intro: "ti ha identificato come un ottimo match e vorrebbe invitarti a partecipare alla loro sfida di selezione.",
    role: "Ruolo",
    cta: "Visualizza Sfida",
    footer: "Questo invito è stato inviato tramite XIMA Platform.",
  },
  es: {
    subject: "Has sido invitado a un desafío en XIMA",
    greeting: "Hola",
    intro: "te ha identificado como un gran candidato y te invita a participar en su desafío de contratación.",
    role: "Puesto",
    cta: "Ver Desafío",
    footer: "Esta invitación fue enviada a través de XIMA Platform.",
  },
};

function buildFallbackEmail(
  candidateName: string,
  companyName: string,
  roleTitle: string | null,
  inviteLink: string,
  language: string
): { subject: string; body: string } {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const safeName = escapeHtml(candidateName);
  const safeCompany = escapeHtml(companyName);
  const safeRole = escapeHtml(roleTitle || "Position");

  return {
    subject: t.subject,
    body: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #4171d6; margin: 0;">XIMA</h1></div>
    <h2 style="color: #1a1a2e; margin-bottom: 20px;">${t.greeting} ${safeName},</h2>
    <p style="font-size: 16px; color: #444; margin-bottom: 20px;">${safeCompany} ${t.intro}</p>
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #4171d6;">
      <p style="margin: 0; font-weight: bold; color: #1a1a2e;">${t.role}: ${safeRole}</p>
    </div>
    <div style="text-align: center; margin: 40px 0;">
      <a href="${inviteLink}" style="background-color: #4171d6; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">${t.cta}</a>
    </div>
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">${t.footer}</p>
  </div>
</body></html>`,
  };
}

// =====================================================
// Claude email generation
// =====================================================

async function generatePersonalizedEmail(
  candidateName: string,
  companyName: string,
  challengeType: string,
  locale: string,
  personalMessage: string | null,
  correlationId: string
): Promise<{ subject: string; body: string } | null> {
  try {
    const langNames: Record<string, string> = { en: "English", it: "Italian", es: "Spanish" };
    const langName = langNames[locale] || "English";
    const challengeDesc = challengeType === "L2" ? "technical skills assessment" : "behavioral assessment";

    const result = await callAnthropicApi({
      system: `Write a professional, warm challenge invitation email. Keep it 100-150 words. Be warm but professional. Write in ${langName}. Return ONLY JSON: { "subject": "...", "body_text": "..." }. The body_text should be plain text paragraphs (no HTML).`,
      userMessage: `Candidate: ${candidateName}. Company: ${companyName}. Challenge type: ${challengeDesc}.${personalMessage ? ` Personal note from hiring manager: ${personalMessage}` : ""}\n\nGenerate the invitation email.`,
      correlationId,
      functionName: "send-challenge-invitation",
      inputSummary: `invitation_email:${challengeType}`,
      maxTokens: 1024,
      temperature: 0.7,
      promptTemplateVersion: "2.0",
    });

    const cleaned = extractJsonFromAiContent(result.content);
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body_text) {
      return { subject: parsed.subject, body: parsed.body_text };
    }
    return null;
  } catch (e) {
    console.warn("[send-challenge-invitation] Claude email generation failed, using template:", e instanceof Error ? e.message : e);
    return null;
  }
}

// =====================================================
// Build HTML from Claude body text
// =====================================================

function wrapInEmailHtml(subject: string, bodyText: string, inviteLink: string, locale: string): string {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;
  const paragraphs = bodyText.split("\n").filter(Boolean).map(p => `<p style="font-size: 16px; color: #444; margin-bottom: 16px;">${escapeHtml(p)}</p>`).join("");

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #4171d6; margin: 0;">XIMA</h1></div>
    ${paragraphs}
    <div style="text-align: center; margin: 40px 0;">
      <a href="${inviteLink}" style="background-color: #4171d6; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">${t.cta}</a>
    </div>
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">${t.footer}</p>
  </div>
</body></html>`;
}

// =====================================================
// Main handler
// =====================================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorizedResponse();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return unauthorizedResponse();
    }

    // Role check
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const hasBusiness = roles?.some(r => r.role === "business");
    const hasAdmin = roles?.some(r => r.role === "admin");
    if (!hasBusiness && !hasAdmin) {
      return forbiddenResponse("Business role required to send invitations");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body: InvitationRequest = await req.json();
    const {
      invitation_id, candidate_profile_id, candidate_name,
      company_name, role_title, invite_token,
      language = "en", challenge_type = "L1", personal_message,
    } = body;

    if (!invitation_id || !candidate_profile_id || !invite_token) {
      return errorResponse(400, "MISSING_FIELDS", "invitation_id, candidate_profile_id, and invite_token are required");
    }

    // Verify invitation exists and belongs to this business
    const { data: invitation, error: invErr } = await supabase
      .from("challenge_invitations")
      .select("candidate_profile_id, business_id, invite_token, status")
      .eq("id", invitation_id)
      .single();

    if (invErr || !invitation) {
      return errorResponse(404, "INVITATION_NOT_FOUND", "Invalid invitation");
    }

    if (invitation.candidate_profile_id !== candidate_profile_id) {
      return forbiddenResponse("Invitation does not match candidate");
    }

    // Ownership check
    const { data: bizProfile } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!hasAdmin && (!bizProfile || invitation.business_id !== bizProfile.id)) {
      return forbiddenResponse("Not authorized to send this invitation");
    }

    // Duplicate check — skip if already sent
    if (invitation.status === "sent") {
      return jsonResponse({ success: true, message: "Invitation already sent", already_sent: true });
    }

    // Fetch candidate email server-side
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", candidate_profile_id)
      .single();

    if (profileErr || !profileData?.email) {
      return errorResponse(400, "NO_EMAIL", "Candidate email not available");
    }

    const candidateEmail = profileData.email;
    const baseUrl = Deno.env.get("SITE_URL") || "https://xima.lovable.app";
    const inviteLink = `${baseUrl}/challenge/accept?token=${invite_token}`;

    // Generate personalized email with Claude, fallback to template
    let emailSubject: string;
    let emailHtml: string;

    const claudeEmail = await generatePersonalizedEmail(
      candidate_name, company_name, challenge_type, language, personal_message || null, correlationId
    );

    if (claudeEmail) {
      emailSubject = claudeEmail.subject;
      emailHtml = wrapInEmailHtml(claudeEmail.subject, claudeEmail.body, inviteLink, language);
    } else {
      const fallback = buildFallbackEmail(candidate_name, company_name, role_title, inviteLink, language);
      emailSubject = fallback.subject;
      emailHtml = fallback.body;
    }

    // Send via email queue (if available) or direct
    try {
      await supabase.rpc("enqueue_email", {
        p_idempotency_key: `challenge_invite_${invitation_id}`,
        p_email_type: "challenge_invitation",
        p_recipient_email: candidateEmail,
        p_subject: emailSubject,
        p_html_body: emailHtml,
        p_metadata: { invitation_id, correlation_id: correlationId },
      });
    } catch (queueErr) {
      console.warn("[send-challenge-invitation] Email queue not available, email not sent:", queueErr instanceof Error ? queueErr.message : queueErr);
    }

    // Update invitation status
    await supabase
      .from("challenge_invitations")
      .update({ sent_via: ["in_app", "email"], status: "sent" })
      .eq("id", invitation_id);

    // Audit
    emitAuditEventWithMetric({
      actorType: "business",
      actorId: user.id,
      action: "challenge.invitation_sent",
      entityType: "challenge_invitation",
      entityId: invitation_id,
      correlationId,
      metadata: {
        challenge_type,
        candidate_profile_id,
        locale: language,
        personalized: !!claudeEmail,
      },
    }, "challenge_invitations_sent");

    console.log(JSON.stringify({ type: "invitation_sent", correlation_id: correlationId, invitation_id, personalized: !!claudeEmail }));

    return jsonResponse({ success: true, personalized: !!claudeEmail });
  } catch (e) {
    if (e instanceof AnthropicError) {
      // Claude failure shouldn't block invitation — template was used
      console.error(JSON.stringify({ type: "anthropic_error", correlation_id: correlationId, error: e.message }));
    }
    console.error(JSON.stringify({ type: "invitation_error", correlation_id: correlationId, error: e instanceof Error ? e.message : String(e) }));
    return errorResponse(500, "INTERNAL_ERROR", "Failed to send invitation");
  }
});
