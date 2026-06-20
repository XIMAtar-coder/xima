// poc-embed — Admin-only. Builds source documents for candidates or goals,
// embeds them via Lovable AI Gateway (gemini-embedding-001, dim=1536), and
// upserts into poc_*_embeddings tables. Idempotent via source_hash.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";
import { buildCandidateDoc, buildGoalDoc, formatPillars } from "../_shared/pocDocBuilder.ts";
import { truncateToTokens, sha256Hex } from "../_shared/pocTruncate.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "google/gemini-embedding-001";
const DIMS = 1536;

type EmbedResult = { embedding: number[]; tokens: number; taskType: string };

async function callGateway(input: string, taskType: string, apiKey: string): Promise<EmbedResult> {
  const body: any = { model: MODEL, input, dimensions: DIMS };
  if (taskType) body.task_type = taskType;
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err: any = new Error(`gateway ${res.status}: ${txt.slice(0, 400)}`);
    err.status = res.status;
    err.bodyText = txt;
    throw err;
  }
  const json = await res.json();
  const embedding = json?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) throw new Error("invalid embedding payload");
  return {
    embedding,
    tokens: json?.usage?.prompt_tokens ?? 0,
    taskType,
  };
}

async function embedWithFallback(input: string, preferredTask: string, apiKey: string): Promise<EmbedResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callGateway(input, preferredTask, apiKey);
    } catch (err: any) {
      // task_type rejected → fallback once to SEMANTIC_SIMILARITY
      if (err?.status === 400 && /task_type/i.test(err.bodyText || "")) {
        return await callGateway(input, "SEMANTIC_SIMILARITY", apiKey);
      }
      if (err?.status === 429 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("embed retries exhausted");
}

function toPgvector(arr: number[]): string {
  // pgvector text format: '[v1,v2,...]'
  return "[" + arr.join(",") + "]";
}

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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return errorResponse(500, "MISSING_KEY", "LOVABLE_API_KEY not configured");

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return unauthorizedResponse("Auth required");

    const serviceClient = createClient(supabaseUrl, serviceKey);
    if (!(await isAdmin(serviceClient, user.id))) return forbiddenResponse("Admin only");

    let body: any;
    try { body = await req.json(); } catch { return errorResponse(400, "INVALID_INPUT", "Invalid JSON"); }
    const scope = String(body?.scope || "");
    const candidateLimit = Math.min(500, Math.max(1, Number(body?.candidate_limit ?? 80)));
    const candidateIds: string[] | undefined = Array.isArray(body?.candidate_ids) ? body.candidate_ids : undefined;
    const goalIds: string[] | undefined = Array.isArray(body?.goal_ids) ? body.goal_ids : undefined;

    if (scope !== "candidates" && scope !== "goals") {
      return errorResponse(400, "INVALID_INPUT", "scope must be 'candidates' or 'goals'");
    }

    const results = { processed: 0, embedded: 0, skipped: 0, errors: [] as Array<{ id: string; error: string }> };

    if (scope === "candidates") {
      // Resolve target user_ids: explicit list OR sample.
      let targetIds: string[] = [];
      if (candidateIds && candidateIds.length) {
        targetIds = candidateIds.slice(0, 500);
      } else {
        const { data: contextUsers } = await serviceClient
          .from("user_ai_context")
          .select("user_id")
          .limit(2000);
        const { data: arUsers } = await serviceClient
          .from("assessment_results")
          .select("user_id")
          .limit(2000);
        const seen = new Set<string>();
        for (const r of [...(contextUsers || []), ...(arUsers || [])]) {
          if (r?.user_id && !seen.has(r.user_id)) seen.add(r.user_id);
        }
        const candidateUserIds = Array.from(seen);
        if (candidateUserIds.length === 0) {
          return jsonResponse({ ok: true, scope, results });
        }
        // Order by profiles.updated_at desc and take candidate_limit
        const { data: ordered } = await serviceClient
          .from("profiles")
          .select("user_id, updated_at")
          .in("user_id", candidateUserIds)
          .order("updated_at", { ascending: false })
          .limit(candidateLimit);
        targetIds = (ordered || []).map((r: any) => r.user_id);
      }

      // Process sequentially in small batches (5 at a time, 250ms gap)
      for (let i = 0; i < targetIds.length; i++) {
        const uid = targetIds[i];
        try {
          const [profileRes, ctxRes, arRes, cvAnRes, idAnRes, openRes] = await Promise.all([
            serviceClient.from("profiles").select("user_id, ximatar_name, ximatar_level, pillar_scores, pillars, industry_preferences, work_preference, desired_locations").eq("user_id", uid).maybeSingle(),
            serviceClient.from("user_ai_context").select("cv_credentials_summary, cv_identity_summary, assessment_summary, challenge_history_summary, growth_summary, matching_preferences, l3_summary").eq("user_id", uid).maybeSingle(),
            serviceClient.from("assessment_results").select("id, total_score, pillars, top3, rationale, sentiment, computed_at").eq("user_id", uid).order("computed_at", { ascending: false }).limit(1).maybeSingle(),
            serviceClient.from("assessment_cv_analysis").select("summary, strengths, soft_skills, ximatar_suggestions").eq("user_id", uid).maybeSingle(),
            serviceClient.from("cv_identity_analysis").select("cv_archetype_primary, cv_archetype_secondary, cv_archetype_explanation, tension_narrative, cv_qualified_roles, archetype_aligned_roles, growth_bridge_roles").eq("user_id", uid).maybeSingle(),
            serviceClient.from("assessment_open_responses").select("answer, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(3),
          ]);

          // pillar fallback if profile.pillar_scores empty
          let pillarFallback: Record<string, number> | null = null;
          const pf = formatPillars(profileRes.data?.pillar_scores) || formatPillars(profileRes.data?.pillars);
          if (!pf && arRes.data?.id) {
            const { data: ps } = await serviceClient
              .from("pillar_scores")
              .select("pillar, score")
              .eq("assessment_result_id", arRes.data.id);
            if (Array.isArray(ps)) {
              pillarFallback = {};
              for (const r of ps) pillarFallback[r.pillar] = Number(r.score);
            }
          }

          const doc = buildCandidateDoc({
            profile: profileRes.data,
            user_ai_context: ctxRes.data,
            latest_assessment_result: arRes.data,
            pillar_scores_fallback: pillarFallback,
            cv_analysis: cvAnRes.data,
            identity_analysis: idAnRes.data,
            open_responses: openRes.data,
          });

          const sourceText = truncateToTokens(doc, 2000);
          const sourceHash = await sha256Hex(sourceText);

          // Idempotency check
          const { data: existing } = await serviceClient
            .from("poc_candidate_embeddings")
            .select("id, source_hash")
            .eq("candidate_user_id", uid)
            .maybeSingle();

          if (existing && existing.source_hash === sourceHash) {
            results.skipped++;
            results.processed++;
            continue;
          }

          const emb = await embedWithFallback(sourceText, "RETRIEVAL_DOCUMENT", lovableKey);

          const payload = {
            candidate_user_id: uid,
            source_text: sourceText,
            source_hash: sourceHash,
            embedding: toPgvector(emb.embedding),
            model: MODEL,
            dimensions: DIMS,
            token_count: emb.tokens,
            task_type: emb.taskType,
            updated_at: new Date().toISOString(),
          };

          const { error: upErr } = await serviceClient
            .from("poc_candidate_embeddings")
            .upsert(payload, { onConflict: "candidate_user_id" });
          if (upErr) throw upErr;
          results.embedded++;
          results.processed++;
        } catch (err: any) {
          console.error(`[poc-embed] candidate ${uid} error:`, err?.message);
          results.errors.push({ id: uid, error: String(err?.message || err) });
          results.processed++;
        }
        if ((i + 1) % 5 === 0) await new Promise((r) => setTimeout(r, 250));
      }
    } else {
      // GOALS
      let targetGoalIds: string[] = [];
      if (goalIds && goalIds.length) {
        targetGoalIds = goalIds.slice(0, 200);
      } else {
        const { data: g } = await serviceClient
          .from("hiring_goal_drafts")
          .select("id, updated_at, status")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(50);
        targetGoalIds = (g || []).map((r: any) => r.id);
      }

      for (let i = 0; i < targetGoalIds.length; i++) {
        const gid = targetGoalIds[i];
        try {
          const { data: goal } = await serviceClient
            .from("hiring_goal_drafts")
            .select("id, business_id, role_title, task_description, experience_level, work_model, country, city_region, function_area")
            .eq("id", gid)
            .maybeSingle();
          if (!goal) {
            results.errors.push({ id: gid, error: "goal not found" });
            results.processed++;
            continue;
          }

          const [reqRes, chRes, jpRes, bizRes, coRes] = await Promise.all([
            serviceClient.from("hiring_goal_requirements").select("*").eq("hiring_goal_id", gid).maybeSingle(),
            serviceClient.from("business_challenges").select("title, description, target_skills, success_criteria").eq("business_id", goal.business_id).limit(5),
            serviceClient.from("job_posts").select("description, responsibilities, requirements_must, requirements_nice, seniority, department").eq("business_id", goal.business_id).limit(5),
            serviceClient.from("business_profiles").select("team_culture, hiring_approach, manual_industry, snapshot_industry").eq("user_id", goal.business_id).maybeSingle(),
            serviceClient.from("company_profiles").select("values, ideal_traits, recommended_ximatars").eq("company_id", goal.business_id).maybeSingle(),
          ]);

          const doc = buildGoalDoc({
            goal,
            requirements: reqRes.data,
            challenges: chRes.data,
            job_posts: jpRes.data,
            business_profile: bizRes.data,
            company_profile: coRes.data,
          });

          const sourceText = truncateToTokens(doc, 2000);
          const sourceHash = await sha256Hex(sourceText);

          const { data: existing } = await serviceClient
            .from("poc_goal_embeddings")
            .select("id, source_hash")
            .eq("hiring_goal_id", gid)
            .maybeSingle();

          if (existing && existing.source_hash === sourceHash) {
            results.skipped++;
            results.processed++;
            continue;
          }

          const emb = await embedWithFallback(sourceText, "RETRIEVAL_QUERY", lovableKey);

          const payload = {
            hiring_goal_id: gid,
            source_text: sourceText,
            source_hash: sourceHash,
            embedding: toPgvector(emb.embedding),
            model: MODEL,
            dimensions: DIMS,
            token_count: emb.tokens,
            task_type: emb.taskType,
            updated_at: new Date().toISOString(),
          };

          const { error: upErr } = await serviceClient
            .from("poc_goal_embeddings")
            .upsert(payload, { onConflict: "hiring_goal_id" });
          if (upErr) throw upErr;
          results.embedded++;
          results.processed++;
        } catch (err: any) {
          console.error(`[poc-embed] goal ${gid} error:`, err?.message);
          results.errors.push({ id: gid, error: String(err?.message || err) });
          results.processed++;
        }
        if ((i + 1) % 5 === 0) await new Promise((r) => setTimeout(r, 250));
      }
    }

    return jsonResponse({ ok: true, scope, results });
  } catch (err: any) {
    console.error("[poc-embed] FATAL:", err?.message, err?.stack);
    return errorResponse(500, "INTERNAL_ERROR", String(err?.message || "internal error"));
  }
});
