// SCHEMA PREFLIGHT — verified columns as of 2026-04-14:
// profiles: id, user_id, full_name, ximatar, ximatar_id, ximatar_name, ximatar_level,
//   pillar_scores, desired_locations, work_preference, willing_to_relocate,
//   salary_expectation, availability_date, industry_preferences, profile_completed,
//   created_at, updated_at
// hiring_goal_drafts: id, business_id, role_title, task_description, experience_level,
//   work_model, country, city_region, function_area, salary_min, salary_max,
//   salary_currency, salary_period, status
// business_profiles: id, user_id, company_name, manual_industry, snapshot_industry,
//   team_culture, hiring_approach, manual_hq_city, manual_hq_country
// shortlist_results: id, hiring_goal_id, business_id, candidate_user_id, total_score,
//   identity_score, performance_score, performance_summary, trajectory_score,
//   engagement_score, location_score, credential_score,
//   ximatar_archetype, ximatar_level, pillar_scores, trajectory_summary, engagement_level,
//   location_match, availability, match_narrative, status, anonymous_label,
//   identity_revealed, pipeline_stage
// (Run information_schema query before adding new column references)

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { XIMATAR_PROFILES, computePillarDistance } from "../_shared/ximatarTaxonomy.ts";
import { performanceScore } from "../_shared/performanceScore.ts";

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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "INVALID_INPUT", "Invalid JSON body");
    }
    const { hiring_goal_id, filters, dry_run } = body;
    const isDryRun = dry_run === true;

    if (!hiring_goal_id) return errorResponse(400, "INVALID_INPUT", "hiring_goal_id required");

    // PoC dry-run path: admin-only, no business ownership required, no writes.
    let isAdminDryRun = false;
    if (isDryRun) {
      const { data: roleRows } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!roleRows?.some((r: any) => r.role === "admin")) {
        return errorResponse(403, "FORBIDDEN", "dry_run requires admin role");
      }
      isAdminDryRun = true;
    }

    console.log(`[generate-shortlist] START`, JSON.stringify({ hiring_goal_id, business_id: user.id, dry_run: isDryRun, correlation_id: correlationId }));

    // Goal lookup: in dry_run admin mode skip owner filter; otherwise scope to caller.
    const goalQuery = serviceClient
      .from("hiring_goal_drafts")
      .select("id, business_id, role_title, task_description, experience_level, work_model, country, city_region, function_area, education_level, years_experience_min, years_experience_max, languages")
      .eq("id", hiring_goal_id);
    const goalRes = isAdminDryRun
      ? await goalQuery.single()
      : await goalQuery.eq("business_id", user.id).single();

    if (goalRes.error || !goalRes.data) {
      console.error(`[generate-shortlist] hiring_goal_drafts query error:`, JSON.stringify(goalRes.error));
      return errorResponse(404, "GOAL_NOT_FOUND", "Hiring goal not found");
    }
    const ownerId = (goalRes.data as any).business_id || user.id;

    const [companyRes, bizRes] = await Promise.all([
      serviceClient
        .from("company_profiles")
        .select("pillar_vector, recommended_ximatars, values, ideal_traits")
        .eq("company_id", ownerId)
        .maybeSingle(),
      serviceClient
        .from("business_profiles")
        .select("manual_industry, snapshot_industry, team_culture, hiring_approach, manual_hq_city, manual_hq_country")
        .eq("user_id", ownerId)
        .maybeSingle(),
    ]);

    if (goalRes.error) {
      console.error(`[generate-shortlist] hiring_goal_drafts query error:`, JSON.stringify(goalRes.error));
      console.error("[generate-shortlist] goal load error:", goalRes.error.message);
      return errorResponse(404, "GOAL_NOT_FOUND", "Hiring goal not found");
    }
    if (!goalRes.data) return errorResponse(404, "GOAL_NOT_FOUND", "Hiring goal not found");

    const goal = goalRes.data;
    const companyProfile = companyRes.data;
    const bizProfile = bizRes.data;
    // COALESCE: manual override wins over AI snapshot
    const bizIndustry = bizProfile?.manual_industry || bizProfile?.snapshot_industry || null;

    console.log(`[generate-shortlist] Goal loaded: ${goal.role_title}, experience_level: ${goal.experience_level}`);

    // Fetch candidates with pillar scores.
    //
    // This was a flat .limit(500): everyone past the 500th oldest profile was
    // permanently unrankable, and nothing said so — the shortlist looked like a
    // search of the whole pool. Paged now, up to a ceiling that still has to
    // exist because scoring happens in memory in this isolate.
    //
    // What changed is that hitting the ceiling is no longer silent. It is
    // logged, and it comes back on the response, because "the best 20 of your
    // candidates" and "the best 20 of the first 5000 we looked at" are
    // different claims and only one of them is true past that point.
    const MAX_POOL = 5000;
    const PAGE = 1000;

    type CandidateRow = Record<string, unknown> & { id: string; user_id: string };
    const candidates: CandidateRow[] = [];
    let poolTruncated = false;

    for (let from = 0; from < MAX_POOL; from += PAGE) {
      const { data: page, error: candidateError } = await serviceClient
        .from("profiles")
        .select(`
          user_id, id,
          ximatar_id, ximatar, ximatar_name, ximatar_level,
          pillar_scores,
          desired_locations, work_preference, willing_to_relocate,
          salary_expectation, availability_date, industry_preferences,
          profile_completed, created_at, updated_at
        `)
        .not("pillar_scores", "is", null)
        // '{}' is the column default: a profile that never took the assessment.
        // 109 of 320 profiles were like that and all scored the same.
        .neq("pillar_scores", "{}")
        // GDPR: exclude candidates who opted out of profiling/shortlisting
        .or('profiling_opt_out.is.null,profiling_opt_out.eq.false')
        // Ordered before paging: an unordered window meant which candidates were
        // even considered could differ between two identical runs.
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);

      if (candidateError) {
        console.error(`[generate-shortlist] profiles query error:`, JSON.stringify(candidateError));
        return errorResponse(500, "QUERY_ERROR", "Failed to load candidates");
      }

      if (!page || page.length === 0) break;
      candidates.push(...page);

      if (page.length < PAGE) break;
      if (candidates.length >= MAX_POOL) {
        poolTruncated = true;
        break;
      }
    }

    // Company, admin and mentor accounts also have a profiles row, and a company
    // that once opened the candidate journey had pillar scores written onto it.
    // They are not candidates and must never be ranked for an employer.
    {
      const nonCandidate = new Set<string>();
      const ids = candidates.map(c => c.user_id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: roleRows } = await serviceClient
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", ids.slice(i, i + 200))
          .in("role", ["business", "admin"]);
        for (const r of (roleRows || []) as any[]) nonCandidate.add(r.user_id);
      }
      if (nonCandidate.size > 0) {
        const kept = candidates.filter(c => !nonCandidate.has(c.user_id));
        candidates.length = 0;
        candidates.push(...kept);
      }
    }

    if (poolTruncated) {
      console.warn(JSON.stringify({
        type: "shortlist_pool_truncated",
        correlation_id: correlationId,
        hiring_goal_id,
        pool_considered: candidates.length,
        max_pool: MAX_POOL,
        note: "Candidates beyond MAX_POOL were not ranked. Scoring needs to move DB-side before the pool outgrows this.",
      }));
    }

    console.log(`[generate-shortlist] Candidates loaded: ${candidates.length}${poolTruncated ? " (TRUNCATED)" : ""}`);

    if (candidates.length === 0) {
      return jsonResponse({ success: true, shortlist: [], message: "No candidates found", total_candidates_evaluated: 0 });
    }

    const candidateUserIds = candidates.map(c => c.user_id);

    // Fetch trajectory + engagement in parallel
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [trajectoryRes, engagementRes, performanceRes] = await Promise.all([
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
      // What the candidate actually demonstrated. The ranking previously ignored
      // every challenge they had completed while counting how many feed rows
      // they had generated.
      serviceClient
        .from("challenge_submissions")
        .select("candidate_profile_id, signals_payload, submitted_at")
        .in("candidate_profile_id", candidates.map(c => c.id))
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(2000),
    ]);

    const trajectoryData = trajectoryRes.data || [];
    const engagementData = engagementRes.data || [];

    // Mean of a candidate's challenge scores, plus how many carried verified
    // evidence — a score backed by the candidate's own words is worth more than
    // one that is not.
    const performanceByProfile = new Map<string, { mean: number; count: number; withEvidence: number }>();
    for (const row of (performanceRes.data || []) as any[]) {
      const sp = row?.signals_payload as Record<string, unknown> | null;
      const overall = performanceScore(sp);
      if (overall === null) continue;
      const key = String(row.candidate_profile_id);
      const prev = performanceByProfile.get(key) || { mean: 0, count: 0, withEvidence: 0 };
      const count = prev.count + 1;
      const hasEvidence = Array.isArray(sp?.evidence) && (sp!.evidence as unknown[]).length > 0;
      performanceByProfile.set(key, {
        mean: prev.mean + (overall - prev.mean) / count,
        count,
        withEvidence: prev.withEvidence + (hasEvidence ? 1 : 0),
      });
    }

    // Optional credential data
    let credentialData: any[] = [];
    // The goal's own requirements (education, years, languages) used to be
    // ignored unless the caller passed ad-hoc filters, which the app never did:
    // a master's degree and fluent English changed nothing in the ranking.
    const goalReq = goal as any;
    const useCredentialFilters = Boolean(
      filters?.degree_type || filters?.min_experience || filters?.industry ||
      goalReq.education_level || goalReq.years_experience_min != null ||
      (Array.isArray(goalReq.languages) && goalReq.languages.length > 0)
    );
    if (useCredentialFilters) {
      const optedInUserIds = (candidates || []).map(c => c.user_id);
      for (let i = 0; i < optedInUserIds.length; i += 200) {
        const { data: creds } = await serviceClient
          .from("cv_credentials")
          .select("user_id, education, total_years_experience, industries_worked, languages")
          .in("user_id", optedInUserIds.slice(i, i + 200));
        credentialData.push(...(creds || []));
      }
    }

    // Build company pillar vector
    const companyPillars = (companyProfile?.pillar_vector || { drive: 60, comp_power: 60, communication: 60, creativity: 60, knowledge: 60 }) as Record<string, number>;
    const recommendedXimatars = (companyProfile?.recommended_ximatars || []) as string[];

    const goalCity = ((goal.city_region as string) || "").trim().toLowerCase();
    const goalCountry = ((goal.country as string) || "").trim().toLowerCase();
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
      const pillarScores = (candidate.pillar_scores || {}) as Record<string, number>;
      const ximatarKey = ((candidate.ximatar as string) || "").toString().toLowerCase();

      // SIGNAL 1: Identity match (0-40 pts)
      let identityScore = 0;
      // Why this candidate ranks where they do, as codes the UI translates.
      const reasons: Array<{ k: string; v?: string | number }> = [];
      // profiles.pillar_scores are stored 0-10; company pillar_vector is 0-100.
      // Both used to be divided by 10, so every candidate sat near 0-1 against a
      // company near 6-9 and the distance was the same for all of them: the
      // whole shortlist scored 33.6-34.0. Normalise each value to 0-10 instead.
      const toTen = (v: unknown, fallback: number) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return n > 10 ? n / 10 : n;
      };
      const candidatePillars = {
        drive: toTen(pillarScores.drive, 0),
        comp_power: toTen(pillarScores.computational_power ?? pillarScores.comp_power, 0),
        communication: toTen(pillarScores.communication, 0),
        creativity: toTen(pillarScores.creativity, 0),
        knowledge: toTen(pillarScores.knowledge, 0),
      };
      const companyPillarNorm = {
        drive: toTen(companyPillars.drive, 6),
        comp_power: toTen(companyPillars.comp_power ?? companyPillars.computational_power, 6),
        communication: toTen(companyPillars.communication, 6),
        creativity: toTen(companyPillars.creativity, 6),
        knowledge: toTen(companyPillars.knowledge, 6),
      };
      const distance = computePillarDistance(candidatePillars, companyPillarNorm);
      // Real profiles sit within a few points of any company vector, so the
      // theoretical maximum (10 on every pillar, ~22.4) compressed everyone into
      // the top of the range. An average gap of 5 points per pillar is treated
      // as no fit at all.
      const fitDistance = Math.sqrt(5 * (5 ** 2));
      const pillarFit = Math.max(0, 1 - distance / fitDistance);
      identityScore += 25 * pillarFit;
      reasons.push({ k: "pillar_fit", v: Math.round(pillarFit * 100) });
      const gaps = (Object.keys(companyPillarNorm) as (keyof typeof companyPillarNorm)[])
        .map((key) => ({ key, gap: candidatePillars[key] - companyPillarNorm[key] }))
        .sort((a, b) => a.gap - b.gap);
      if (gaps[0] && gaps[0].gap <= -1.5) reasons.push({ k: "pillar_below", v: gaps[0].key });
      const best = gaps[gaps.length - 1];
      if (best && best.gap >= 0) reasons.push({ k: "pillar_above", v: best.key });

      if (recommendedXimatars.includes(ximatarKey)) {
        const rank = recommendedXimatars.indexOf(ximatarKey);
        identityScore += rank === 0 ? 15 : rank === 1 ? 10 : 5;
        reasons.push({ k: "archetype_recommended", v: ximatarKey });
      }

      // SIGNAL 2: Growth trajectory (0-10 pts)
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
        // Halved (was 0-20). Growth is real signal, but the Growth Hub is
        // deliberately non-negative, so this axis can only ratchet upward and
        // must not dominate a hiring rank.
        trajectoryScore = Math.min(10, Math.max(0, totalGrowth));

        const deltas = Object.entries(totals)
          .filter(([, d]) => d !== 0)
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        trajectorySummary = deltas.length > 0
          ? deltas.slice(0, 2).map(([p, d]) => `${p} ${d > 0 ? '+' : ''}${d}`).join(", ")
          : "No recent growth";
      }

      // SIGNAL 3: Engagement (0-5 pts)
      let engagementScore = 0;
      let engagementLevel = "low";
      const engCount = engagementByUser.get(candidate.user_id) || 0;

      // Cut from 0-15 to 0-5. Feed rows read and recency of login measure
      // platform activity, not job fit; at 15 points they outweighed most of
      // what a candidate actually demonstrated.
      if (engCount >= 20) { engagementScore = 5; engagementLevel = "highly_active"; }
      else if (engCount >= 10) { engagementScore = 3; engagementLevel = "active"; }
      else if (engCount >= 3) { engagementScore = 2; engagementLevel = "moderate"; }

      if (candidate.profile_completed) engagementScore = Math.min(5, engagementScore + 1);

      // SIGNAL 2b: Demonstrated performance in challenges (0-20 pts).
      // This is the axis the product is supposed to be about, and it carried no
      // weight at all before.
      let performanceScore: number | null = null;
      let performanceSummary = "No challenges completed";
      const perf = performanceByProfile.get(String(candidate.id));
      if (perf && perf.count > 0) {
        // Mean challenge score maps 0-100 -> 0-18 ...
        performanceScore = Math.min(18, Math.max(0, (perf.mean / 100) * 18));
        // ... plus a small, capped bonus when the scores are backed by verified
        // quotes from the candidate rather than model assertion alone.
        if (perf.withEvidence > 0) performanceScore = Math.min(20, performanceScore + 2);
        performanceSummary = `${perf.count} challenge${perf.count === 1 ? '' : 's'}, avg ${Math.round(perf.mean)}`;
        reasons.push({ k: "challenges_done", v: perf.count });
      } else {
        reasons.push({ k: "no_challenges" });
      }

      // SIGNAL 4: Location (0-15 pts)
      let locationScore = 0;
      let locationMatch = "no_match";
      const desiredLocations = (candidate.desired_locations || []) as any[];
      const workPref = (candidate.work_preference || "") as string;
      const relocate = (candidate.willing_to_relocate || "") as string;

      const sameCountryWords: Record<string, string[]> = {
        it: ["it", "italy", "italia"], es: ["es", "spain", "españa", "espana"],
        de: ["de", "germany", "deutschland"], fr: ["fr", "france"], ch: ["ch", "switzerland", "svizzera", "schweiz"],
      };
      const goalCountryWords = sameCountryWords[goalCountry] || (goalCountry ? [goalCountry] : []);
      // Candidate locations are {city, region} with no country; an unset country
      // is read as the goal's country only when the goal names one.
      const locCountryMatches = (l: any) => {
        const c = ((l?.country as string) || "").trim().toLowerCase();
        return c ? goalCountryWords.includes(c) : goalCountryWords.length > 0;
      };

      if (goalWorkMode === "remote") {
        if (workPref === "remote" || desiredLocations.some((l: any) => l?.type === "remote")) {
          locationScore = 15; locationMatch = "remote";
        } else if (workPref === "flexible" || workPref === "hybrid") {
          locationScore = 10; locationMatch = "remote";
        }
      } else if (goalCity || goalCountry) {
        const cityMatch = goalCity && desiredLocations.some((l: any) => {
          const city = ((l?.city as string) || "").trim().toLowerCase();
          return city.length > 0 && (city === goalCity || goalCity.includes(city) || city.includes(goalCity));
        });
        if (cityMatch) {
          locationScore = 15; locationMatch = "exact";
        } else if (relocate === "yes" || relocate === "international") {
          locationScore = 8; locationMatch = "willing_to_relocate";
        } else if (relocate === "within_country" && desiredLocations.some(locCountryMatches)) {
          locationScore = 8; locationMatch = "willing_to_relocate";
        } else if (desiredLocations.length === 0 && !workPref) {
          locationMatch = "unknown";
        }
        if (workPref === "remote" && goalWorkMode === "onsite") {
          locationScore = Math.min(locationScore, 3);
          reasons.push({ k: "wants_remote" });
        }
      } else {
        locationScore = 5; locationMatch = "any";
      }
      reasons.push({ k: "location", v: locationMatch });

      // SIGNAL 5: Credentials (0-10 pts) against the goal's requirements.
      // null = no CV on file, shown as "not available" rather than a zero.
      let credentialScore: number | null = useCredentialFilters ? null : 0;
      if (useCredentialFilters) {
        const creds = credentialData.find(c => c.user_id === candidate.user_id);
        if (!creds) {
          reasons.push({ k: "no_cv" });
        } else {
          credentialScore = 0;
          const degreeRank = (raw: string) => {
            const d = (raw || "").toLowerCase();
            if (/phd|dottorato|doctor/.test(d)) return 4;
            if (/magistrale|master|msc|m\.sc|specialistica/.test(d)) return 3;
            if (/triennale|bachelor|bsc|b\.sc|laurea/.test(d)) return 2;
            if (/diploma|high_school|maturit/.test(d)) return 1;
            return 0;
          };
          const requiredDegree = degreeRank(goalReq.education_level || filters?.degree_type || "");
          if (requiredDegree > 0) {
            const bestDegree = Math.max(0, ...((creds.education || []) as any[]).map((e) => degreeRank(`${e.degree_type || ""}`)));
            if (bestDegree >= requiredDegree) { credentialScore += 4; reasons.push({ k: "education_meets" }); }
            else reasons.push({ k: "education_below" });
          }
          const minYears = goalReq.years_experience_min ?? filters?.min_experience;
          const maxYears = goalReq.years_experience_max;
          const years = creds.total_years_experience;
          if (minYears != null && years != null) {
            if (years >= minYears && (maxYears == null || years <= maxYears)) { credentialScore += 3; reasons.push({ k: "experience_in_range", v: years }); }
            else if (years < minYears) reasons.push({ k: "experience_below", v: years });
            else { credentialScore += 1; reasons.push({ k: "experience_above", v: years }); }
          }
          const langAliases: Record<string, string[]> = {
            english: ["english", "inglese", "inglés", "ingles"], italian: ["italian", "italiano"],
            spanish: ["spanish", "spagnolo", "español", "espanol"], german: ["german", "tedesco", "deutsch", "alemán"],
            french: ["french", "francese", "français", "francés"],
          };
          const wanted = (Array.isArray(goalReq.languages) ? goalReq.languages : []) as any[];
          if (wanted.length > 0) {
            const has = ((creds.languages || []) as any[]).filter((l) => !/basic|base|a1|a2/i.test(`${l.proficiency || ""} ${l.certification || ""}`))
              .map((l) => `${l.language || ""}`.toLowerCase());
            const missing = wanted.filter((w) => {
              const key = `${w.language || ""}`.toLowerCase();
              const names = langAliases[key] || [key];
              return !has.some((h) => names.includes(h));
            });
            if (missing.length === 0) { credentialScore += 3; reasons.push({ k: "languages_meet" }); }
            else reasons.push({ k: "language_missing", v: `${missing[0].language}` });
          }
          if (filters?.industry && ((creds.industries_worked || []) as string[]).some((ind) => ind.toLowerCase().includes(filters.industry.toLowerCase()))) {
            credentialScore = Math.min(10, credentialScore + 3);
          }
          credentialScore = Math.min(10, credentialScore);
        }
      }

      // 40 identity + 20 demonstrated + 10 trajectory + 5 engagement + 15 location + 10 credentials
      const totalScore = identityScore + (performanceScore ?? 0) + trajectoryScore + engagementScore + locationScore + (credentialScore ?? 0);

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
        performance_score: performanceScore == null ? null : Math.round(performanceScore * 10) / 10,
        performance_summary: performanceSummary,
        trajectory_score: Math.round(trajectoryScore * 10) / 10,
        engagement_score: Math.round(engagementScore * 10) / 10,
        location_score: Math.round(locationScore * 10) / 10,
        credential_score: credentialScore == null ? null : Math.round(credentialScore * 10) / 10,
        match_narrative: JSON.stringify(reasons),
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

    // Sort + limit. Scores are rounded to one decimal, so ties are common; without
    // a stable tie-breaker the top-N cut was arbitrary and a re-run could reorder
    // candidates who had not changed. Falls through to identity score, then id.
    scoredCandidates.sort((a, b) =>
      (b.total_score - a.total_score) ||
      (b.identity_score - a.identity_score) ||
      String(a.candidate_user_id).localeCompare(String(b.candidate_user_id))
    );
    const limit = filters?.limit || 20;
    const topCandidates = scoredCandidates.slice(0, limit);

    // PoC dry_run: skip ALL writes to shortlist_results (zero production impact).
    if (!isDryRun) {
      // Store results: delete old, insert new
      const { error: deleteError } = await serviceClient
        .from("shortlist_results")
        .delete()
        .eq("hiring_goal_id", hiring_goal_id)
        .eq("business_id", user.id);

      if (deleteError) {
        console.error(`[generate-shortlist] delete old shortlist error:`, JSON.stringify(deleteError));
        // Non-fatal — continue with insert
      }

      if (topCandidates.length > 0) {
        const inserts = topCandidates.map(c => ({
          hiring_goal_id,
          business_id: user.id,
          candidate_user_id: c.candidate_user_id,
          total_score: c.total_score,
          identity_score: c.identity_score,
          performance_score: c.performance_score,
          performance_summary: c.performance_summary,
          trajectory_score: c.trajectory_score,
          engagement_score: c.engagement_score,
          location_score: c.location_score,
          credential_score: c.credential_score,
          match_narrative: c.match_narrative,
          ximatar_archetype: c.ximatar_archetype,
          ximatar_level: c.ximatar_level,
          pillar_scores: c.pillar_scores,
          trajectory_summary: c.trajectory_summary,
          engagement_level: c.engagement_level,
          location_match: c.location_match,
          availability: c.availability,
          status: "shortlisted",
        }));

        const { error: insertError } = await serviceClient.from("shortlist_results").insert(inserts);
        if (insertError) {
          console.error(`[generate-shortlist] insert shortlist error:`, JSON.stringify(insertError));
          return errorResponse(500, "INSERT_ERROR", "Failed to save shortlist");
        }
      }
    }

    console.log(JSON.stringify({
      type: "shortlist_generated", correlation_id: correlationId,
      hiring_goal_id, total_evaluated: candidates.length,
      shortlisted: topCandidates.length,
      top_score: topCandidates[0]?.total_score || 0,
      dry_run: isDryRun,
    }));

    return jsonResponse({
      success: true,
      shortlist: topCandidates,
      total_candidates_evaluated: candidates.length,
      // True when the pool outgrew MAX_POOL and the ranking therefore covers
      // only part of it. Surfaced rather than hidden so the caller can say so.
      pool_truncated: poolTruncated,
      scoring_weights: {
        identity: "0-40 pts (pillar match + archetype fit)",
        performance: "0-20 pts (demonstrated performance in challenges)",
        trajectory: "0-10 pts (growth in last 90 days)",
        engagement: "0-5 pts (platform activity + profile completion)",
        location: "0-15 pts (location + work mode + relocation)",
        credentials: useCredentialFilters ? "0-10 pts (education + experience + languages vs the goal)" : "disabled (goal has no requirements)",
      },
    });
  } catch (err: any) {
    console.error(`[generate-shortlist] FATAL:`, err?.message, err?.stack);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
  }
});
