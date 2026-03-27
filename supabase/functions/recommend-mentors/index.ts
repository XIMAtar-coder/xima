/**
 * XIMA recommend-mentors v2.0 — Gap-Driven Mentor Matching
 *
 * Two modes:
 * - "initial": Ranked mentor list for first assignment (post-assessment)
 * - "re_evaluate": Compare current mentor vs tension-optimal after CV upload
 *
 * Matching priority: CV tension gaps > pillar alignment > archetype compatibility > rating
 * Auth is optional — guests get basic matching.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES, type XimatarPillars } from "../_shared/ximatarTaxonomy.ts";
import { loadUserAiContext, buildContextBlock, updateUserAiContext } from "../_shared/aiContext.ts";
import { matchMentorsByGap, depositInference } from "../_shared/intelligenceEngine.ts";

// =====================================================
// Types
// =====================================================

interface MentorRecord {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  profile_image_url: string | null;
  specialties: string[];
  xima_pillars: string[];
  rating: number | null;
  experience_years: number | null;
  is_active: boolean;
  updated_at: string;
}

interface TensionGap {
  pillar: string;
  ximatar_score: number;
  cv_score: number;
  gap_direction: string;
  narrative?: string;
}

interface ScoredMentor extends MentorRecord {
  score: number;
  reasons: string[];
}

// =====================================================
// Gap-driven scoring (authenticated + CV tension)
// =====================================================

function computeMentorScoreWithTension(
  mentor: MentorRecord,
  tensionGaps: TensionGap[],
  userArchetype: string,
  userLevel: number,
  alignmentScore: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const mentorPillars = (mentor.xima_pillars || []).map(p =>
    p === "computational" ? "computational_power" : p
  );

  // 1. Gap coverage (0-45) — PRIMARY SIGNAL
  const undersoldGaps = tensionGaps.filter(g => g.gap_direction === "undersold");
  let gapCoverage = 0;
  const coveredGaps: string[] = [];

  for (const gap of undersoldGaps) {
    if (mentorPillars.includes(gap.pillar)) {
      const gapSize = gap.ximatar_score - gap.cv_score;
      gapCoverage += Math.min(15, gapSize / 3);
      coveredGaps.push(gap.pillar);
    }
  }
  score += Math.min(45, gapCoverage);

  if (coveredGaps.length > 0) {
    reasons.push(`Specializes in ${coveredGaps.map(p => p.replace("_", " ")).join(" and ")} — your key growth areas`);
  }

  // 2. Archetype journey alignment (0-25)
  const mentorSpecialties = (mentor.specialties || []).map(s => s.toLowerCase());
  const archetypeProfile = XIMATAR_PROFILES[userArchetype];

  if (archetypeProfile) {
    const relevantTags = archetypeProfile.tags.filter(tag =>
      mentorSpecialties.some(s => s.includes(tag) || tag.includes(s))
    );
    score += Math.min(15, relevantTags.length * 5);
    if (relevantTags.length > 0) {
      reasons.push(`Experienced with ${archetypeProfile.name}-type professionals`);
    }
  }

  if (userLevel >= 2 && mentor.experience_years && mentor.experience_years >= 5) {
    score += 5;
    reasons.push("Senior mentor for advanced development");
  } else if (userLevel === 1) {
    score += 5;
  }

  // 3. Alignment score factor (0-15) — low alignment = more value
  const needFactor = Math.max(0, 100 - (alignmentScore || 50));
  score += Math.round(needFactor * 0.15);
  if (alignmentScore < 50) {
    reasons.push("High-impact opportunity — significant gap to bridge");
  }

  // 4. Rating bonus (0-10)
  if (mentor.rating) {
    score += Math.round((mentor.rating / 5) * 10);
  }

  return { score: Math.min(100, score), reasons };
}

// =====================================================
// Basic scoring (guest or no CV tension)
// =====================================================

function computeMentorScoreBasic(
  mentor: MentorRecord,
  pillarScores: Array<{ pillar: string; score: number }>,
  userXimatar: string | null
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const sortedPillars = [...pillarScores].sort((a, b) => b.score - a.score);
  const weakestPillar = sortedPillars[sortedPillars.length - 1]?.pillar;
  const strongestPillar = sortedPillars[0]?.pillar;

  const mentorPillars = (mentor.xima_pillars || []).map(p =>
    p === "computational" ? "computational_power" : p
  );

  // Growth potential
  const coversWeakness = weakestPillar && mentorPillars.includes(weakestPillar);
  const growthScore = coversWeakness ? 40 : 15;
  if (coversWeakness) reasons.push(`Can help develop your ${weakestPillar.replace("_", " ")}`);

  // Strength alignment
  const coversStrength = strongestPillar && mentorPillars.includes(strongestPillar);
  const alignScore = coversStrength ? 25 : 10;
  if (coversStrength) reasons.push(`Matches your strength in ${strongestPillar.replace("_", " ")}`);

  // XIMAtar compatibility
  let ximatarScore = 15;
  if (userXimatar && XIMATAR_PROFILES[userXimatar]) {
    const profile = XIMATAR_PROFILES[userXimatar];
    const topArchetypePillars = Object.entries(profile.pillars)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);
    const matches = mentorPillars.filter(p => topArchetypePillars.includes(p));
    ximatarScore = matches.length > 0 ? 25 : 10;
    if (matches.length > 0) reasons.push(`Complements your ${profile.name} profile`);
  }

  // Rating
  const ratingScore = mentor.rating ? Math.round((mentor.rating / 5) * 15) : 10;

  return {
    score: Math.min(100, growthScore + alignScore + ximatarScore + ratingScore),
    reasons: reasons.length > 0 ? reasons : ["Recommended mentor"],
  };
}

// =====================================================
// Seeded shuffle (kept from v1)
// =====================================================

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = Math.abs((hash * 1103515245 + 12345) & 0x7fffffff);
    const j = hash % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional auth
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (!authError && user) userId = user.id;
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const { pillar_scores, ximatar, refresh_seed, mode, current_mentor_id } = body;

    console.log(JSON.stringify({ type: "recommend_mentors_start", correlation_id: correlationId, user_id: userId, mode: mode || "initial", is_guest: !userId }));

    // ---- Intelligence Engine: try vector gap matching first (FREE) ----
    let vectorMentorMatches: any[] = [];
    if (userId) {
      vectorMentorMatches = await matchMentorsByGap(userId, 10);
      if (vectorMentorMatches.length > 0) {
        console.log(`[intelligence] Vector gap-matched ${vectorMentorMatches.length} mentors for user ${userId.substring(0, 8)}`);
      }
    }

    // ---- Fetch mentors ----
    const { data: mentors, error: mentorsError } = await supabase
      .from("mentors")
      .select("id, name, title, bio, profile_image_url, specialties, xima_pillars, rating, experience_years, is_active, updated_at")
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (mentorsError || !mentors || mentors.length === 0) {
      return jsonResponse({ recommendations: [], message: "No active mentors available" });
    }

    // ---- Determine matching mode ----
    let hasTension = false;
    let tensionGaps: TensionGap[] = [];
    let alignmentScore = 50;
    let mentorSuggestedFocus: string | null = null;
    let mentorKeyQuestion: string | null = null;
    let userArchetype: string | null = ximatar || null;
    let userLevel = 1;
    let userPillarScores = pillar_scores || [];

    if (userId) {
      // Fetch authenticated user data
      const [profileRes, cvAnalysisRes] = await Promise.all([
        supabase.from("profiles")
          .select("ximatar_archetype, ximatar, ximatar_id, ximatar_level, assessment_scores, pillar_scores")
          .eq("user_id", userId).single(),
        supabase.from("cv_identity_analysis")
          .select("tension_gaps, alignment_score, mentor_suggested_focus, mentor_key_question")
          .eq("user_id", userId).maybeSingle(),
      ]);

      const profile = profileRes.data;
      const resolvedXimatar = (profile?.ximatar_archetype || profile?.ximatar || profile?.ximatar_id) as string | null;
      if (resolvedXimatar) {
        userArchetype = resolvedXimatar;
        userLevel = (profile?.ximatar_level || 1) as number;
        // Convert assessment_scores/pillar_scores to pillar_scores array
        const scores = (profile?.assessment_scores || profile?.pillar_scores) as Record<string, number> | null;
        if (scores) {
          userPillarScores = Object.entries(scores).map(([pillar, score]) => ({ pillar, score }));
        }
      }

      const cvAnalysis = cvAnalysisRes.data;
      if (cvAnalysis?.tension_gaps && Array.isArray(cvAnalysis.tension_gaps) && cvAnalysis.tension_gaps.length > 0) {
        hasTension = true;
        tensionGaps = cvAnalysis.tension_gaps as TensionGap[];
        alignmentScore = cvAnalysis.alignment_score ?? 50;
        mentorSuggestedFocus = cvAnalysis.mentor_suggested_focus;
        mentorKeyQuestion = cvAnalysis.mentor_key_question;
      }
    }

    // ---- Re-evaluation mode ----
    if (mode === "re_evaluate" && userId && current_mentor_id) {
      const currentMentor = mentors.find((m: MentorRecord) => m.id === current_mentor_id);
      if (!currentMentor) {
        return jsonResponse({ mode: "re_evaluate", error: "Current mentor not found" });
      }

      // Check if first free session completed
      const { data: sessions } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("user_id", userId)
        .eq("mentor_id", current_mentor_id)
        .in("status", ["completed", "attended"])
        .limit(1);

      const firstFreeSessionCompleted = sessions && sessions.length > 0;

      // Score current mentor with tension data
      const currentScore = hasTension
        ? computeMentorScoreWithTension(currentMentor, tensionGaps, userArchetype || "", userLevel, alignmentScore)
        : computeMentorScoreBasic(currentMentor, userPillarScores, userArchetype);

      // Score all others to find best alternative
      const alternatives = mentors
        .filter((m: MentorRecord) => m.id !== current_mentor_id)
        .map((m: MentorRecord) => {
          const s = hasTension
            ? computeMentorScoreWithTension(m, tensionGaps, userArchetype || "", userLevel, alignmentScore)
            : computeMentorScoreBasic(m, userPillarScores, userArchetype);
          return { ...m, score: s.score, reasons: s.reasons } as ScoredMentor;
        })
        .sort((a, b) => b.score - a.score);

      const bestAlternative = alternatives[0];
      const changeRecommended = bestAlternative && bestAlternative.score > currentScore.score + 15;

      const primaryGap = tensionGaps.find(g => g.gap_direction === "undersold");

      return jsonResponse({
        mode: "re_evaluate",
        current_mentor: {
          id: currentMentor.id,
          name: currentMentor.name,
          updated_compatibility_score: currentScore.score,
          original_matching_context: "assessment_only",
          new_matching_context: hasTension ? "full_profile_with_tension" : "assessment_only",
        },
        change_recommended: changeRecommended,
        can_change: !firstFreeSessionCompleted,
        change_reason: changeRecommended
          ? `Based on your CV analysis, your key growth area is ${primaryGap?.pillar?.replace("_", " ") || "identified"}. ${bestAlternative.name} specializes in this area.`
          : null,
        best_alternative: changeRecommended
          ? { id: bestAlternative.id, name: bestAlternative.name, compatibility_score: bestAlternative.score, match_reasons: bestAlternative.reasons }
          : null,
        change_blocked_reason: firstFreeSessionCompleted
          ? "Mentor change after first session requires a mentor subscription"
          : null,
      });
    }

    // ---- Initial mode: score all mentors ----
    const scored: ScoredMentor[] = mentors.map((mentor: MentorRecord) => {
      const { score, reasons } = hasTension
        ? computeMentorScoreWithTension(mentor, tensionGaps, userArchetype || "", userLevel, alignmentScore)
        : computeMentorScoreBasic(mentor, userPillarScores, userArchetype);
      return { ...mentor, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);

    // Apply seeded shuffle within score buckets
    let finalList = scored;
    if (refresh_seed && typeof refresh_seed === "string") {
      const buckets = new Map<number, ScoredMentor[]>();
      for (const m of scored) {
        const bucket = Math.floor(m.score / 10) * 10;
        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(m);
      }
      finalList = [];
      for (const bucket of [...buckets.keys()].sort((a, b) => b - a)) {
        finalList.push(...seededShuffle(buckets.get(bucket)!, refresh_seed));
      }
    }

    const topMentors = finalList.slice(0, 10);

    // ---- Claude narratives for top 5 ----
    let narratives: string[] = [];

    if (topMentors.length > 0) {
      try {
        const archetypeProfile = userArchetype ? XIMATAR_PROFILES[userArchetype] : null;
        const strongestPillar = userPillarScores.length > 0
          ? [...userPillarScores].sort((a: any, b: any) => b.score - a.score)[0]?.pillar
          : null;
        const weakestPillar = userPillarScores.length > 0
          ? [...userPillarScores].sort((a: any, b: any) => a.score - b.score)[0]?.pillar
          : null;

        // Load AI context for narrative enrichment
        const userContextData = userId ? await loadUserAiContext(userId) : {};
        const contextBlock = buildContextBlock(userContextData);

        const narrativePrompt = `You are XIMA, a psychometric talent platform.
Generate a personalized 1-2 sentence explanation for each mentor match.
${contextBlock}

USER CONTEXT:
- XIMAtar: ${userArchetype || "unknown"} L${userLevel} (${archetypeProfile?.title || "unknown"})
${hasTension ? `- Key tension: alignment score ${alignmentScore}/100` : `- Strongest: ${strongestPillar}, Weakest: ${weakestPillar}`}
${mentorSuggestedFocus ? `- Mentor focus: ${mentorSuggestedFocus}` : ""}

For each mentor, explain how they can specifically help THIS user grow.
Be warm, specific, focused on the growth opportunity.
Write in Italian if appropriate, otherwise English.

MENTORS:
${topMentors.slice(0, 5).map((m, i) => `${i + 1}. ${m.name} — ${m.title || "Mentor"}, specialties: ${(m.specialties || []).join(", ") || "general"}, pillars: ${(m.xima_pillars || []).join(", ")}`).join("\n")}

Return ONLY a JSON array of strings:
["narrative 1", "narrative 2", ...]`;

        const result = await callAnthropicApi({
          system: "You generate short personalized mentor match explanations for XIMA users. Return ONLY a JSON array of strings.",
          userMessage: narrativePrompt,
          correlationId,
          functionName: "recommend-mentors",
          inputSummary: `narratives:${Math.min(5, topMentors.length)}mentors`,
          maxTokens: 1536,
          temperature: 0.7,
        });

        const extracted = extractJsonFromAiContent(result.content);
        const parsed = JSON.parse(extracted || result.content);
        if (Array.isArray(parsed)) narratives = parsed;
      } catch (e) {
        console.warn(JSON.stringify({ type: "mentor_narrative_fallback", correlation_id: correlationId, error: e instanceof Error ? e.message : String(e) }));
      }
    }

    // Update progressive AI context
    if (userId && topMentors.length > 0) {
      const existingMatching = (userId ? (await loadUserAiContext(userId)).matching_preferences : null) || {};
      await updateUserAiContext(userId, {
        matching_preferences: {
          ...existingMatching,
          mentor_matched: topMentors[0].name,
          mentor_focus: mentorSuggestedFocus,
          last_mentor_match_at: new Date().toISOString(),
        },
        matching_updated_at: new Date().toISOString(),
      });
    }

    // ---- Build response ----
    const primaryGap = tensionGaps.find(g => g.gap_direction === "undersold");

    const response = {
      recommendations: topMentors.map((mentor, i) => ({
        id: mentor.id,
        name: mentor.name,
        title: mentor.title,
        bio: mentor.bio,
        profile_image_url: mentor.profile_image_url,
        specialties: mentor.specialties,
        xima_pillars: mentor.xima_pillars,
        rating: mentor.rating,
        experience_years: mentor.experience_years,
        compatibility_score: mentor.score,
        match_reasons: mentor.reasons,
        xima_narrative: narratives[i] || mentor.reasons.join(". "),
        ...(hasTension ? {
          growth_focus: {
            primary_gap: primaryGap?.pillar || null,
            suggested_session_topic: mentorSuggestedFocus,
            key_question: mentorKeyQuestion,
          },
        } : {}),
      })),
      matching_context: hasTension ? "full_profile_with_tension" : userId ? "assessment_only" : "guest",
      has_cv_tension: hasTension,
    };

    // Audit (only for authenticated users)
    if (userId) {
      emitAuditEventWithMetric({
        actorType: "candidate",
        actorId: userId,
        action: "mentors.recommended",
        entityType: "mentor_recommendation",
        correlationId,
        metadata: {
          mentors_returned: topMentors.length,
          top_score: topMentors[0]?.score || 0,
          matching_context: hasTension ? "full_profile" : "basic_assessment",
          user_ximatar: userArchetype,
        },
      }, "mentor_recommendations");
    }

    console.log(JSON.stringify({ type: "recommend_mentors_done", correlation_id: correlationId, returned: topMentors.length, context: hasTension ? "tension" : "basic" }));

    return jsonResponse(response);
  } catch (error) {
    console.error(JSON.stringify({ type: "recommend_mentors_error", correlation_id: correlationId, error: error instanceof Error ? error.message : String(error) }));
    // Return 200 for graceful frontend handling
    return jsonResponse({ recommendations: [], error: "Failed to generate mentor recommendations" });
  }
});
