// SCHEMA PREFLIGHT (verified 2026-04-14):
// job_posts: id, business_id, title, xima_hr_requested, xima_hr_requested_at, xima_hr_status
// hiring_goal_drafts: id, business_id, role_title, xima_hr_requested
// business_profiles: id, user_id, company_name, hr_contact_email
// admin_notifications: id, type, severity, payload, status, created_at, actioned_at, actioned_by
// email_outbox: id, recipient_email, subject, html_body, email_type, status, idempotency_key, metadata
// SALARY CONVENTION: salary_min/salary_max are ALWAYS gross (RAL). Net-to-gross ×1.4 at import.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Missing auth");

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !user) return unauthorizedResponse("Auth required");

    const body = await req.json();
    const { business_id, source, source_id } = body;

    if (!business_id || !source) {
      return errorResponse(400, "INVALID_INPUT", "business_id and source ('listing'|'hiring_goal'|'generic') are required");
    }
    if (!["listing", "hiring_goal", "generic"].includes(source)) {
      return errorResponse(400, "INVALID_SOURCE", "source must be 'listing', 'hiring_goal', or 'generic'");
    }
    if (source !== "generic" && !source_id) {
      return errorResponse(400, "INVALID_INPUT", "source_id is required for listing and hiring_goal sources");
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Verify ownership
    const { data: bp } = await serviceClient
      .from("business_profiles")
      .select("id, company_name, hr_contact_email, user_id")
      .eq("id", business_id)
      .maybeSingle();

    if (!bp || bp.user_id !== user.id) {
      return errorResponse(403, "FORBIDDEN", "Not authorized for this business");
    }

    let roleTitle = "Unknown role";

    // Update the source record
    if (source === "listing") {
      const { data: jobPost, error: jpError } = await serviceClient
        .from("job_posts")
        .select("id, title, business_id")
        .eq("id", source_id)
        .eq("business_id", business_id)
        .maybeSingle();

      if (jpError || !jobPost) {
        return errorResponse(404, "NOT_FOUND", "Job post not found");
      }
      roleTitle = jobPost.title || roleTitle;

      await serviceClient
        .from("job_posts")
        .update({ xima_hr_requested: true, xima_hr_requested_at: new Date().toISOString(), xima_hr_status: "pending" })
        .eq("id", source_id);
    } else {
      const { data: goal, error: gError } = await serviceClient
        .from("hiring_goal_drafts")
        .select("id, role_title, business_id")
        .eq("id", source_id)
        .eq("business_id", business_id)
        .maybeSingle();

      if (gError || !goal) {
        return errorResponse(404, "NOT_FOUND", "Hiring goal not found");
      }
      roleTitle = goal.role_title || roleTitle;

      await serviceClient
        .from("hiring_goal_drafts")
        .update({ xima_hr_requested: true })
        .eq("id", source_id);
    }

    // Insert admin notification
    const notificationPayload = {
      business_id,
      company_name: bp.company_name,
      contact_email: bp.hr_contact_email || user.email,
      source,
      source_id,
      role_title: roleTitle,
      requested_at: new Date().toISOString(),
    };

    const { data: notification, error: notifError } = await serviceClient
      .from("admin_notifications")
      .insert({
        type: "xima_hr_request",
        severity: "info",
        payload: notificationPayload,
        status: "unread",
      })
      .select("id")
      .single();

    if (notifError) {
      console.error("[request-xima-hr] Failed to insert admin notification:", notifError.message);
    }

    console.log("[request-xima-hr] XIMA HR request created:", {
      business_id,
      source,
      source_id,
      role_title: roleTitle,
      notification_id: notification?.id,
    });

    // Enqueue email to XIMA admin
    const adminEmail = Deno.env.get("XIMA_ADMIN_EMAIL") || "hr@xima.ai";
    const idempotencyKey = `xima-hr-${source}-${source_id}-${Date.now()}`;

    try {
      await serviceClient
        .from("email_outbox")
        .insert({
          recipient_email: adminEmail,
          subject: `[XIMA HR] New request: ${roleTitle} — ${bp.company_name}`,
          html_body: `
            <h2>New XIMA HR Request</h2>
            <p><strong>Company:</strong> ${bp.company_name}</p>
            <p><strong>Role:</strong> ${roleTitle}</p>
            <p><strong>Source:</strong> ${source === "listing" ? "Job Listing" : "Hiring Goal"}</p>
            <p><strong>Contact:</strong> ${bp.hr_contact_email || user.email || "Not provided"}</p>
            <p><strong>Requested:</strong> ${new Date().toISOString()}</p>
          `,
          email_type: "transactional",
          status: "pending",
          idempotency_key: idempotencyKey,
          metadata: notificationPayload,
        });
      console.log("[request-xima-hr] Email enqueued to:", adminEmail);
    } catch (emailErr: any) {
      console.warn("[request-xima-hr] Email enqueue failed (non-blocking):", emailErr.message);
    }

    return jsonResponse({
      status: "requested",
      notification_id: notification?.id || null,
      message: `XIMA HR request submitted for "${roleTitle}". Our team will review within 24-48 hours.`,
    });
  } catch (err: any) {
    console.error("[request-xima-hr] Error:", err.message);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "An unexpected error occurred");
  }
});
