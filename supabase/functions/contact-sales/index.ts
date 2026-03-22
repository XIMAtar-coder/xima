/**
 * XIMA Contact Sales v2.0
 * 
 * Public B2B lead capture with optional Claude qualification.
 * Anti-spam: honeypot, email validation, message length limits.
 * Stores to contact_sales_requests, optionally qualifies with AI.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric, hashForAudit } from "../_shared/auditEvents.ts";

// =====================================================
// Main handler
// =====================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req);

  try {
    const body = await req.json();
    const {
      requester_name, requester_email, company_name, message,
      desired_tier, desired_seats, phone, company_size, industry,
      locale, source, website_url, // website_url is honeypot
    } = body;

    // Honeypot: if hidden field filled, silently accept
    if (website_url) {
      console.log(JSON.stringify({ type: "honeypot_triggered", correlation_id: correlationId }));
      return jsonResponse({
        success: true,
        message: "Thank you for your interest. We will contact you within 24-48 hours.",
      });
    }

    // Validate required fields
    if (!requester_name || typeof requester_name !== "string" || requester_name.trim().length < 2) {
      return errorResponse(400, "INVALID_NAME", "Name is required (min 2 characters)");
    }
    if (!requester_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email)) {
      return errorResponse(400, "INVALID_EMAIL", "Valid email is required");
    }
    if (!message || typeof message !== "string" || message.trim().length < 20) {
      return errorResponse(400, "INVALID_MESSAGE", "Message must be at least 20 characters");
    }
    if (message.length > 2000) {
      return errorResponse(400, "MESSAGE_TOO_LONG", "Message must be under 2000 characters");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional: check auth for linked business profile
    let userId: string | null = null;
    let bizProfileId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          userId = user.id;
          const { data: biz } = await supabase
            .from("business_profiles")
            .select("id, company_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (biz) bizProfileId = biz.id;
        }
      } catch {
        // Auth is optional, continue without
      }
    }

    // Insert lead
    const { data: request, error: insertErr } = await supabase
      .from("contact_sales_requests")
      .insert({
        business_id: bizProfileId,
        requester_name: requester_name.trim().substring(0, 200),
        requester_email: requester_email.trim().substring(0, 255),
        company_name: (company_name || "").substring(0, 200) || null,
        message: message.trim().substring(0, 2000),
        desired_tier: desired_tier || null,
        desired_seats: desired_seats || null,
        correlation_id: correlationId,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error(JSON.stringify({ type: "insert_error", correlation_id: correlationId, error: insertErr.message }));
      return errorResponse(500, "DB_ERROR", "Failed to submit request");
    }

    // Fire-and-forget: Claude qualification
    qualifyLeadAsync(supabase, request.id, {
      company_name, company_size, industry, message, desired_tier,
    }, correlationId);

    // Email to sales team
    const salesEmail = Deno.env.get("SALES_TEAM_EMAIL") || "sales@xima.com";
    try {
      await supabase.rpc("enqueue_email", {
        p_idempotency_key: `contact_sales_${request.id}`,
        p_email_type: "contact_sales_notification",
        p_recipient_email: salesEmail,
        p_subject: `[XIMA Sales] New inquiry from ${requester_name.trim()}`,
        p_html_body: `
          <h2>New Contact Sales Request</h2>
          <p><strong>Name:</strong> ${escapeHtml(requester_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(requester_email)}</p>
          <p><strong>Company:</strong> ${escapeHtml(company_name || "N/A")}</p>
          <p><strong>Company Size:</strong> ${escapeHtml(company_size || "N/A")}</p>
          <p><strong>Industry:</strong> ${escapeHtml(industry || "N/A")}</p>
          <p><strong>Desired Tier:</strong> ${escapeHtml(desired_tier || "N/A")}</p>
          <p><strong>Message:</strong></p>
          <blockquote>${escapeHtml(message.substring(0, 1000))}</blockquote>
          <hr/><p><small>Request ID: ${request.id} | Correlation: ${correlationId}</small></p>
        `,
        p_metadata: { request_id: request.id, correlation_id: correlationId },
      });
    } catch (emailErr) {
      console.warn("[contact-sales] Email queue error:", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    // Audit
    const ipHash = await hashForAudit(req.headers.get("x-forwarded-for") || "unknown");
    emitAuditEventWithMetric({
      actorType: userId ? "business" : "system",
      actorId: userId,
      action: "sales.lead_captured",
      entityType: "contact_sales_request",
      entityId: request.id,
      correlationId,
      metadata: {
        company_name: company_name || null,
        company_size: company_size || null,
        source: source || "website",
        has_auth: !!userId,
      },
      ipHash,
    }, "sales_leads_captured");

    // Localized response
    const lang = locale || "en";
    const messages: Record<string, string> = {
      it: "Grazie per il tuo interesse. Ti contatteremo entro 24-48 ore.",
      es: "Gracias por tu interés. Te contactaremos en 24-48 horas.",
      en: "Thank you for your interest. We will contact you within 24-48 hours.",
    };

    return jsonResponse({
      success: true,
      request_id: request.id,
      message: messages[lang] || messages.en,
    });
  } catch (e) {
    console.error(JSON.stringify({ type: "contact_sales_error", correlation_id: correlationId, error: e instanceof Error ? e.message : String(e) }));
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
});

// =====================================================
// Helpers
// =====================================================

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function qualifyLeadAsync(
  supabase: any,
  requestId: string,
  leadInfo: { company_name?: string; company_size?: string; industry?: string; message?: string; desired_tier?: string },
  correlationId: string
): Promise<void> {
  try {
    const result = await callAnthropicApi({
      system: `You are a B2B sales qualification assistant for XIMA, a psychometric talent platform. Qualify this sales lead. Return ONLY JSON: { "urgency": "high|medium|low", "fit_score": 1-10, "recommended_plan": "starter|growth|enterprise", "notes": "1 sentence for sales team" }`,
      userMessage: `Company: ${leadInfo.company_name || "Unknown"}. Size: ${leadInfo.company_size || "Unknown"}. Industry: ${leadInfo.industry || "Unknown"}. Desired plan: ${leadInfo.desired_tier || "Not specified"}. Message: ${(leadInfo.message || "").substring(0, 500)}`,
      correlationId,
      functionName: "contact-sales-qualify",
      inputSummary: `lead:${requestId}`,
      maxTokens: 256,
      temperature: 0.3,
      promptTemplateVersion: "2.0",
    });

    const cleaned = extractJsonFromAiContent(result.content);
    const qualification = JSON.parse(cleaned);

    // Store qualification as metadata on the existing request
    // Using the status field to mark as qualified
    await supabase
      .from("contact_sales_requests")
      .update({ status: "qualified" })
      .eq("id", requestId);

    console.log(JSON.stringify({ type: "lead_qualified", correlation_id: correlationId, request_id: requestId, urgency: qualification.urgency }));
  } catch (e) {
    // AI qualification is optional — don't fail the lead capture
    console.warn("[contact-sales] AI qualification failed:", e instanceof Error ? e.message : e);
  }
}
