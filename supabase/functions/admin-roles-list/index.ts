/**
 * admin-roles-list — Admin-only listing of users with their roles.
 * Server-side search + pagination via SECURITY DEFINER RPC.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  search: z.string().max(200).optional().default(""),
  page: z.number().int().min(0).optional().default(0),
  page_size: z.number().int().min(1).max(100).optional().default(25),
});

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

    const svc = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const { search, page, page_size } = parsed.data;

    const [listRes, countRes] = await Promise.all([
      svc.rpc("admin_list_users_with_roles", {
        _admin: user.id,
        _search: search,
        _limit: page_size + 1,
        _offset: page * page_size,
      }),
      svc.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    ]);

    if (listRes.error) return json({ error: listRes.error.message }, 500);

    const rows = (listRes.data || []) as any[];
    const has_more = rows.length > page_size;
    const users = has_more ? rows.slice(0, page_size) : rows;
    const admin_count = countRes.count ?? 0;

    return json({
      users,
      page,
      page_size,
      has_more,
      admin_count,
      current_admin_id: user.id,
    });
  } catch (e) {
    console.error("[admin-roles-list]", e instanceof Error ? e.message : e);
    return json({ error: "Internal error" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
