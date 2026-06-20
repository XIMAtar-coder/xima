// poc-match — Admin-only. Runs semantic search for a goal in 'rerank' or
// 'discovery' mode. Calls the SECURITY DEFINER RPC poc_search_candidates
// via service-role (RPC is revoked from anon/authenticated).

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";

async function isAdmin(serviceClient: any, userId: string): Promise<boolean> {
  const { data } = await serviceClient.from("user_roles").select("role").eq("user_id", userId);
  return Array.isArray(data) && data.some((r: any) => r.role === "admin");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Missing auth");
    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return unauthorizedResponse("Auth required");

    const serviceClient = createClient(supabaseUrl, serviceKey);
    if (!(await isAdmin(serviceClient, user.id))) return forbiddenResponse("Admin only");

    let body: any;
    try { body = await req.json(); } catch { return errorResponse(400, "INVALID_INPUT", "Invalid JSON"); }
    const goalId: string = body?.hiring_goal_id;
    const mode: string = body?.mode === "discovery" ? "discovery" : "rerank";
    const k: number = Math.min(50, Math.max(1, Number(body?.k ?? 10)));
    const candidateIds: string[] | null = Array.isArray(body?.candidate_ids) && body.candidate_ids.length
      ? body.candidate_ids
      : null;
    const baselineResults: Array<{ candidate_user_id: string; total_score?: number }> = Array.isArray(body?.baseline_results)
      ? body.baseline_results
      : [];
    const saveRun: boolean = body?.save_run !== false;

    if (!goalId) return errorResponse(400, "INVALID_INPUT", "hiring_goal_id required");

    // In rerank mode, candidate_ids must be provided (same-universe compare).
    if (mode === "rerank" && (!candidateIds || candidateIds.length === 0)) {
      return errorResponse(400, "INVALID_INPUT", "rerank mode requires candidate_ids");
    }

    // Verify goal embedding exists
    const { data: ge } = await serviceClient
      .from("poc_goal_embeddings")
      .select("id")
      .eq("hiring_goal_id", goalId)
      .maybeSingle();
    if (!ge) return errorResponse(404, "GOAL_NOT_EMBEDDED", "Goal has no embedding yet — run poc-embed scope=goals first");

    // Call RPC via service role
    const { data: matches, error: rpcErr } = await serviceClient.rpc("poc_search_candidates", {
      p_goal_id: goalId,
      p_k: k,
      p_candidate_ids: candidateIds,
    });
    if (rpcErr) {
      console.error("[poc-match] rpc error:", rpcErr);
      return errorResponse(500, "RPC_ERROR", rpcErr.message);
    }

    const top = (matches || []) as Array<{ candidate_user_id: string; similarity: number }>;

    // Overlap / novelty vs baseline (rerank only meaningful for overlap; both shown for completeness)
    const baselineIds = new Set(baselineResults.map((r) => r.candidate_user_id));
    const topIds = new Set(top.map((r) => r.candidate_user_id));
    const overlap = [...topIds].filter((id) => baselineIds.has(id)).length;
    const novelty = mode === "discovery"
      ? [...topIds].filter((id) => !baselineIds.has(id)).length
      : 0;

    // ---- SANITY columns (no impact on ranking) ----
    const allIds = Array.from(new Set([
      ...top.map((r) => r.candidate_user_id),
      ...baselineResults.map((r) => r.candidate_user_id),
    ]));

    const { data: goalRow } = await serviceClient
      .from("hiring_goal_drafts")
      .select("country, city_region, work_model")
      .eq("id", goalId)
      .maybeSingle();
    const goalCountry = (goalRow?.country || "").toString().trim();
    const goalRegion = (goalRow?.city_region || "").toString().trim();
    const goalWork = (goalRow?.work_model || "").toString().trim().toLowerCase();
    const goal_location = [goalRegion, goalCountry].filter(Boolean).join(", ");

    const sanity: Record<string, any> = {};
    if (allIds.length) {
      const [{ data: profs }, { data: assess }, { data: embs }] = await Promise.all([
        serviceClient.from("profiles").select("user_id, desired_locations, work_preference").in("user_id", allIds),
        serviceClient.from("assessment_results").select("user_id, total_score, computed_at").in("user_id", allIds).order("computed_at", { ascending: false }),
        serviceClient.from("poc_candidate_embeddings").select("candidate_user_id, source_text").in("candidate_user_id", allIds),
      ]);

      const profMap = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
      const scoreMap = new Map<string, number>();
      for (const a of (assess || [])) {
        if (!scoreMap.has(a.user_id) && a.total_score != null) scoreMap.set(a.user_id, Number(a.total_score));
      }
      const docMap = new Map<string, number>((embs || []).map((e: any) => [e.candidate_user_id, (e.source_text || "").length]));

      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const goalRegionN = norm(goalRegion);
      const goalCountryN = norm(goalCountry);

      for (const id of allIds) {
        const p = profMap.get(id) || {};
        const locs = Array.isArray(p.desired_locations) ? p.desired_locations : [];
        const candLocLabel = locs.map((l: any) => [l?.city, l?.region].filter(Boolean).join("/")).filter(Boolean).join(" | ");
        const haystack = norm(JSON.stringify(locs || ""));

        let location_match: "same_region" | "same_country" | "different" | "unknown" = "unknown";
        if (locs.length === 0 || !goal_location) {
          location_match = "unknown";
        } else if (goalRegionN && haystack.includes(goalRegionN)) {
          location_match = "same_region";
        } else if (goalCountryN && haystack.includes(goalCountryN)) {
          location_match = "same_country";
        } else {
          location_match = "different";
        }

        const candWork = (p.work_preference || "").toString().trim().toLowerCase();
        let work_match: "match" | "mismatch" | "unknown" = "unknown";
        if (candWork && goalWork) work_match = candWork === goalWork ? "match" : "mismatch";

        sanity[id] = {
          assessment_total: scoreMap.get(id) ?? null,
          candidate_location: candLocLabel || null,
          candidate_work_preference: candWork || null,
          goal_location: goal_location || null,
          goal_work_model: goalWork || null,
          location_match,
          work_match,
          doc_chars: docMap.get(id) ?? null,
        };
      }
    }

    let runId: string | null = null;
    if (saveRun) {
      const { data: run } = await serviceClient
        .from("poc_match_runs")
        .insert({
          hiring_goal_id: goalId,
          mode,
          k,
          candidate_ids_count: candidateIds?.length ?? null,
          top_results: top,
          baseline_results: baselineResults,
          overlap_count: overlap,
          novelty_count: novelty,
          created_by: user.id,
        })
        .select("id")
        .single();
      runId = run?.id ?? null;
    }

    return jsonResponse({
      ok: true,
      mode,
      k,
      results: top,
      overlap_count: overlap,
      novelty_count: novelty,
      sanity,
      goal_location,
      goal_work_model: goalWork || null,
      run_id: runId,
    });
  } catch (err: any) {
    console.error("[poc-match] FATAL:", err?.message, err?.stack);
    return errorResponse(500, "INTERNAL_ERROR", String(err?.message || "internal error"));
  }
});
