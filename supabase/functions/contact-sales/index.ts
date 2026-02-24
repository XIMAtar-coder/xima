import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { requester_name, requester_email, company_name, message, desired_tier, desired_seats } = body;

    if (!requester_name || !requester_email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Find business profile if exists
    const { data: bizProfile } = await serviceClient
      .from("business_profiles")
      .select("id, company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    // Insert contact request
    const { data: request, error: insertErr } = await serviceClient
      .from("contact_sales_requests")
      .insert({
        business_id: bizProfile?.id || null,
        requester_name,
        requester_email,
        company_name: company_name || bizProfile?.company_name || null,
        message: message?.substring(0, 2000) || null,
        desired_tier: desired_tier || null,
        desired_seats: desired_seats || null,
        correlation_id: correlationId,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[contact-sales] Insert error:", insertErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to submit request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enqueue notification email to sales team
    const salesEmail = Deno.env.get("SALES_TEAM_EMAIL") || "sales@xima.com";
    await serviceClient.rpc("enqueue_email", {
      p_idempotency_key: `contact_sales_${request.id}`,
      p_email_type: "contact_sales_notification",
      p_recipient_email: salesEmail,
      p_subject: `[XIMA Sales] New contact request from ${requester_name}`,
      p_html_body: `
        <h2>New Contact Sales Request</h2>
        <p><strong>Name:</strong> ${requester_name}</p>
        <p><strong>Email:</strong> ${requester_email}</p>
        <p><strong>Company:</strong> ${company_name || bizProfile?.company_name || "N/A"}</p>
        <p><strong>Desired Tier:</strong> ${desired_tier || "Not specified"}</p>
        <p><strong>Desired Seats:</strong> ${desired_seats || "Not specified"}</p>
        <p><strong>Message:</strong></p>
        <blockquote>${(message || "No message").substring(0, 1000)}</blockquote>
        <hr/>
        <p><small>Request ID: ${request.id} | Correlation: ${correlationId}</small></p>
      `,
      p_metadata: { request_id: request.id, correlation_id: correlationId },
    });

    // Audit event + metric
    emitAuditEventWithMetric(
      {
        actorType: bizProfile ? "business" : "candidate",
        actorId: user.id,
        action: "sales.contact_submitted",
        entityType: "contact_sales_request",
        entityId: request.id,
        correlationId,
        metadata: {
          desired_tier: desired_tier || null,
          desired_seats: desired_seats || null,
          has_business_profile: !!bizProfile,
        },
      },
      "sales.contact_submitted"
    );

    return new Response(
      JSON.stringify({
        success: true,
        request_id: request.id,
        message: "Your request has been submitted. We'll contact you within 2 business days.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[contact-sales] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
