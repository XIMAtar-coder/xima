import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SignalsPayload } from '@/lib/signals/computeSignals';
import type { InvitationWithSubmission, ResponseStatus, ReviewDecision } from '@/hooks/useChallengeResponsesData';
import { log } from '@/lib/log';

/**
 * Company-wide list of challenge responses for /business/evaluations.
 *
 * Same tables, filters and join key (invitation_id) as useChallengeResponsesData,
 * which backs the per-challenge "View responses" page — just not narrowed to one
 * challenge. Rows are shaped as InvitationWithSubmission so they can be handed
 * straight to SubmissionDetailDrawer.
 */

export type EvaluationStatus = 'invited' | 'in_progress' | 'submitted' | 'reviewed' | 'declined' | 'expired';

export interface BusinessSubmissionRow extends InvitationWithSubmission {
  challengeId: string;
  challengeTitle: string;
  challengeDescription: string | null;
  challengeSuccessCriteria: string[];
  challengeRubric: { type?: string } | null;
  hiringGoalId: string;
  roleTitle: string | null;
  evaluationStatus: EvaluationStatus;
}

export function deriveEvaluationStatus(input: {
  invitationStatus: string;
  submissionStatus: ResponseStatus | null;
  reviewDecision: ReviewDecision;
}): EvaluationStatus {
  if (input.submissionStatus === 'submitted') {
    return input.reviewDecision ? 'reviewed' : 'submitted';
  }
  if (input.invitationStatus === 'declined') return 'declined';
  if (input.invitationStatus === 'expired') return 'expired';
  if (input.submissionStatus === 'draft' || input.invitationStatus === 'accepted') return 'in_progress';
  if (input.invitationStatus === 'submitted') return 'submitted';
  return 'invited';
}

const STATUS_ORDER: Record<EvaluationStatus, number> = {
  submitted: 0,
  in_progress: 1,
  invited: 2,
  reviewed: 3,
  declined: 4,
  expired: 5,
};

export function sortSubmissionRows<T extends Pick<BusinessSubmissionRow, 'evaluationStatus' | 'submittedAt' | 'invitedAt'>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.evaluationStatus] - STATUS_ORDER[b.evaluationStatus];
    if (byStatus !== 0) return byStatus;
    const aDate = a.submittedAt ?? a.invitedAt;
    const bDate = b.submittedAt ?? b.invitedAt;
    return bDate.localeCompare(aDate);
  });
}

export function useBusinessSubmissions(businessId: string | null | undefined) {
  const [rows, setRows] = useState<BusinessSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!businessId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: invitations, error: invError } = await supabase
        .from('challenge_invitations')
        .select('id, candidate_profile_id, status, created_at, anonymous_label, challenge_id, hiring_goal_id')
        .eq('business_id', businessId)
        .not('challenge_id', 'is', null)
        .order('created_at', { ascending: false });
      if (invError) throw invError;

      const invs = invitations ?? [];
      const invitationIds = invs.map((i) => i.id);
      const challengeIds = [...new Set(invs.map((i) => i.challenge_id).filter((id): id is string => !!id))];
      const goalIds = [...new Set(invs.map((i) => i.hiring_goal_id))];
      const profileIds = [...new Set(invs.map((i) => i.candidate_profile_id))];

      if (invitationIds.length === 0) {
        setRows([]);
        return;
      }

      const [subsRes, reviewsRes, challengesRes, goalsRes, profilesRes] = await Promise.all([
        supabase
          .from('challenge_submissions')
          .select('id, invitation_id, status, submitted_at, draft_payload, submitted_payload, signals_payload, signals_version')
          .in('invitation_id', invitationIds),
        supabase
          .from('challenge_reviews')
          .select('invitation_id, decision, followup_question')
          .in('invitation_id', invitationIds)
          .eq('business_id', businessId),
        supabase
          .from('business_challenges')
          .select('id, title, description, success_criteria, rubric')
          .in('id', challengeIds)
          .eq('business_id', businessId),
        supabase
          .from('hiring_goal_drafts')
          .select('id, role_title')
          .in('id', goalIds)
          .eq('business_id', businessId),
        // Pseudonymous display only: archetype + level, never the name.
        supabase
          .from('profiles')
          .select('id, ximatar, ximatar_level')
          .in('id', profileIds),
      ]);
      if (subsRes.error) throw subsRes.error;
      if (reviewsRes.error) throw reviewsRes.error;
      if (challengesRes.error) throw challengesRes.error;
      if (goalsRes.error) log.warn('[useBusinessSubmissions] goals unavailable', goalsRes.error);
      if (profilesRes.error) log.warn('[useBusinessSubmissions] profiles unavailable', profilesRes.error);

      const subs = new Map((subsRes.data ?? []).map((s) => [s.invitation_id, s]));
      const reviews = new Map((reviewsRes.data ?? []).map((r) => [r.invitation_id, r]));
      const challenges = new Map((challengesRes.data ?? []).map((c) => [c.id, c]));
      const goals = new Map((goalsRes.data ?? []).map((g) => [g.id, g]));
      const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      const mapped: BusinessSubmissionRow[] = [];
      for (const inv of invs) {
        const challenge = inv.challenge_id ? challenges.get(inv.challenge_id) : undefined;
        if (!challenge || !inv.challenge_id) continue;
        const submission = subs.get(inv.id);
        const review = reviews.get(inv.id);
        const profile = profiles.get(inv.candidate_profile_id);

        const submissionStatus: ResponseStatus | null = !submission
          ? null
          : submission.status === 'submitted'
            ? 'submitted'
            : 'draft';
        const reviewDecision = (review?.decision as ReviewDecision) || null;
        const archetypeRaw = (profile?.ximatar ?? '').toString().toLowerCase();
        const archetype = archetypeRaw ? archetypeRaw.charAt(0).toUpperCase() + archetypeRaw.slice(1) : null;
        const anonLabel = inv.anonymous_label || inv.id.slice(0, 6).toUpperCase();

        mapped.push({
          invitationId: inv.id,
          candidateProfileId: inv.candidate_profile_id,
          candidateName: archetype ? `Candidate #${anonLabel} — ${archetype}` : `Candidate #${anonLabel}`,
          anonymousLabel: anonLabel,
          ximatarArchetype: archetypeRaw || null,
          ximatarLevel: profile?.ximatar_level || 1,
          invitationStatus: inv.status,
          invitedAt: inv.created_at,
          submissionId: submission?.id ?? null,
          submissionStatus,
          submittedAt: submission?.submitted_at ?? null,
          draftPayload: submission?.draft_payload ?? null,
          submittedPayload: submission?.submitted_payload ?? null,
          signalsPayload: (submission?.signals_payload as unknown as SignalsPayload) || null,
          signalsVersion: submission?.signals_version ?? null,
          reviewDecision,
          reviewFollowupQuestion: review?.followup_question ?? null,
          challengeId: inv.challenge_id,
          challengeTitle: challenge.title,
          challengeDescription: challenge.description,
          challengeSuccessCriteria: challenge.success_criteria ?? [],
          challengeRubric: (challenge.rubric as { type?: string } | null) ?? null,
          hiringGoalId: inv.hiring_goal_id,
          roleTitle: goals.get(inv.hiring_goal_id)?.role_title ?? null,
          evaluationStatus: deriveEvaluationStatus({
            invitationStatus: inv.status,
            submissionStatus,
            reviewDecision,
          }),
        });
      }

      setRows(sortSubmissionRows(mapped));
    } catch (err) {
      log.error('[useBusinessSubmissions] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const updateRowDecision = useCallback((invitationId: string, decision: ReviewDecision, followupQuestion?: string | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.invitationId !== invitationId) return row;
        const next = {
          ...row,
          reviewDecision: decision,
          reviewFollowupQuestion: followupQuestion ?? row.reviewFollowupQuestion,
        };
        return {
          ...next,
          evaluationStatus: deriveEvaluationStatus({
            invitationStatus: next.invitationStatus,
            submissionStatus: next.submissionStatus,
            reviewDecision: next.reviewDecision,
          }),
        };
      }),
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { rows, loading, error, refetch: fetchData, updateRowDecision };
}
