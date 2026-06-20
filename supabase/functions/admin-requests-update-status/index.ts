/**
 * admin-requests-update-status — Admin-only: upsert handling status into
 * xima_request_actions and write an audit_events row. Never writes to
 * native business tables (job_posts / contact_sales_requests / hiring_goal_drafts).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_SOURCES = new Set(["hiring_goal_drafts", "job_posts", "contact_sales_requests"]);
const VALID_STATUSES = new Set(["pending", "in_progress", "done", "dismissed"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const adminUserId = user.id;
    const svc = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: adminUserId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

    const source = String(body?.source || "");
    const sourceId = String(body?.source_id || "");
    const newStatus = String(body?.new_status || "");
    const note = body?.note ? String(body.note).slice(0, 2000) : null;

    if (!VALID_SOURCES.has(source)) return json({ error: "Invalid source" }, 400);
    if (!UUID_RE.test(sourceId)) return json({ error: "Invalid source_id" }, 400);
    if (!VALID_STATUSES.has(newStatus)) return json({ error: "Invalid new_status" }, 400);

    // Read previous status (if any) for audit
    const { data: prev } = await svc
      .from("xima_request_actions")
      .select("status")
      .eq("source_table", source)
      .eq("source_id", sourceId)
      .maybeSingle();
    const fromStatus = prev?.status || "pending";

    const { data: upserted, error: upsertErr } = await svc
      .from("xima_request_actions")
      .upsert(
        {
          source_table: source,
          source_id: sourceId,
          status: newStatus,
          handled_by: adminUserId,
          handled_at: new Date().toISOString(),
          note,
        },
        { onConflict: "source_table,source_id" },
      )
      .select()
      .single();

    if (upsertErr) return json({ error: upsertErr.message }, 500);

    // Audit — service role bypasses RLS; log any failure explicitly
    const { error: auditErr } = await svc.from("audit_events").insert({
      actor_type: "admin",
      actor_id: adminUserId,
      action: "request.status_changed",
      entity_type: source,
      entity_id: sourceId,
      metadata: {
        source,
        source_id: sourceId,
        from_status: fromStatus,
        to_status: newStatus,
        note,
      },
    });
    const auditError = auditErr
      ? {
          code: (auditErr as any).code,
          message: auditErr.message,
          details: (auditErr as any).details,
          hint: (auditErr as any).hint,
        }
      : null;
    if (auditErr) {
      console.error("AUDIT_FAIL", auditError);
    }

    return json({ ok: true, record: upserted, audit_error: auditError });
  } catch (e) {
    console.error("[admin-requests-update-status]", e instanceof Error ? e.message : e);
    return json({ error: "Internal error" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
