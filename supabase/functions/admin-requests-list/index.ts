/**
 * admin-requests-list — Admin-only unified requests queue.
 * Returns hiring_goal_drafts (xima_hr_requested), job_posts (xima_hr_requested),
 * and contact_sales_requests, normalized with handling status from xima_request_actions.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Source = "hiring_goal_drafts" | "job_posts" | "contact_sales_requests";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const svc = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    // Parallel fetches
    const [drafts, jobs, sales, actions] = await Promise.all([
      svc.from("hiring_goal_drafts")
        .select("id, business_id, role_title, status, created_at, xima_hr_requested")
        .eq("xima_hr_requested", true)
        .order("created_at", { ascending: false })
        .limit(200),
      svc.from("job_posts")
        .select("id, business_id, title, status, xima_hr_status, xima_hr_requested, xima_hr_requested_at, created_at")
        .eq("xima_hr_requested", true)
        .order("xima_hr_requested_at", { ascending: false, nullsFirst: false })
        .limit(200),
      svc.from("contact_sales_requests")
        .select("id, business_id, requester_name, requester_email, company_name, desired_tier, desired_seats, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      svc.from("xima_request_actions")
        .select("source_table, source_id, status, handled_by, handled_at, note, updated_at"),
    ]);

    if (drafts.error) return json({ error: drafts.error.message }, 500);
    if (jobs.error) return json({ error: jobs.error.message }, 500);
    if (sales.error) return json({ error: sales.error.message }, 500);
    if (actions.error) return json({ error: actions.error.message }, 500);

    const actionMap = new Map<string, any>();
    for (const a of actions.data || []) {
      actionMap.set(`${a.source_table}:${a.source_id}`, a);
    }

    const normalize = (source: Source, id: string, base: Record<string, any>) => {
      const a = actionMap.get(`${source}:${id}`);
      return {
        source,
        source_id: id,
        handling_status: a?.status || "pending",
        handled_by: a?.handled_by || null,
        handled_at: a?.handled_at || null,
        note: a?.note || null,
        ...base,
      };
    };

    const items: any[] = [];

    for (const d of drafts.data || []) {
      items.push(normalize("hiring_goal_drafts", d.id, {
        business_id: d.business_id,
        title: d.role_title || "(senza titolo)",
        origin_status: d.status,
        created_at: d.created_at,
        extra: { role_title: d.role_title },
      }));
    }

    for (const j of jobs.data || []) {
      items.push(normalize("job_posts", j.id, {
        business_id: j.business_id,
        title: j.title || "(senza titolo)",
        origin_status: j.xima_hr_status || j.status,
        created_at: j.xima_hr_requested_at || j.created_at,
        extra: { xima_hr_status: j.xima_hr_status, post_status: j.status },
      }));
    }

    for (const s of sales.data || []) {
      items.push(normalize("contact_sales_requests", s.id, {
        business_id: s.business_id,
        title: s.company_name || s.requester_name || s.requester_email || "(richiesta sales)",
        origin_status: s.status,
        created_at: s.created_at,
        extra: {
          requester_name: s.requester_name,
          requester_email: s.requester_email,
          company_name: s.company_name,
          desired_tier: s.desired_tier,
          desired_seats: s.desired_seats,
          message: s.message,
        },
      }));
    }

    items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

    const counts = items.reduce((acc, it) => {
      acc[it.handling_status] = (acc[it.handling_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return json({ items, counts, total: items.length });
  } catch (e) {
    console.error("[admin-requests-list]", e instanceof Error ? e.message : e);
    return json({ error: "Internal error" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
