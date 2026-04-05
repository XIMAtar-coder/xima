import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  trial: 10,
  starter: 50,
  growth: 200,
  enterprise: 999999,
};

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

    const body = await req.json();
    const { filters = {}, page = 0, page_size = 20 } = body;

    // Resolve business plan tier
    const { data: entitlement } = await serviceClient
      .from("business_entitlements")
      .select("plan_tier")
      .eq("business_id", user.id)
      .maybeSingle();

    const plan = (entitlement?.plan_tier || "free").toLowerCase();
    const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Build query
    let query = serviceClient
      .from("profiles")
      .select(
        `user_id, ximatar, ximatar_archetype, ximatar_name, ximatar_level,
         pillar_scores, assessment_scores,
         desired_locations, work_preference, willing_to_relocate,
         availability_date, industry_preferences,
         profile_completed, updated_at, profiling_opt_out`,
        { count: "exact" }
      )
      .not("pillar_scores", "is", null)
      .or("profiling_opt_out.is.null,profiling_opt_out.eq.false");

    // Apply archetype filter
    if (filters.archetype) {
      query = query.or(
        `ximatar.eq.${filters.archetype},ximatar_archetype.eq.${filters.archetype}`
      );
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
      console.error("[browse-pool] Query error:", queryError.message);
      return errorResponse(500, "QUERY_FAILED", "Failed to load candidates");
    }

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

    // Transform to anonymous results with client-side filtering
    const anonymousCandidates = (candidates || []).map((c: any) => {
      const pillarScores = c.pillar_scores || c.assessment_scores || {};
      const ximatarKey = (c.ximatar || c.ximatar_archetype || "unknown").toString().toLowerCase();

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
        const match = desiredLocs.some((l: any) =>
          (l.city || "").toLowerCase().includes(loc) ||
          (l.country || "").toLowerCase().includes(loc)
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

    const isRestricted = (count || 0) > planLimit;

    return jsonResponse({
      candidates: anonymousCandidates,
      total_count: count || 0,
      plan_limit: planLimit,
      plan,
      is_restricted: isRestricted,
      page,
      page_size,
    });
  } catch (err: any) {
    console.error("[browse-pool] Error:", err.message);
    return errorResponse(500, "INTERNAL_ERROR", err.message);
  }
});
