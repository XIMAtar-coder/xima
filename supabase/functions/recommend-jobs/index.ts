/**
 * XIMA recommend-jobs v2.0 — Identity-First Job Matching Engine
 *
 * 3-stage scoring: Identity (0-60) + Credentials (0/25) + Growth Fit (0-15) = max 100
 * Claude generates personalized match narratives for top results.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES, computePillarDistance, type XimatarPillars } from "../_shared/ximatarTaxonomy.ts";

// =====================================================
// Types
// =====================================================

interface JobRecord {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  department: string | null;
  requirements_must: string | null;
  requirements_nice: string | null;
  benefits: string | null;
  business_id: string;
  content_json: any;
  status: string;
  created_at: string;
}

interface ScoredJob {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  seniority: string | null;
  employmentType: string | null;
  totalScore: number;
  identityScore: number;
  identityBreakdown: Record<string, number>;
  credentialScore: number;
  credentialDetails: string[];
  growthFitScore: number;
  fitType: string;
}

// =====================================================
// Stage 1: Identity Match Score (0-60)
// =====================================================

function computeIdentityScore(
  userArchetype: string,
  userLevel: number,
  userPillars: Record<string, number>,
  userTrajectory: Record<string, number> | null,
  jobIdealArchetypes: string[],
  companyPillarVector: Record<string, number> | null
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // 1a. Archetype match (0-25)
  if (jobIdealArchetypes.length > 0 && jobIdealArchetypes.includes(userArchetype)) {
    breakdown.archetype_match = 25;
  } else if (jobIdealArchetypes.length > 0) {
    const userVector: XimatarPillars = {
      drive: userPillars.drive ?? 50,
      comp_power: userPillars.computational_power ?? userPillars.comp_power ?? 50,
      communication: userPillars.communication ?? 50,
      creativity: userPillars.creativity ?? 50,
      knowledge: userPillars.knowledge ?? 50,
    };
    let minDistance = Infinity;
    for (const idealId of jobIdealArchetypes) {
      const idealProfile = XIMATAR_PROFILES[idealId];
      if (idealProfile) {
        minDistance = Math.min(minDistance, computePillarDistance(userVector, idealProfile.pillars));
      }
    }
    breakdown.archetype_match = Math.max(0, Math.round(25 * (1 - minDistance / 50)));
  } else {
    breakdown.archetype_match = 12; // Neutral when no ideal archetypes defined
  }

  // 1b. Pillar alignment with company vector (0-20)
  if (companyPillarVector) {
    const userVec: XimatarPillars = {
      drive: userPillars.drive ?? 50,
      comp_power: userPillars.computational_power ?? userPillars.comp_power ?? 50,
      communication: userPillars.communication ?? 50,
      creativity: userPillars.creativity ?? 50,
      knowledge: userPillars.knowledge ?? 50,
    };
    const compVec: XimatarPillars = {
      drive: companyPillarVector.drive ?? 50,
      comp_power: companyPillarVector.computational_power ?? companyPillarVector.comp_power ?? 50,
      communication: companyPillarVector.communication ?? 50,
      creativity: companyPillarVector.creativity ?? 50,
      knowledge: companyPillarVector.knowledge ?? 50,
    };
    const distance = computePillarDistance(userVec, compVec);
    breakdown.pillar_alignment = Math.max(0, Math.round(20 * (1 - distance / 60)));
  } else {
    breakdown.pillar_alignment = 10;
  }

  // 1c. XIMAtar level bonus (0-8)
  breakdown.level_bonus = Math.min(8, (userLevel - 1) * 4);

  // 1d. Trajectory momentum (0-7)
  if (userTrajectory) {
    const totalPositiveTrend = Object.values(userTrajectory).filter(v => v > 0).reduce((a, b) => a + b, 0);
    breakdown.trajectory = Math.min(7, Math.round(totalPositiveTrend / 3));
  } else {
    breakdown.trajectory = 0;
  }

  const score = Math.min(60, Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { score, breakdown };
}

// =====================================================
// Stage 2: Credential Filter (pass/fail → 0 or 25)
// =====================================================

function checkCredentialFit(
  credentials: any | null,
  jobSeniority: string | null,
  requirementsMust: string | null
): { passes: boolean; score: number; matchDetails: string[] } {
  if (!credentials) {
    return { passes: true, score: 15, matchDetails: ["No CV uploaded — credential check skipped"] };
  }

  const details: string[] = [];
  let passes = true;

  // Seniority check
  const seniorityOrder = ["junior", "mid", "senior", "lead", "executive"];
  if (jobSeniority && credentials.seniority_level) {
    const requiredIdx = seniorityOrder.indexOf(jobSeniority.toLowerCase());
    const userIdx = seniorityOrder.indexOf(credentials.seniority_level.toLowerCase());
    if (requiredIdx >= 0 && userIdx >= 0 && userIdx < requiredIdx - 1) {
      // Allow one level below (stretch opportunity), fail if 2+ below
      passes = false;
      details.push(`Seniority gap: role needs ${jobSeniority}, you're ${credentials.seniority_level}`);
    } else {
      details.push("Seniority: meets requirement");
    }
  }

  // Skills overlap from requirements_must (soft check)
  if (requirementsMust && credentials.hard_skills) {
    const userSkills = (credentials.hard_skills || []).map((s: any) => (s.name || "").toLowerCase());
    const reqWords = requirementsMust.toLowerCase().split(/[\s,;.]+/).filter((w: string) => w.length > 3);
    const matched = reqWords.filter((w: string) =>
      userSkills.some((us: string) => us.includes(w) || w.includes(us))
    );
    if (reqWords.length > 0) {
      details.push(`Skills overlap: ${matched.length} keyword matches`);
    }
  }

  // Experience years
  if (credentials.total_years_experience != null) {
    details.push(`Experience: ${credentials.total_years_experience} years`);
  }

  return { passes, score: passes ? 25 : 0, matchDetails: details };
}

// =====================================================
// Stage 3: Growth Fit Bonus (0-15)
// =====================================================

function computeGrowthFitScore(
  jobTitle: string,
  cvAnalysis: { cv_qualified_roles?: string[]; archetype_aligned_roles?: string[]; growth_bridge_roles?: string[] } | null
): { score: number; fitType: string } {
  if (!cvAnalysis) return { score: 5, fitType: "pending" };

  const normalizedTitle = jobTitle.toLowerCase();

  const matchesAny = (roles: string[]) =>
    roles.some(r => normalizedTitle.includes(r.toLowerCase()) || r.toLowerCase().includes(normalizedTitle));

  if (matchesAny(cvAnalysis.archetype_aligned_roles || [])) return { score: 15, fitType: "archetype_aligned" };
  if (matchesAny(cvAnalysis.growth_bridge_roles || [])) return { score: 10, fitType: "growth_bridge" };
  if (matchesAny(cvAnalysis.cv_qualified_roles || [])) return { score: 8, fitType: "cv_qualified" };

  return { score: 3, fitType: "exploratory" };
}

// =====================================================
// Fallback narrative
// =====================================================

function fallbackNarrative(match: ScoredJob, userArchetype: string): string {
  const profile = XIMATAR_PROFILES[userArchetype];
  if (!profile) return "Recommended based on your profile.";
  const topPillar = Object.entries(profile.pillars).sort((a, b) => b[1] - a[1])[0][0];
  return `Your ${profile.name} profile aligns well with this role's emphasis on ${topPillar.replace("_", " ")}.`;
}

// =====================================================
// Main handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req) || generateCorrelationId();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth — required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse();

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return unauthorizedResponse("Invalid or expired token");

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(JSON.stringify({ type: "recommend_jobs_start", correlation_id: correlationId, user_id: userId }));

    // ---- Fetch user data in parallel ----
    const [profileRes, credentialsRes, cvAnalysisRes, trajectoryRes] = await Promise.all([
      supabase.from("profiles").select("ximatar, ximatar_level, pillar_scores").eq("user_id", userId).single(),
      supabase.from("cv_credentials").select("hard_skills, seniority_level, total_years_experience, industries_worked, career_trajectory, languages").eq("user_id", userId).maybeSingle(),
      supabase.from("cv_identity_analysis").select("cv_qualified_roles, archetype_aligned_roles, growth_bridge_roles").eq("user_id", userId).maybeSingle(),
      supabase.rpc("get_user_trajectory_90d", { p_user_id: userId }).maybeSingle(),
    ]);

    const profile = profileRes.data;
    if (!profile?.ximatar || !profile?.pillar_scores) {
      return jsonResponse({
        success: true,
        recommendations: [],
        opportunities: [],
        total: 0,
        message: "Complete your XIMA assessment to get personalized recommendations",
        generated_at: new Date().toISOString(),
      });
    }

    const userArchetype = profile.ximatar as string;
    const userLevel = (profile.ximatar_level as number) || 1;
    const userPillars = profile.pillar_scores as Record<string, number>;
    const credentials = credentialsRes.data;
    const cvAnalysis = cvAnalysisRes.data;

    // Trajectory — if the RPC doesn't exist, compute from raw query
    let userTrajectory: Record<string, number> | null = null;
    if (trajectoryRes.data) {
      userTrajectory = trajectoryRes.data;
    } else {
      // Fallback: direct query
      const { data: trajData } = await supabase
        .from("pillar_trajectory_log")
        .select("drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (trajData && trajData.length > 0) {
        userTrajectory = {
          drive: trajData.reduce((s, r) => s + (Number(r.drive_delta) || 0), 0),
          computational_power: trajData.reduce((s, r) => s + (Number(r.computational_power_delta) || 0), 0),
          communication: trajData.reduce((s, r) => s + (Number(r.communication_delta) || 0), 0),
          creativity: trajData.reduce((s, r) => s + (Number(r.creativity_delta) || 0), 0),
          knowledge: trajData.reduce((s, r) => s + (Number(r.knowledge_delta) || 0), 0),
        };
      }
    }

    // ---- Fetch active job posts ----
    const { data: jobPosts, error: jobsError } = await supabase
      .from("job_posts")
      .select("id, title, description, location, employment_type, seniority, department, requirements_must, requirements_nice, benefits, business_id, content_json, status, created_at")
      .not("status", "in", '("draft","archived","closed")')
      .order("created_at", { ascending: false })
      .limit(200);

    if (jobsError) {
      console.error(JSON.stringify({ type: "jobs_fetch_error", correlation_id: correlationId, error: jobsError.message }));
    }

    const allJobs: JobRecord[] = jobPosts || [];

    if (allJobs.length === 0) {
      return jsonResponse({
        recommendations: [],
        total: 0,
        message: "No active job opportunities available right now. Check back soon.",
        user_context: { ximatar: userArchetype, level: userLevel, cv_uploaded: !!credentials },
        generated_at: new Date().toISOString(),
      });
    }

    // ---- Fetch company data for all unique business_ids ----
    const businessIds = [...new Set(allJobs.map(j => j.business_id))];

    const [companyProfilesRes, businessProfilesRes] = await Promise.all([
      supabase.from("company_profiles").select("company_id, pillar_vector, ideal_ximatar_profile_ids, summary").in("company_id", businessIds),
      supabase.from("business_profiles").select("user_id, company_name, snapshot_industry, manual_industry").in("user_id", businessIds),
    ]);

    const companyMap = new Map<string, any>();
    (companyProfilesRes.data || []).forEach((cp: any) => companyMap.set(cp.company_id, cp));

    const businessMap = new Map<string, any>();
    (businessProfilesRes.data || []).forEach((bp: any) => businessMap.set(bp.user_id, bp));

    // ---- Score all jobs ----
    const scoredJobs: ScoredJob[] = [];

    for (const job of allJobs) {
      const company = companyMap.get(job.business_id);
      const business = businessMap.get(job.business_id);
      const companyName = business?.company_name || "Company";

      const idealArchetypes: string[] = company?.ideal_ximatar_profile_ids || [];
      const companyPillarVector = company?.pillar_vector || null;

      // Stage 1: Identity
      const identity = computeIdentityScore(
        userArchetype, userLevel, userPillars, userTrajectory,
        idealArchetypes, companyPillarVector
      );

      // Stage 2: Credentials
      const credCheck = checkCredentialFit(credentials, job.seniority, job.requirements_must);
      if (!credCheck.passes) continue; // Hard filter

      // Stage 3: Growth Fit
      const growthFit = computeGrowthFitScore(job.title, cvAnalysis);

      const totalScore = identity.score + credCheck.score + growthFit.score;

      scoredJobs.push({
        id: job.id,
        title: job.title,
        companyName,
        location: job.location,
        seniority: job.seniority,
        employmentType: job.employment_type,
        totalScore,
        identityScore: identity.score,
        identityBreakdown: identity.breakdown,
        credentialScore: credCheck.score,
        credentialDetails: credCheck.matchDetails,
        growthFitScore: growthFit.score,
        fitType: growthFit.fitType,
      });
    }

    // ---- Filter and rank ----
    const topMatches = scoredJobs
      .filter(j => j.totalScore >= 40)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    // ---- Claude narratives for top matches ----
    let narratives: string[] = [];

    if (topMatches.length > 0) {
      try {
        const topPillars = Object.entries(userPillars)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 2)
          .map(([k]) => k.replace("_", " "))
          .join(" and ");

        const trajectoryDesc = userTrajectory
          ? Object.entries(userTrajectory).filter(([, v]) => v > 0).map(([k]) => k.replace("_", " ")).join(", ") || "stable"
          : "not yet tracked";

        const archetypeProfile = XIMATAR_PROFILES[userArchetype];

        const narrativePrompt = `You are XIMA, a psychometric talent intelligence platform.
Generate a short, personalized match explanation for each job recommendation.

USER PROFILE:
- XIMAtar: ${userArchetype} L${userLevel} (${archetypeProfile?.title || userArchetype})
- Top pillars: ${topPillars}
- Trajectory: ${trajectoryDesc}
- Career trajectory: ${credentials?.career_trajectory || "unknown"}

For each job below, write a 1-2 sentence explanation of why this person is a good fit.
Focus on IDENTITY alignment first (archetype, pillar strengths, trajectory), then practical fit.
Write in Italian if the user seems Italian-based, otherwise English.

JOBS:
${topMatches.map((m, i) => `${i + 1}. ${m.title} at ${m.companyName} (${m.fitType}, score ${m.totalScore})`).join("\n")}

Return ONLY a JSON array of strings, one per job:
["explanation for job 1", "explanation for job 2", ...]`;

        const result = await callAnthropicApi({
          system: "You generate short personalized job match explanations for XIMA users. Return ONLY a JSON array of strings.",
          userMessage: narrativePrompt,
          correlationId,
          functionName: "recommend-jobs",
          inputSummary: `narratives:${topMatches.length}jobs`,
          maxTokens: 2048,
          temperature: 0.7,
        });

        const extracted = extractJsonFromAiContent(result.content);
        const parsed = JSON.parse(extracted || result.content);
        if (Array.isArray(parsed)) {
          narratives = parsed;
        }
      } catch (e) {
        console.warn(JSON.stringify({ type: "narrative_fallback", correlation_id: correlationId, error: e instanceof Error ? e.message : String(e) }));
      }
    }

    // ---- Build response ----
    const trajectoryDirection = userTrajectory
      ? (Object.values(userTrajectory).filter(v => v > 0).length >= 3 ? "ascending" : Object.values(userTrajectory).every(v => v === 0) ? "stable" : "mixed")
      : "not_tracked";

    const recommendationItems = topMatches.map((match, i) => ({
      job: {
        id: match.id,
        title: match.title,
        company: match.companyName,
        location: match.location,
        seniority: match.seniority,
        employment_type: match.employmentType,
      },
      match_score: match.totalScore,
      score_breakdown: {
        identity: match.identityScore,
        credentials: match.credentialScore,
        growth_fit: match.growthFitScore,
      },
      fit_type: match.fitType,
      identity_details: match.identityBreakdown,
      credential_details: match.credentialDetails,
      xima_narrative: narratives[i] || fallbackNarrative(match, userArchetype),
    }));

    const response = {
      success: true,
      recommendations: recommendationItems,
      // Backward-compatible format for MyOpportunitiesSection
      opportunities: recommendationItems.map(r => ({
        id: r.job.id,
        title: r.job.title,
        company: r.job.company,
        description: r.xima_narrative,
        location: r.job.location,
        skills: null,
        source_url: null,
        created_at: new Date().toISOString(),
        matchScore: r.match_score,
      })),
      total: topMatches.length,
      user_context: {
        ximatar: userArchetype,
        level: userLevel,
        trajectory_direction: trajectoryDirection,
        cv_uploaded: !!credentials,
      },
      generated_at: new Date().toISOString(),
    };

    // ---- Audit ----
    emitAuditEventWithMetric({
      actorType: "candidate",
      actorId: userId,
      action: "jobs.recommended",
      entityType: "job_recommendation",
      correlationId,
      metadata: {
        total_jobs_scanned: allJobs.length,
        matches_returned: topMatches.length,
        top_match_score: topMatches[0]?.totalScore || 0,
        user_ximatar: userArchetype,
        user_level: userLevel,
        cv_available: !!credentials,
      },
    }, "job_recommendations");

    console.log(JSON.stringify({ type: "recommend_jobs_done", correlation_id: correlationId, scanned: allJobs.length, returned: topMatches.length }));

    return jsonResponse(response);
  } catch (error) {
    console.error(JSON.stringify({ type: "recommend_jobs_error", correlation_id: correlationId, error: error instanceof Error ? error.message : String(error) }));
    return errorResponse(500, "INTERNAL_ERROR", "Failed to generate job recommendations");
  }
});
