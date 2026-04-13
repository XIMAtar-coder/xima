import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  trial: 10,
  starter: 50,
  growth: 200,
  enterprise: 999999,
};

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Auth required");
    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !user) return unauthorizedResponse("Auth required");

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { filters = {}, page = 0, page_size = 20 } = body;

    console.log("[browse-pool] Filters:", JSON.stringify(filters), "Page:", page);

    // Resolve business plan tier
    const { data: entitlement } = await serviceClient
      .from("business_entitlements")
      .select("plan_tier")
      .eq("business_id", user.id)
      .maybeSingle();

    const plan = (entitlement?.plan_tier || "free").toLowerCase();
    const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // DIAGNOSTIC: count profiles by identity column to debug empty results
    const [totalRes, ximatarRes, ximatarIdRes, pillarRes] = await Promise.all([
      serviceClient.from("profiles").select("*", { count: "exact", head: true }),
      serviceClient.from("profiles").select("*", { count: "exact", head: true }).not("ximatar", "is", null),
      serviceClient.from("profiles").select("*", { count: "exact", head: true }).not("ximatar_id", "is", null),
      serviceClient.from("profiles").select("*", { count: "exact", head: true }).not("pillar_scores", "is", null),
    ]);

    console.log("[browse-pool] DIAGNOSTIC:", {
      totalProfiles: totalRes.count,
      withXimatar: ximatarRes.count,
      withXimatarId: ximatarIdRes.count,
      withPillarScores: pillarRes.count,
    });

    // Build query — profiles table has `ximatar` (enum) and `ximatar_id` (uuid) but NOT `ximatar_archetype`
    let query = serviceClient
      .from("profiles")
      .select(
        `user_id, ximatar, ximatar_id, ximatar_name, ximatar_level,
         pillar_scores,
         desired_locations, work_preference, willing_to_relocate,
         availability_date, industry_preferences,
         profile_completed, updated_at, profiling_opt_out`,
        { count: "exact" }
      )
      // Match if ANY identity or assessment signal is set (maximally permissive)
      .or("ximatar.not.is.null,ximatar_id.not.is.null,ximatar_name.not.is.null,pillar_scores.not.is.null")
      .or("profiling_opt_out.is.null,profiling_opt_out.eq.false");

    // Apply archetype filter — only filter on `ximatar` column (it's the enum)
    if (filters.archetype && filters.archetype !== 'all') {
      query = query.eq("ximatar", filters.archetype);
    }

    // Apply work mode filter
    if (filters.work_mode) {
      query = query.eq("work_preference", filters.work_mode);
    }

    // Apply XIMAtar level filter
    if (filters.min_level && filters.min_level > 1) {
      query = query.gte("ximatar_level", filters.min_level);
    }

    query = query.order("updated_at", { ascending: false });

    // Plan-limited pagination
    const effectiveLimit = Math.min(page_size, planLimit - page * page_size);
    if (effectiveLimit <= 0) {
      return jsonResponse({
        candidates: [],
        total_count: 0,
        plan_limit: planLimit,
        is_restricted: true,
        page,
        page_size,
      });
    }

    query = query.range(page * page_size, page * page_size + effectiveLimit - 1);

    const { data: candidates, error: queryError, count } = await query;
    if (queryError) {
      console.error("[browse-pool] Query error:", queryError.message, queryError.details);
      return jsonResponse({
        candidates: [],
        total_count: 0,
        plan_limit: planLimit,
        plan,
        is_restricted: false,
        error: "query_failed",
        error_message: queryError.message,
      });
    }

    console.log(`[browse-pool] Found ${count} total, returning ${candidates?.length || 0}`);

    const candidateIds = (candidates || []).map((c: any) => c.user_id);

    // Parallel enrichment queries
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    const [engagementRes, trajectoryRes, credRes] = await Promise.all([
      candidateIds.length > 0
        ? serviceClient
            .from("feed_items")
            .select("user_id")
            .in("user_id", candidateIds)
            .gte("created_at", thirtyDaysAgo)
        : Promise.resolve({ data: [] }),
      candidateIds.length > 0
        ? serviceClient
            .from("pillar_trajectory_log")
            .select("user_id, drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta")
            .in("user_id", candidateIds)
            .gte("created_at", ninetyDaysAgo)
            .limit(500)
        : Promise.resolve({ data: [] }),
      filters.seniority || filters.industry
        ? serviceClient
            .from("cv_credentials")
            .select("user_id, seniority_level, industries_worked")
            .in("user_id", candidateIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build engagement map
    const engagementCounts: Record<string, number> = {};
    ((engagementRes as any).data || []).forEach((e: any) => {
      engagementCounts[e.user_id] = (engagementCounts[e.user_id] || 0) + 1;
    });

    // Build trajectory map
    const userDeltas: Record<string, number> = {};
    ((trajectoryRes as any).data || []).forEach((t: any) => {
      const total = (t.drive_delta || 0) + (t.computational_power_delta || 0) +
        (t.communication_delta || 0) + (t.creativity_delta || 0) + (t.knowledge_delta || 0);
      userDeltas[t.user_id] = (userDeltas[t.user_id] || 0) + total;
    });

    // Build seniority/industry map
    const credMap: Record<string, { seniority: string; industries: string[] }> = {};
    ((credRes as any).data || []).forEach((c: any) => {
      credMap[c.user_id] = { seniority: c.seniority_level || "", industries: c.industries_worked || [] };
    });

    // Resolve ximatar_id UUIDs to archetype names if needed
    const uuidXimatarIds = (candidates || [])
      .filter((c: any) => !c.ximatar && c.ximatar_id && isUuid(c.ximatar_id))
      .map((c: any) => c.ximatar_id);

    let ximatarLookup: Record<string, string> = {};
    if (uuidXimatarIds.length > 0) {
      const { data: ximatarRows } = await serviceClient
        .from("ximatars")
        .select("id, animal")
        .in("id", uuidXimatarIds);
      (ximatarRows || []).forEach((x: any) => {
        ximatarLookup[x.id] = x.animal || "chameleon";
      });
    }

    // Transform to anonymous results with client-side filtering
    const anonymousCandidates = (candidates || []).map((c: any) => {
      const pillarScores = c.pillar_scores || {};

      // Resolve archetype: prefer `ximatar` enum, then lookup UUID, then ximatar_name
      let ximatarKey = (c.ximatar || "").toString().toLowerCase().trim();
      if (!ximatarKey && c.ximatar_id) {
        if (isUuid(c.ximatar_id)) {
          ximatarKey = (ximatarLookup[c.ximatar_id] || c.ximatar_name || "chameleon").toLowerCase().trim();
        } else {
          ximatarKey = c.ximatar_id.toLowerCase().trim();
        }
      }
      if (!ximatarKey) ximatarKey = (c.ximatar_name || "chameleon").toLowerCase().trim();

      // Engagement level
      const engCount = engagementCounts[c.user_id] || 0;
      const engLevel = engCount >= 20 ? "highly_active" : engCount >= 10 ? "active" : engCount >= 3 ? "moderate" : "low";

      // Trajectory trend
      const delta = userDeltas[c.user_id] || 0;
      const trajectoryTrend = delta >= 5 ? "growing_fast" : delta >= 2 ? "growing" : null;

      // Availability
      let availability = "unknown";
      if (c.availability_date) {
        const days = (new Date(c.availability_date).getTime() - Date.now()) / 86400000;
        availability = days <= 0 ? "immediately" : days <= 30 ? "1_month" : "3_months";
      }

      // Apply engagement filter
      if (filters.engagement && engLevel !== filters.engagement) return null;

      // Apply seniority filter
      if (filters.seniority && credMap[c.user_id]) {
        if (credMap[c.user_id].seniority !== filters.seniority) return null;
      }

      // Apply location filter
      if (filters.location) {
        const loc = filters.location.toLowerCase();
        const desiredLocs = (c.desired_locations || []) as any[];
        const match = Array.isArray(desiredLocs) && desiredLocs.some((l: any) =>
          (l?.city || "").toLowerCase().includes(loc) ||
          (l?.country || "").toLowerCase().includes(loc)
        );
        if (!match && c.work_preference !== "remote") return null;
      }

      // Apply industry filter
      if (filters.industry && credMap[c.user_id]) {
        const hasMatch = credMap[c.user_id].industries.some((ind: string) =>
          ind.toLowerCase().includes(filters.industry.toLowerCase())
        );
        if (!hasMatch) return null;
      }

      // Apply availability filter
      if (filters.availability) {
        if (filters.availability === "immediately" && availability !== "immediately") return null;
        if (filters.availability === "1_month" && availability === "3_months") return null;
      }

      return {
        id: c.user_id,
        ximatar_archetype: ximatarKey,
        ximatar_level: c.ximatar_level || 1,
        pillar_scores: pillarScores,
        work_preference: c.work_preference || null,
        availability,
        engagement_level: engLevel,
        trajectory_trend: trajectoryTrend,
        profile_completed: c.profile_completed || false,
      };
    }).filter(Boolean);

    // Inject synthetic placeholders if pool is too small (ensures pool never looks empty)
    const SYNTHETIC_THRESHOLD = 12;
    const ALL_ARCHETYPES = ['lion', 'owl', 'dolphin', 'fox', 'bear', 'bee', 'wolf', 'cat', 'parrot', 'elephant', 'horse', 'chameleon'];

    if (anonymousCandidates.length < SYNTHETIC_THRESHOLD) {
      const existingArchetypes = new Set(anonymousCandidates.map((c: any) => c.ximatar_archetype));
      const needed = SYNTHETIC_THRESHOLD - anonymousCandidates.length;
      const available = ALL_ARCHETYPES.filter(a => !existingArchetypes.has(a));

      const synthetics = available.slice(0, needed).map((archetype, i) => ({
        id: `synthetic-${archetype}`,
        is_synthetic: true,
        ximatar_archetype: archetype,
        ximatar_level: Math.floor(Math.random() * 3) + 1,
        pillar_scores: {
          drive: 50 + Math.floor(Math.random() * 40),
          knowledge: 50 + Math.floor(Math.random() * 40),
          comp_power: 50 + Math.floor(Math.random() * 40),
          creativity: 50 + Math.floor(Math.random() * 40),
          communication: 50 + Math.floor(Math.random() * 40),
        },
        work_preference: ['remote', 'hybrid', 'onsite'][i % 3],
        availability: ['immediately', '1_month', '3_months'][i % 3],
        engagement_level: ['highly_active', 'active', 'moderate'][i % 3],
        trajectory_trend: null,
        profile_completed: false,
      }));

      anonymousCandidates.push(...synthetics);
    }

    const isRestricted = (count || 0) > planLimit;
    const hasSynthetic = anonymousCandidates.some((c: any) => c.is_synthetic);

    return jsonResponse({
      candidates: anonymousCandidates.slice(0, Math.max(planLimit, SYNTHETIC_THRESHOLD)),
      total_count: Math.max(count || 0, SYNTHETIC_THRESHOLD),
      plan_limit: planLimit,
      plan,
      is_restricted: isRestricted,
      page,
      page_size,
      has_synthetic: hasSynthetic,
    });
  } catch (err: any) {
    console.error("[browse-pool] Error:", err.message, err.stack);
    return jsonResponse({
      candidates: [],
      total_count: 0,
      plan_limit: 5,
      plan: 'free',
      is_restricted: false,
      error: "internal_error",
      error_message: err.message,
    });
  }
});
