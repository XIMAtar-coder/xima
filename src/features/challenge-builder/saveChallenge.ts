/**
 * Unified challenge payload builder.
 *
 * Single source of truth for INSERT/UPDATE payloads on `business_challenges`,
 * shared by three creation flows:
 *   - XIMA Core L1 builder (`/business/challenges/xima-core`)               → type: 'xima-core'
 *   - Custom L1 AI-driven  (`/business/challenges/new?type=custom`)          → type: 'custom-ai'
 *   - Legacy Custom edit   (existing rows w/o AI scenario, edit-mode only)   → type: 'custom'
 *
 * Product decision: ALL L1 payloads persist `level: 1` EXPLICITLY (never
 * relying on the DB default of 2). Custom (legacy and AI-driven) are L1
 * alternatives to XIMA Core; they can COEXIST per goal (one XCore + one
 * Custom-AI active simultaneously — see archiveSiblingsScope below).
 *
 * Markers (use these for type-scoped queries / detection):
 *   - XIMA Core      → rubric.isXimaCore = true   AND config_json.xima_core = true
 *   - Custom L1 AI   → rubric.isXimaCore = false  AND config_json.custom_l1_ai = true
 *   - Legacy Custom  → no AI markers (rubric.criteria = {outcome,clarity,reasoning})
 */

import type { Json } from '@/integrations/supabase/types';

export type ChallengeBuilderType = 'xima-core' | 'custom' | 'custom-ai';

export type ChallengeStatus = 'draft' | 'active' | 'archived';

export type PillarKey =
  | 'drive'
  | 'computational_power'
  | 'communication'
  | 'creativity'
  | 'knowledge';

export const ALL_PILLARS: PillarKey[] = [
  'drive',
  'computational_power',
  'communication',
  'creativity',
  'knowledge',
];

interface XimaCoreInput {
  type: 'xima-core';
  businessId: string;
  goalId: string | null;
  jobPostId: string | null;
  startAt: string;
  endAt: string;
  ximaCoreTitle: string;
  description: string;
  successCriteria: string[];
  timeEstimateMinutes: number;
  canonicalRubricCriteria: Json;
  scenario: string;
  contextTag: string;
  candidateIntro: string;
  questions: unknown;
  generatedTimeEstimate: number;
  generatedMindset: Record<string, unknown> | null;
  contextSnapshot: Json | null;
  evaluationLens: Json | null;
  expectedTensions: Json | null;
  fallbackContext: { roleTitle: string; industry: string };
}

interface CustomLegacyInput {
  type: 'custom';
  businessId: string;
  goalId: string | null;
  title: string;
  description: string;
  successCriteria: string[];
  timeEstimateMinutes: number;
  status: ChallengeStatus;
  startAt: string | null;
  endAt: string | null;
}

export interface CustomL1Question {
  id: string;
  title: string;
  text: string;
}

interface CustomAiInput {
  type: 'custom-ai';
  businessId: string;
  goalId: string | null;
  title: string;
  description: string;
  successCriteria: string[];
  timeEstimateMinutes: number;
  status: ChallengeStatus;
  startAt: string | null;
  endAt: string | null;
  // AI-generated rich payload (same shape as XCore for the evaluator)
  scenario: string;
  contextTag: string;
  candidateIntro: string;
  questions: CustomL1Question[];
  contextSnapshot: Json | null;
  evaluationLens: Json | null;
  expectedTensions: Json | null;
  // Business orientation parameters
  focusPillars: PillarKey[];
  customScenarioHint: string | null;
  difficulty: 1 | 2 | 3;
  locale: string;
  durationMinutes: number;
  numQuestions: number;
}

export type BuildChallengePayloadInput =
  | XimaCoreInput
  | CustomLegacyInput
  | CustomAiInput;

/**
 * Build a "balanced 5-pillar" rubric weighted by focus pillars.
 *
 * NOTE on evaluator behavior (verified against analyze-open-answer):
 * the L1 evaluator does NOT read `rubric.criteria`. For
 * scoring_context='l1_challenge' it reads `evaluation_lens` (signals across
 * the 5 pillars). The rubric.criteria here is therefore innocuous metadata —
 * we keep it for audit / future use, but the real "focus" lever lives in
 * the evaluation_lens produced by the edge function (which is asked to
 * emit RICHER signals for the focused pillars).
 */
export function buildBalancedRubricCriteria(
  focusPillars: PillarKey[] = []
): Record<PillarKey, number> {
  const focus = new Set<PillarKey>(focusPillars);
  const base = 2;
  const emphasized = 4;
  return {
    drive: focus.has('drive') ? emphasized : base,
    computational_power: focus.has('computational_power') ? emphasized : base,
    communication: focus.has('communication') ? emphasized : base,
    creativity: focus.has('creativity') ? emphasized : base,
    knowledge: focus.has('knowledge') ? emphasized : base,
  };
}

export function buildChallengePayload(
  input: BuildChallengePayloadInput
): Record<string, unknown> {
  if (input.type === 'xima-core') {
    const contextSnapshot: Json =
      input.contextSnapshot ??
      ({
        role_title: input.fallbackContext.roleTitle,
        industry: input.fallbackContext.industry,
        context_tag: input.contextTag,
        generated_at: new Date().toISOString(),
      } as Json);

    return {
      title: input.ximaCoreTitle,
      description: input.description,
      success_criteria: input.successCriteria,
      time_estimate_minutes: input.timeEstimateMinutes,
      rubric: {
        criteria: input.canonicalRubricCriteria,
        scenario: input.scenario,
        level: 1,
        isXimaCore: true,
        context_tag: input.contextTag,
        candidate_intro: input.candidateIntro,
      },
      config_json: {
        xima_core: true,
        questions: input.questions,
        candidate_intro: input.candidateIntro,
        generated_time_estimate: input.generatedTimeEstimate,
        context_tag: input.contextTag,
        ...(input.generatedMindset ? input.generatedMindset : {}),
      },
      context_snapshot: contextSnapshot,
      evaluation_lens: input.evaluationLens,
      expected_tensions: input.expectedTensions,
      status: 'active',
      business_id: input.businessId,
      hiring_goal_id: input.goalId,
      job_post_id: input.jobPostId,
      start_at: new Date(input.startAt).toISOString(),
      end_at: new Date(input.endAt).toISOString(),
      difficulty: 1,
      level: 1,
    };
  }

  if (input.type === 'custom-ai') {
    return {
      title: input.title,
      description: input.description,
      success_criteria: input.successCriteria,
      time_estimate_minutes: input.timeEstimateMinutes,
      rubric: {
        // 5-pillar criteria, weighted by focus (kept for audit; evaluator
        // reads evaluation_lens, not these weights).
        criteria: buildBalancedRubricCriteria(input.focusPillars),
        scenario: input.scenario,
        level: 1,
        isXimaCore: false, // explicit negative marker
        context_tag: input.contextTag,
        candidate_intro: input.candidateIntro,
        focus_pillars: input.focusPillars,
        difficulty: input.difficulty,
      },
      config_json: {
        xima_core: false, // explicit negative marker
        custom_l1_ai: true, // positive marker for Custom L1 AI-driven
        questions: input.questions,
        candidate_intro: input.candidateIntro,
        generated_time_estimate: input.timeEstimateMinutes,
        context_tag: input.contextTag,
        params: {
          focus_pillars: input.focusPillars,
          custom_scenario_hint: input.customScenarioHint,
          difficulty: input.difficulty,
          locale: input.locale,
          duration_minutes: input.durationMinutes,
          num_questions: input.numQuestions,
        },
      },
      context_snapshot: input.contextSnapshot,
      evaluation_lens: input.evaluationLens,
      expected_tensions: input.expectedTensions,
      status: input.status,
      business_id: input.businessId,
      hiring_goal_id: input.goalId,
      job_post_id: null,
      start_at: input.startAt ? new Date(input.startAt).toISOString() : null,
      end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
      difficulty: input.difficulty,
      level: 1,
    };
  }

  // type === 'custom' (legacy)
  return {
    title: input.title,
    description: input.description,
    success_criteria: input.successCriteria,
    time_estimate_minutes: input.timeEstimateMinutes,
    rubric: { criteria: { outcome: 3, clarity: 3, reasoning: 3 } },
    status: input.status,
    start_at: input.startAt ? new Date(input.startAt).toISOString() : null,
    end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
    business_id: input.businessId,
    hiring_goal_id: input.goalId,
    level: 1,
  };
}

export function buildCustomChallengeUpdate(input: {
  title: string;
  description: string;
  successCriteria: string[];
  timeEstimateMinutes: number;
  status: ChallengeStatus;
  startAt: string | null;
  endAt: string | null;
}): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description,
    success_criteria: input.successCriteria,
    time_estimate_minutes: input.timeEstimateMinutes,
    rubric: { criteria: { outcome: 3, clarity: 3, reasoning: 3 } },
    status: input.status,
    start_at: input.startAt ? new Date(input.startAt).toISOString() : null,
    end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
    level: 1,
    updated_at: new Date().toISOString(),
  };
}

export function isXimaCoreChallenge(
  row: { config_json?: any; rubric?: any } | null | undefined
): boolean {
  if (!row) return false;
  return row.config_json?.xima_core === true || row.rubric?.isXimaCore === true;
}

export function isCustomL1AiChallenge(
  row: { config_json?: any; rubric?: any } | null | undefined
): boolean {
  if (!row) return false;
  if (row.config_json?.custom_l1_ai === true) return true;
  // Defensive: a row with level=1 + isXimaCore=false + rubric.scenario looks
  // like a Custom-AI row even if config_json marker is missing.
  return (
    row.rubric?.level === 1 &&
    row.rubric?.isXimaCore === false &&
    typeof row.rubric?.scenario === 'string'
  );
}

/**
 * Type-scoped archive query helper.
 *
 * Product rule: max ONE active XCore + max ONE active Custom-AI per goal.
 * Activating an XCore archives only OTHER active XCore rows on the same
 * goal (NEVER the Custom-AI). Activating a Custom-AI archives only OTHER
 * active Custom-AI rows (NEVER the XCore). Legacy custom rows (no AI
 * markers) are not auto-archived by either flow.
 *
 * Returns an `.eq(...)` / `.contains(...)` filter spec the caller applies
 * to a supabase update query against `business_challenges`.
 */
export type ArchiveScope = 'xima-core' | 'custom-ai';

export function archiveSiblingsContainsFilter(
  scope: ArchiveScope
): Record<string, unknown> {
  if (scope === 'xima-core') {
    // Match by rubric.isXimaCore = true (canonical XCore marker).
    return { isXimaCore: true };
  }
  // Custom-AI: match by config_json.custom_l1_ai = true.
  return { custom_l1_ai: true };
}
