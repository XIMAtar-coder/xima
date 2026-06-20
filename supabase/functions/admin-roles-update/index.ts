/**
 * admin-roles-update — Admin-only grant/revoke role on user_roles.
 * Grant: INSERT ... ON CONFLICT DO NOTHING (idempotent).
 * Revoke: rpc admin_revoke_role (anti-race + anti-lockout).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  target_user_id: z.string().uuid(),
  role: z.enum(["admin", "user", "business", "operator"]),
  op: z.enum(["grant", "revoke"]),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlation_id = crypto.randomUUID();

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

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { target_user_id, role, op } = parsed.data;

    // Verify target exists
    const { data: target, error: tErr } = await svc.auth.admin.getUserById(target_user_id);
    if (tErr || !target?.user) return json({ error: "Target user not found" }, 404);

    let last_audit_error: Record<string, unknown> | null = null;
    const audit = async (action: string, metadata: Record<string, unknown> = {}) => {
      const payload = {
        actor_type: "admin",
        actor_id: user.id,
        action,
        entity_type: "user_roles",
        entity_id: target_user_id,
        correlation_id,
        metadata: { role, target_user_id, ...metadata },
      };
      // IMPORTANT: audit_events only allows service_role writes. Never use the JWT client here.
      const { error } = await svc.from("audit_events").insert(payload);
      if (error) {
        last_audit_error = {
          action,
          correlation_id,
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
        };
        console.error("AUDIT_FAIL", last_audit_error);
      } else {
        console.log("[admin-roles-update] audit inserted", { action, correlation_id, target_user_id });
      }
    };

    if (op === "grant") {
      const { data, error } = await svc
        .from("user_roles")
        .insert({ user_id: target_user_id, role })
        .select("id");
      if (error) {
        // unique violation = already has role → noop
        if ((error as any).code === "23505") {
          return json({ ok: true, noop: true, correlation_id });
        }
        return json({ error: error.message }, 500);
      }
      if (data && data.length > 0) {
        await audit("role.granted");
      }
      return json({ ok: true, noop: !data || data.length === 0, correlation_id, audit_error: last_audit_error });
    }

    // revoke
    // self-lockout guard: admin removing own 'admin' role
    if (role === "admin" && target_user_id === user.id) {
      const { count } = await svc
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return json({ error: "SELF_LOCKOUT", message: "Non puoi rimuovere il tuo ultimo ruolo admin" }, 403);
      }
    }

    const { data: rpcData, error: rpcErr } = await svc.rpc("admin_revoke_role", {
      _admin: user.id,
      _target: target_user_id,
      _role: role,
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("LAST_ADMIN")) {
        return json({ error: "LAST_ADMIN", message: "Impossibile rimuovere l'ultimo admin" }, 403);
      }
      if (msg.includes("LOCKOUT_DETECTED")) {
        await audit("role.revoked.lockout_detected", { severity: "critical" });
        return json({ error: "LOCKOUT_DETECTED", audit_error: last_audit_error }, 500);
      }
      if (msg.includes("FORBIDDEN")) {
        return json({ error: "Admin access required" }, 403);
      }
      return json({ error: msg }, 500);
    }

    const deleted = (rpcData as any)?.deleted ?? 0;
    if (deleted > 0) await audit("role.revoked");
    return json({ ok: true, noop: deleted === 0, correlation_id, audit_error: last_audit_error });
  } catch (e) {
    console.error("[admin-roles-update]", e instanceof Error ? e.message : e);
    return json({ error: "Internal error" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
