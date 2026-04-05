import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { XIMATAR_PROFILES, computePillarDistance } from "../_shared/ximatarTaxonomy.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = extractCorrelationId(req);

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
    const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !user) return unauthorizedResponse("Auth required");

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { hiring_goal_id, filters } = body;

    if (!hiring_goal_id) return errorResponse(400, "INVALID_INPUT", "hiring_goal_id required");

    // Fetch goal, company profile, biz profile in parallel
    const [goalRes, companyRes, bizRes] = await Promise.all([
      serviceClient
        .from("hiring_goal_drafts")
        .select("id, role_title, task_description, experience_level, work_model, country, city_region, function_area, seniority_level")
        .eq("id", hiring_goal_id)
        .eq("business_id", user.id)
        .single(),
      serviceClient
        .from("company_profiles")
        .select("pillar_vector, recommended_ximatars, values, ideal_traits")
        .eq("company_id", user.id)
        .maybeSingle(),
      serviceClient
        .from("business_profiles")
        .select("industry, team_culture, hiring_approach, manual_hq_city, manual_hq_country")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (goalRes.error || !goalRes.data) return errorResponse(404, "GOAL_NOT_FOUND", "Hiring goal not found");
    const goal = goalRes.data;
    const companyProfile = companyRes.data;
    const bizProfile = bizRes.data;

    // Fetch candidates with pillar scores
    const { data: candidates, error: candidateError } = await serviceClient
      .from("profiles")
      .select(`
        user_id, id,
        ximatar_id, ximatar, ximatar_archetype, ximatar_name, ximatar_level,
        pillar_scores, assessment_scores,
        desired_locations, work_preference, willing_to_relocate,
        salary_expectation, availability_date, industry_preferences,
        profile_completed, created_at, updated_at
      `)
      .not("pillar_scores", "is", null)
      .limit(500);

    if (candidateError || !candidates || candidates.length === 0) {
      return jsonResponse({ success: true, shortlist: [], message: "No candidates found", total_candidates_evaluated: 0 });
    }

    const candidateUserIds = candidates.map(c => c.user_id);

    // Fetch trajectory + engagement in parallel
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [trajectoryRes, engagementRes] = await Promise.all([
      serviceClient
        .from("pillar_trajectory_log")
        .select("user_id, drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta")
        .in("user_id", candidateUserIds)
        .gte("created_at", ninetyDaysAgo)
        .limit(2000),
      serviceClient
        .from("feed_items")
        .select("user_id, feed_type")
        .in("user_id", candidateUserIds)
        .gte("created_at", thirtyDaysAgo)
        .limit(5000),
    ]);

    const trajectoryData = trajectoryRes.data || [];
    const engagementData = engagementRes.data || [];

    // Optional credential data
    let credentialData: any[] = [];
    const useCredentialFilters = filters?.degree_type || filters?.min_experience || filters?.industry;
    if (useCredentialFilters) {
      const { data: creds } = await serviceClient
        .from("cv_credentials")
        .select("user_id, education, total_years_experience, industries_worked")
        .in("user_id", candidateUserIds)
        .limit(500);
      credentialData = creds || [];
    }

    // Build company pillar vector
    const companyPillars = (companyProfile?.pillar_vector || { drive: 60, comp_power: 60, communication: 60, creativity: 60, knowledge: 60 }) as Record<string, number>;
    const recommendedXimatars = (companyProfile?.recommended_ximatars || []) as string[];

    const goalLocation = (goal.country || goal.city_region || "").toLowerCase();
    const goalWorkMode = (goal.work_model || "").toLowerCase();

    // Group trajectory and engagement by user
    const trajectoryByUser = new Map<string, typeof trajectoryData>();
    for (const t of trajectoryData) {
      if (!trajectoryByUser.has(t.user_id)) trajectoryByUser.set(t.user_id, []);
      trajectoryByUser.get(t.user_id)!.push(t);
    }
    const engagementByUser = new Map<string, number>();
    for (const e of engagementData) {
      engagementByUser.set(e.user_id, (engagementByUser.get(e.user_id) || 0) + 1);
    }

    // Score candidates
    const scoredCandidates = candidates.map(candidate => {
      const pillarScores = (candidate.pillar_scores || candidate.assessment_scores || {}) as Record<string, number>;
      const ximatarKey = ((candidate.ximatar as string) || (candidate.ximatar_archetype as string) || "").toString().toLowerCase();

      // SIGNAL 1: Identity match (0-40 pts)
      let identityScore = 0;
      const candidatePillars = {
        drive: (pillarScores.drive || 0) / 10,
        comp_power: (pillarScores.computational_power || pillarScores.comp_power || 0) / 10,
        communication: (pillarScores.communication || 0) / 10,
        creativity: (pillarScores.creativity || 0) / 10,
        knowledge: (pillarScores.knowledge || 0) / 10,
      };
      const companyPillarNorm = {
        drive: (companyPillars.drive || 60) / 10,
        comp_power: (companyPillars.comp_power || 60) / 10,
        communication: (companyPillars.communication || 60) / 10,
        creativity: (companyPillars.creativity || 60) / 10,
        knowledge: (companyPillars.knowledge || 60) / 10,
      };
      const distance = computePillarDistance(candidatePillars, companyPillarNorm);
      const maxDistance = Math.sqrt(5 * (10 ** 2));
      identityScore += Math.max(0, 25 * (1 - distance / maxDistance));

      if (recommendedXimatars.includes(ximatarKey)) {
        const rank = recommendedXimatars.indexOf(ximatarKey);
        identityScore += rank === 0 ? 15 : rank === 1 ? 10 : 5;
      }

      // SIGNAL 2: Growth trajectory (0-20 pts)
      let trajectoryScore = 0;
      let trajectorySummary = "New to platform";
      const userTrajectory = trajectoryByUser.get(candidate.user_id) || [];

      if (userTrajectory.length > 0) {
        const totals = { Drive: 0, "Comp. Power": 0, Communication: 0, Creativity: 0, Knowledge: 0 };
        for (const t of userTrajectory) {
          totals.Drive += t.drive_delta || 0;
          totals["Comp. Power"] += t.computational_power_delta || 0;
          totals.Communication += t.communication_delta || 0;
          totals.Creativity += t.creativity_delta || 0;
          totals.Knowledge += t.knowledge_delta || 0;
        }
        const totalGrowth = Object.values(totals).reduce((a, b) => a + b, 0);
        trajectoryScore = Math.min(20, Math.max(0, totalGrowth * 2));

        const deltas = Object.entries(totals)
          .filter(([, d]) => d !== 0)
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        trajectorySummary = deltas.length > 0
          ? deltas.slice(0, 2).map(([p, d]) => `${p} ${d > 0 ? '+' : ''}${d}`).join(", ")
          : "No recent growth";
      }

      // SIGNAL 3: Engagement (0-15 pts)
      let engagementScore = 0;
      let engagementLevel = "low";
      const engCount = engagementByUser.get(candidate.user_id) || 0;

      if (engCount >= 20) { engagementScore = 15; engagementLevel = "highly_active"; }
      else if (engCount >= 10) { engagementScore = 10; engagementLevel = "active"; }
      else if (engCount >= 3) { engagementScore = 5; engagementLevel = "moderate"; }

      if (candidate.profile_completed) engagementScore = Math.min(15, engagementScore + 3);
      if (candidate.updated_at && Date.now() - new Date(candidate.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000) {
        engagementScore = Math.min(15, engagementScore + 2);
      }

      // SIGNAL 4: Location (0-15 pts)
      let locationScore = 0;
      let locationMatch = "no_match";
      const desiredLocations = (candidate.desired_locations || []) as any[];
      const workPref = (candidate.work_preference || "") as string;
      const relocate = (candidate.willing_to_relocate || "") as string;

      if (goalWorkMode === "remote" || workPref === "remote") {
        if (desiredLocations.some((l: any) => l.type === "remote") || workPref === "remote") {
          locationScore = 15; locationMatch = "remote";
        } else if (workPref === "flexible") {
          locationScore = 10; locationMatch = "remote";
        }
      } else if (goalLocation) {
        if (desiredLocations.some((l: any) => goalLocation.includes(((l.city as string) || "").toLowerCase()))) {
          locationScore = 15; locationMatch = "exact";
        } else if (desiredLocations.some((l: any) => goalLocation.includes(((l.country as string) || "").toLowerCase()))) {
          locationScore = 10; locationMatch = "region";
        } else if (relocate === "yes" || relocate === "international") {
          locationScore = 8; locationMatch = "willing_to_relocate";
        } else if (relocate === "within_country" || relocate === "within_region") {
          locationScore = 5; locationMatch = "willing_to_relocate";
        }
      } else {
        locationScore = 5; locationMatch = "any";
      }

      // SIGNAL 5: Credentials (0-10 pts, optional)
      let credentialScore = 0;
      if (useCredentialFilters) {
        const creds = credentialData.find(c => c.user_id === candidate.user_id);
        if (creds) {
          if (filters.degree_type) {
            const hasMatch = (creds.education || []).some((edu: any) =>
              ((edu.degree_type || "") as string).toLowerCase().includes(filters.degree_type.toLowerCase()) ||
              ((edu.field_of_study || "") as string).toLowerCase().includes(filters.degree_type.toLowerCase())
            );
            if (hasMatch) credentialScore += 4;
          }
          if (filters.min_experience && (creds.total_years_experience || 0) >= filters.min_experience) {
            credentialScore += 3;
          }
          if (filters.industry) {
            if ((creds.industries_worked || []).some((ind: string) => ind.toLowerCase().includes(filters.industry.toLowerCase()))) {
              credentialScore += 3;
            }
          }
        }
      }

      const totalScore = identityScore + trajectoryScore + engagementScore + locationScore + credentialScore;

      let availability = "unknown";
      if (candidate.availability_date) {
        const daysUntil = (new Date(candidate.availability_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntil <= 0) availability = "immediately";
        else if (daysUntil <= 14) availability = "2_weeks";
        else if (daysUntil <= 30) availability = "1_month";
        else availability = "3_months";
      }

      return {
        candidate_user_id: candidate.user_id,
        total_score: Math.round(totalScore * 10) / 10,
        identity_score: Math.round(identityScore * 10) / 10,
        trajectory_score: Math.round(trajectoryScore * 10) / 10,
        engagement_score: Math.round(engagementScore * 10) / 10,
        location_score: Math.round(locationScore * 10) / 10,
        credential_score: Math.round(credentialScore * 10) / 10,
        ximatar_archetype: ximatarKey || "unknown",
        ximatar_level: (candidate.ximatar_level as number) || 1,
        pillar_scores: pillarScores,
        trajectory_summary: trajectorySummary,
        engagement_level: engagementLevel,
        location_match: locationMatch,
        availability,
        status: "shortlisted",
      };
    });

    // Sort + limit
    scoredCandidates.sort((a, b) => b.total_score - a.total_score);
    const limit = filters?.limit || 20;
    const topCandidates = scoredCandidates.slice(0, limit);

    // Store results: delete old, insert new
    await serviceClient
      .from("shortlist_results")
      .delete()
      .eq("hiring_goal_id", hiring_goal_id)
      .eq("business_id", user.id);

    if (topCandidates.length > 0) {
      const inserts = topCandidates.map(c => ({
        hiring_goal_id,
        business_id: user.id,
        candidate_user_id: c.candidate_user_id,
        total_score: c.total_score,
        identity_score: c.identity_score,
        trajectory_score: c.trajectory_score,
        engagement_score: c.engagement_score,
        location_score: c.location_score,
        credential_score: c.credential_score,
        ximatar_archetype: c.ximatar_archetype,
        ximatar_level: c.ximatar_level,
        pillar_scores: c.pillar_scores,
        trajectory_summary: c.trajectory_summary,
        engagement_level: c.engagement_level,
        location_match: c.location_match,
        availability: c.availability,
        status: "shortlisted",
      }));
      await serviceClient.from("shortlist_results").insert(inserts);
    }

    console.log(JSON.stringify({
      type: "shortlist_generated", correlation_id: correlationId,
      hiring_goal_id, total_evaluated: candidates.length,
      shortlisted: topCandidates.length,
      top_score: topCandidates[0]?.total_score || 0,
    }));

    return jsonResponse({
      success: true,
      shortlist: topCandidates,
      total_candidates_evaluated: candidates.length,
      scoring_weights: {
        identity: "0-40 pts (pillar match + archetype fit)",
        trajectory: "0-20 pts (growth in last 90 days)",
        engagement: "0-15 pts (platform activity + profile completion)",
        location: "0-15 pts (location + work mode + relocation)",
        credentials: useCredentialFilters ? "0-10 pts (degree + experience + industry)" : "disabled (identity-first mode)",
      },
    });
  } catch (err: any) {
    console.error(JSON.stringify({ type: "error", correlation_id: correlationId, error: err.message }));
    return errorResponse(500, "INTERNAL_ERROR", err.message || "Unexpected error");
  }
});
