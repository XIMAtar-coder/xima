/**
 * Pillar Trajectory Engine — v1.0
 * 
 * Computes how platform interactions affect a user's XIMA pillar scores.
 * Every delta is logged to pillar_trajectory_log for growth tracking.
 * 
 * GRADIENT SYSTEM — not all interactions are equal:
 * - L1/L2 Challenges: highest impact (±3 to ±5)
 * - Open answers (core assessment): medium (±2 to ±4)
 * - Growth Hub tests: lowest per-event (±1 to ±3)
 *   Note: Only test RESULTS produce deltas. Course completion alone does NOT move scores.
 * 
 * POSITIVE BIAS: good performance gives larger deltas than bad takes away.
 * DIMINISHING RETURNS: extreme scores (85+) are harder to grow further.
 * SCORE BOUNDS: 0-100, clamped.
 * 
 * XIMATAR LEVELS:
 * Each archetype has 3 levels: L1 (Recognition), L2 (Development), L3 (Mastery).
 * Level-up criteria (same for L1→L2 and L2→L3):
 *   1. Weakest pillar (at level start) shows sustained growth
 *   2. Minimum 5 mentor interactions at current level
 *   3. Minimum 5 L2 challenges completed at current level
 *   4. Mentor confirms readiness (all level-ups require mentor confirmation)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rankXimatarsByDistance, type XimatarPillars } from "./ximatarTaxonomy.ts";

// =====================================================
// Types
// =====================================================

export interface PillarDeltas {
  drive: number;
  computational_power: number;
  communication: number;
  creativity: number;
  knowledge: number;
}

export type TrajectorySource = 
  | "l1_challenge"
  | "l2_challenge"
  | "open_answer"
  | "growth_hub_test"
  | "mentor_session";

export interface TrajectoryEvent {
  user_id: string;
  source_function: string;
  source_type: TrajectorySource;
  source_entity_id: string | null;
  correlation_id: string;
  deltas: PillarDeltas;
  reasoning: string;
}

// =====================================================
// Gradient configuration by source
// =====================================================

const GRADIENT_CONFIG: Record<TrajectorySource, { maxPositive: number; maxNegative: number }> = {
  l1_challenge:     { maxPositive: 5, maxNegative: -3 },
  l2_challenge:     { maxPositive: 5, maxNegative: -3 },
  open_answer:      { maxPositive: 4, maxNegative: -2 },
  growth_hub_test:  { maxPositive: 3, maxNegative: -1 },
  mentor_session:   { maxPositive: 0, maxNegative: 0 },
};

const PILLAR_KEYS: (keyof PillarDeltas)[] = ["drive", "computational_power", "communication", "creativity", "knowledge"];

// Mapping from PillarDeltas keys to profile pillar_scores keys
const PROFILE_PILLAR_MAP: Record<keyof PillarDeltas, string[]> = {
  drive: ["drive"],
  computational_power: ["computational_power", "comp_power"],
  communication: ["communication"],
  creativity: ["creativity"],
  knowledge: ["knowledge"],
};

function getProfilePillarValue(scores: Record<string, number>, key: keyof PillarDeltas): number {
  for (const alias of PROFILE_PILLAR_MAP[key]) {
    if (scores[alias] !== undefined) return scores[alias];
  }
  return 50;
}

// =====================================================
// Delta computation
// =====================================================

function applyGradient(rawDelta: number, source: TrajectorySource): number {
  const config = GRADIENT_CONFIG[source] || GRADIENT_CONFIG.open_answer;
  if (rawDelta > 0) return Math.min(rawDelta, config.maxPositive);
  return Math.max(rawDelta, config.maxNegative);
}

function applyDiminishingReturns(currentScore: number, rawDelta: number): number {
  if (rawDelta <= 0) return rawDelta;
  const headroom = 100 - currentScore;
  const factor = Math.max(0.2, headroom / 50);
  return Math.round(rawDelta * factor * 10) / 10;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute new pillar scores after applying gradient-adjusted, diminishing-return deltas.
 */
export function applyDeltas(
  currentScores: Record<string, number>,
  deltas: PillarDeltas,
  source: TrajectorySource
): Record<string, number> {
  const result: Record<string, number> = { ...currentScores };
  for (const key of PILLAR_KEYS) {
    const current = getProfilePillarValue(currentScores, key);
    const gradientClamped = applyGradient(deltas[key] || 0, source);
    const adjustedDelta = applyDiminishingReturns(current, gradientClamped);
    // Write back using the first key that exists, or the canonical key
    const writeKey = PROFILE_PILLAR_MAP[key].find(k => k in currentScores) || key;
    result[writeKey] = clampScore(current + adjustedDelta);
  }
  return result;
}

// =====================================================
// XIMAtar level check
// =====================================================

export interface LevelUpCheck {
  eligible: boolean;
  current_level: number;
  reason: string | null;
  missing_criteria: string[];
  evolution_eligible: boolean;
  suggested_new_archetype: string | null;
}

/**
 * Check if a user is eligible for XIMAtar level-up.
 * Does NOT perform the level-up — returns eligibility for mentor to confirm.
 */
export async function checkLevelUpEligibility(userId: string): Promise<LevelUpCheck> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return { eligible: false, current_level: 1, reason: "config_missing", missing_criteria: [], evolution_eligible: false, suggested_new_archetype: null };
    
    const client = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await client
      .from("profiles")
      .select("ximatar_name, ximatar_level, pillar_scores, level_start_scores, level_started_at")
      .eq("user_id", userId)
      .single();

    if (!profile) return { eligible: false, current_level: 1, reason: "no_profile", missing_criteria: [], evolution_eligible: false, suggested_new_archetype: null };

    const currentLevel = profile.ximatar_level || 1;
    if (currentLevel >= 3) {
      return await checkEvolutionEligibility(client, userId, profile);
    }

    const missing: string[] = [];
    const levelStartScores = (profile.level_start_scores || profile.pillar_scores) as Record<string, number> | null;
    const currentScores = profile.pillar_scores as Record<string, number> | null;

    // Criterion 1: Weakest pillar sustained growth
    if (levelStartScores && currentScores) {
      const weakestPillar = PILLAR_KEYS.reduce((weakest, key) => {
        const score = getProfilePillarValue(levelStartScores, key);
        const weakestScore = getProfilePillarValue(levelStartScores, weakest);
        return score < weakestScore ? key : weakest;
      }, PILLAR_KEYS[0]);

      const startValue = getProfilePillarValue(levelStartScores, weakestPillar);
      const currentValue = getProfilePillarValue(currentScores, weakestPillar);
      
      if (currentValue - startValue < 8) {
        missing.push(`weakest_pillar_growth:${weakestPillar} needs +8, has +${currentValue - startValue}`);
      }
    }

    // Criterion 2: At least 5 mentor interactions at current level
    const { count: mentorCount } = await client
      .from("pillar_trajectory_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source_type", "mentor_session")
      .gte("created_at", profile.level_started_at || "2020-01-01");

    if ((mentorCount || 0) < 5) {
      missing.push(`mentor_interactions:${mentorCount || 0}/5`);
    }

    // Criterion 3: At least 5 L2 challenges completed at current level
    const { count: l2Count } = await client
      .from("pillar_trajectory_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source_type", "l2_challenge")
      .gte("created_at", profile.level_started_at || "2020-01-01");

    if ((l2Count || 0) < 5) {
      missing.push(`l2_challenges:${l2Count || 0}/5`);
    }

    return {
      eligible: missing.length === 0,
      current_level: currentLevel,
      reason: missing.length === 0 ? "all_criteria_met" : null,
      missing_criteria: missing,
      evolution_eligible: false,
      suggested_new_archetype: null,
    };
  } catch (e) {
    console.error("[level_check] Error:", e instanceof Error ? e.message : e);
    return { eligible: false, current_level: 1, reason: "error", missing_criteria: [], evolution_eligible: false, suggested_new_archetype: null };
  }
}

async function checkEvolutionEligibility(client: any, userId: string, profile: any): Promise<LevelUpCheck> {
  const currentScores = profile.pillar_scores as Record<string, number> | null;
  if (!currentScores) return { eligible: false, current_level: 3, reason: "no_scores", missing_criteria: [], evolution_eligible: false, suggested_new_archetype: null };

  const pillarVector: XimatarPillars = {
    drive: currentScores.drive ?? 50,
    comp_power: currentScores.computational_power ?? currentScores.comp_power ?? 50,
    communication: currentScores.communication ?? 50,
    creativity: currentScores.creativity ?? 50,
    knowledge: currentScores.knowledge ?? 50,
  };

  const ranked = rankXimatarsByDistance(pillarVector);
  const closest = ranked[0];
  const currentArchetype = (profile.ximatar_name || "").toLowerCase();

  if (closest.id !== currentArchetype) {
    return {
      eligible: false,
      current_level: 3,
      reason: "evolution_possible",
      missing_criteria: [],
      evolution_eligible: true,
      suggested_new_archetype: closest.id,
    };
  }

  return {
    eligible: false,
    current_level: 3,
    reason: "at_max_level",
    missing_criteria: [],
    evolution_eligible: false,
    suggested_new_archetype: null,
  };
}

// =====================================================
// Persistence
// =====================================================

/**
 * Persist a trajectory event, update pillar scores, and check level-up eligibility.
 * Fire-and-forget: errors logged but never block the caller.
 */
export async function persistTrajectoryEvent(event: TrajectoryEvent): Promise<LevelUpCheck | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return null;
    const client = createClient(supabaseUrl, serviceKey);

    // 1. Log the trajectory event
    await client.from("pillar_trajectory_log").insert({
      user_id: event.user_id,
      source_function: event.source_function,
      source_type: event.source_type,
      source_entity_id: event.source_entity_id,
      correlation_id: event.correlation_id,
      drive_delta: event.deltas.drive,
      computational_power_delta: event.deltas.computational_power,
      communication_delta: event.deltas.communication,
      creativity_delta: event.deltas.creativity,
      knowledge_delta: event.deltas.knowledge,
      reasoning: event.reasoning,
    });

    // 2. Fetch current scores and apply deltas with gradient
    const { data: profile } = await client
      .from("profiles")
      .select("pillar_scores")
      .eq("user_id", event.user_id)
      .single();

    if (profile?.pillar_scores) {
      const currentScores = profile.pillar_scores as Record<string, number>;
      const newScores = applyDeltas(currentScores, event.deltas, event.source_type);
      
      await client
        .from("profiles")
        .update({ pillar_scores: newScores })
        .eq("user_id", event.user_id);
    }

    // 3. Check level-up eligibility
    const levelCheck = await checkLevelUpEligibility(event.user_id);
    
    // 4. If level-up eligible or evolution eligible, flag it on the profile
    if (levelCheck.eligible || levelCheck.evolution_eligible) {
      await client
        .from("profiles")
        .update({ 
          level_up_eligible: levelCheck.eligible,
          evolution_eligible: levelCheck.evolution_eligible,
          suggested_new_archetype: levelCheck.suggested_new_archetype,
        })
        .eq("user_id", event.user_id);
    }

    return levelCheck;
  } catch (e) {
    console.error("[trajectory] Error:", e instanceof Error ? e.message : e);
    return null;
  }
}
