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
 * SYMMETRY: a pillar score that cannot fall is an engagement metric, not a
 *   measurement — and these scores feed hiring decisions. Gains and losses are
 *   therefore capped equally, and diminishing returns apply in both directions.
 *   (Growth Hub remains non-negative by deliberate exception: it is a practice
 *   space, and punishing practice would be perverse. Its influence on hiring
 *   signals is limited at the ranking layer instead.)
 * DIMINISHING RETURNS: extreme scores are harder to move further, up or down.
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
  | "l3_challenge"
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
  /**
   * The candidate's own words for this submission, when the caller has them.
   *
   * Supplied so the event can be refused rather than graded. A blank or
   * near-blank submission is missing data, not demonstrated weakness, and the
   * grader does not distinguish the two: it reads an empty box as total absence
   * of ability and returns the maximum penalty on every pillar. Four live
   * submissions were scored that way, with reasoning recorded as "nessuna
   * risposta valida" and "totale mancanza di impegno".
   *
   * Omit only when there is genuinely no source text to check.
   */
  response_text?: string | null;
}

/**
 * Shortest submission worth grading, in characters after whitespace collapse.
 *
 * Not a quality bar — a bad twenty-character answer still gets graded and can
 * still lose points. This only separates "answered badly" from "did not answer",
 * which are different facts about a candidate and should not produce the same
 * score.
 */
export const MIN_GRADABLE_LENGTH = 20;

/**
 * True when a submission carries too little to assess.
 *
 * Exported so callers can skip the model call entirely rather than pay for a
 * grade they are going to discard.
 */
export function isUngradable(responseText: string | null | undefined): boolean {
  if (responseText === null || responseText === undefined) return false; // nothing claimed, nothing refused
  return responseText.replace(/\s+/g, " ").trim().length < MIN_GRADABLE_LENGTH;
}

const ZERO_DELTAS: PillarDeltas = {
  drive: 0,
  computational_power: 0,
  communication: 0,
  creativity: 0,
  knowledge: 0,
};

// =====================================================
// Gradient configuration by source
// =====================================================

// Symmetric by design: an assessed pillar must be able to move down as far as it
// can move up, or "growth" is just accumulated participation.
const GRADIENT_CONFIG: Record<TrajectorySource, { maxPositive: number; maxNegative: number }> = {
  l1_challenge:     { maxPositive: 5, maxNegative: -5 },
  l2_challenge:     { maxPositive: 5, maxNegative: -5 },
  l3_challenge:     { maxPositive: 4, maxNegative: -4 },
  open_answer:      { maxPositive: 4, maxNegative: -4 },
  // Deliberate exception — a practice space should not penalise practising.
  growth_hub_test:  { maxPositive: 3, maxNegative: 0 },
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
  if (rawDelta === 0) return 0;
  // Applied in both directions. Previously gains were damped near the ceiling
  // while losses passed through at full force, which made the curve asymmetric
  // in the opposite direction to the caps above. Distance to the relevant bound
  // is what should slow a move, whichever way it is going.
  const room = rawDelta > 0 ? 100 - currentScore : currentScore;
  // Clamped to 1. Without the upper bound this function amplified rather than
  // damped whenever room > 50: a graded -5 at score 100 moved the pillar -10,
  // and a graded +5 at score 0 moved it +10. The +/-5 gradient cap above was
  // therefore not a cap at all, and the damage fell hardest on strong
  // candidates, who have the most room beneath them for a single bad answer to
  // eat. A move may now be slowed by proximity to the bound it is approaching,
  // but never exceeds what the grader actually awarded.
  const factor = Math.min(1, Math.max(0.2, room / 50));
  // 2-decimal precision matches pillar_trajectory_log numeric(5,2); avoids drift across many events.
  return Math.round(rawDelta * factor * 100) / 100;
}

function clampScore(score: number): number {
  // Keep 2-decimal precision in pillar_scores jsonb; UI rounds at the display layer.
  const bounded = Math.max(0, Math.min(100, score));
  return Math.round(bounded * 100) / 100;
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

    // A submission with nothing in it is refused rather than graded. The row is
    // still written, with zero deltas and a reason: it is the record that this
    // submission was seen and deliberately not scored, and the idempotency
    // pre-checks upstream look for exactly this row to avoid re-grading. Only
    // the profile write below is skipped.
    const ungradable = isUngradable(event.response_text);
    const deltas = ungradable ? ZERO_DELTAS : event.deltas;
    const reasoning = ungradable
      ? `NOT GRADED — submission too short to assess (< ${MIN_GRADABLE_LENGTH} chars). ` +
        `A missing answer is absent evidence, not evidence of absence. Flagged for human review.`
      : event.reasoning;

    if (ungradable) {
      console.warn(JSON.stringify({
        type: "submission_not_graded",
        correlation_id: event.correlation_id,
        function_name: event.source_function,
        source_type: event.source_type,
        source_entity_id: event.source_entity_id,
        reason: "below_min_gradable_length",
      }));
    }

    // 1. Log the trajectory event
    await client.from("pillar_trajectory_log").insert({
      user_id: event.user_id,
      source_function: event.source_function,
      source_type: event.source_type,
      source_entity_id: event.source_entity_id,
      correlation_id: event.correlation_id,
      drive_delta: deltas.drive,
      computational_power_delta: deltas.computational_power,
      communication_delta: deltas.communication,
      creativity_delta: deltas.creativity,
      knowledge_delta: deltas.knowledge,
      reasoning,
    });

    // Nothing was measured, so nothing moves.
    if (ungradable) return null;

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
