/**
 * Unified challenge payload builder.
 *
 * Single source of truth for INSERT/UPDATE payloads on `business_challenges`,
 * shared by both creation flows:
 *   - XIMA Core L1 builder (`/business/challenges/xima-core`)
 *   - Custom L1 builder    (`/business/challenges/new?type=custom`)
 *
 * Product decision: BOTH types persist `level: 1` EXPLICITLY (never relying on
 * the DB default, which is 2). Custom is an L1 alternative to XIMA Core.
 *
 * The XCore branch reproduces today's CreateXimaCoreChallenge.tsx insert
 * payload bit-per-bit (markers `rubric.isXimaCore` + `config_json.xima_core`,
 * `context_snapshot`, `evaluation_lens`, `expected_tensions`,
 * `success_criteria` from localized questions, `difficulty: 1`, status forced
 * to 'active').
 *
 * The custom branch reproduces today's CreateChallenge.tsx insert payload
 * (generic rubric, user-chosen status, no XCore markers, no config_json)
 * with the SINGLE intentional change: `level: 1` is now explicit.
 */

import type { Json } from '@/integrations/supabase/types';

export type ChallengeBuilderType = 'xima-core' | 'custom';

export type ChallengeStatus = 'draft' | 'active' | 'archived';

interface XimaCoreInput {
  type: 'xima-core';
  businessId: string;
  goalId: string | null;
  jobPostId: string | null;
  startAt: string; // datetime-local string, required
  endAt: string;   // datetime-local string, required
  ximaCoreTitle: string;
  description: string;
  successCriteria: string[]; // titles of the 4 localized questions
  timeEstimateMinutes: number;
  canonicalRubricCriteria: Json;
  scenario: string;
  contextTag: string;
  candidateIntro: string;
  questions: unknown; // localized question objects
  generatedTimeEstimate: number;
  generatedMindset: Record<string, unknown> | null;
  contextSnapshot: Json | null;
  evaluationLens: Json | null;
  expectedTensions: Json | null;
  // Fallback context snapshot when contextSnapshot is null
  fallbackContext: { roleTitle: string; industry: string };
}

interface CustomInput {
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

export type BuildChallengePayloadInput = XimaCoreInput | CustomInput;

/**
 * Build the payload to INSERT into `business_challenges`.
 * Returns a plain object ready for `supabase.from('business_challenges').insert(payload)`.
 *
 * INVARIANT: payload.level === 1 for both types.
 */
export function buildChallengePayload(input: BuildChallengePayloadInput): Record<string, unknown> {
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
      level: 1, // ← explicit, never rely on DB default
    };
  }

  // type === 'custom'
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
    level: 1, // ← explicit; previously implicit DB default (=2)
  };
}

/**
 * Build the payload to UPDATE an existing custom challenge (edit-mode).
 * Subset of fields that the custom editor is allowed to mutate.
 * XCore challenges are NOT editable — callers must guard before invoking this.
 */
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
    level: 1, // re-assert L1 on every update (idempotent)
    updated_at: new Date().toISOString(),
  };
}

/**
 * Detect whether a loaded challenge row is a XIMA Core challenge.
 * Tolerates legacy rows where the marker exists in only one of the two places.
 */
export function isXimaCoreChallenge(row: {
  config_json?: any;
  rubric?: any;
} | null | undefined): boolean {
  if (!row) return false;
  return row.config_json?.xima_core === true || row.rubric?.isXimaCore === true;
}
