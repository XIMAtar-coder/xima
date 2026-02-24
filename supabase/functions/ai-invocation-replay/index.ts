/**
 * AI Invocation Replay — Admin-Only Query Endpoint
 * 
 * Feature-flagged, admin-only endpoint to query AI invocation logs
 * for drift detection, debugging, and compliance audits.
 * 
 * No PII is exposed — only hashed prompts and redacted summaries.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Feature flag — set to false to disable entirely
const REPLAY_ENABLED = true;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!REPLAY_ENABLED) {
    return new Response(
      JSON.stringify({ error: "Replay endpoint is disabled", error_code: "FEATURE_DISABLED" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Auth: require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required", error_code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user identity via anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", error_code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin check via has_role function
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required", error_code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const functionName = url.searchParams.get("function_name");
    const status = url.searchParams.get("status");
    const correlationId = url.searchParams.get("correlation_id");
    const promptHash = url.searchParams.get("prompt_hash");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Query with service role (bypasses RLS)
    let query = serviceClient
      .from("ai_invocation_log")
      .select("*")
      .order("invoked_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (functionName) query = query.eq("function_name", functionName);
    if (status) query = query.eq("status", status);
    if (correlationId) query = query.eq("correlation_id", correlationId);
    if (promptHash) query = query.eq("prompt_hash", promptHash);

    const { data, error, count } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, error_code: "QUERY_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Summary stats
    const { data: stats } = await serviceClient
      .from("ai_invocation_log")
      .select("status")
      .gte("invoked_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const last24h = {
      total: stats?.length || 0,
      success: stats?.filter(s => s.status === "success").length || 0,
      error: stats?.filter(s => s.status === "error").length || 0,
      rate_limited: stats?.filter(s => s.status === "rate_limited").length || 0,
    };

    return new Response(
      JSON.stringify({
        invocations: data,
        pagination: { limit, offset },
        summary_last_24h: last24h,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("[ai-invocation-replay] Error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: "Internal error", error_code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
