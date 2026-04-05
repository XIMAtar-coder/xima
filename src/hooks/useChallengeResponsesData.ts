import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SignalsPayload } from '@/lib/signals/computeSignals';

export type ResponseStatus = 'pending' | 'draft' | 'submitted';
export type ReviewDecision = 'shortlist' | 'followup' | 'pass' | null;

export interface InvitationWithSubmission {
  invitationId: string;
  candidateProfileId: string;
  candidateName: string;
  anonymousLabel: string | null;
  ximatarArchetype: string | null;
  ximatarLevel: number;
  invitationStatus: string;
  invitedAt: string;
  submissionId: string | null;
  submissionStatus: ResponseStatus | null;
  submittedAt: string | null;
  draftPayload: any;
  submittedPayload: any;
  signalsPayload: SignalsPayload | null;
  signalsVersion: string | null;
  // New: review decision
  reviewDecision: ReviewDecision;
  reviewFollowupQuestion: string | null;
}

export interface ChallengeResponseStats {
  invited: number;
  responses: number;
  pending: number;
  drafts: number;
  needsDecision: number;
  shortlisted: number;
  followup: number;
  passed: number;
}

export interface UseChallengeResponsesDataResult {
  rows: InvitationWithSubmission[];
  stats: ChallengeResponseStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateRowDecision: (invitationId: string, decision: ReviewDecision, followupQuestion?: string | null) => void;
  debug: {
    invitationIds: string[];
    submissionInvitationIds: string[];
  };
}

/**
 * Single source of truth for challenge response data.
 * Uses invitation_id as the primary join key between challenge_invitations and challenge_submissions.
 */
export function useChallengeResponsesData(
  businessId: string | null | undefined,
  challengeId: string | null | undefined
): UseChallengeResponsesDataResult {
  const [rows, setRows] = useState<InvitationWithSubmission[]>([]);
  const [stats, setStats] = useState<ChallengeResponseStats>({ 
    invited: 0, responses: 0, pending: 0, drafts: 0,
    needsDecision: 0, shortlisted: 0, followup: 0, passed: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [debug, setDebug] = useState<{ invitationIds: string[]; submissionInvitationIds: string[] }>({
    invitationIds: [],
    submissionInvitationIds: [],
  });

  const computeStats = useCallback((data: InvitationWithSubmission[]): ChallengeResponseStats => {
    const submitted = data.filter(r => r.submissionStatus === 'submitted');
    return {
      invited: data.length,
      responses: submitted.length,
      pending: data.filter(r => r.submissionStatus === null).length,
      drafts: data.filter(r => r.submissionStatus === 'draft').length,
      needsDecision: submitted.filter(r => r.reviewDecision === null).length,
      shortlisted: submitted.filter(r => r.reviewDecision === 'shortlist').length,
      followup: submitted.filter(r => r.reviewDecision === 'followup').length,
      passed: submitted.filter(r => r.reviewDecision === 'pass').length,
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!businessId || !challengeId) {
      setRows([]);
      setStats({ invited: 0, responses: 0, pending: 0, drafts: 0, needsDecision: 0, shortlisted: 0, followup: 0, passed: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch invitations for this challenge
      const { data: invitationsData, error: invError } = await supabase
        .from('challenge_invitations')
        .select('id, candidate_profile_id, status, created_at, anonymous_label')
        .eq('challenge_id', challengeId)
        .eq('business_id', businessId);

      if (invError) throw invError;

      const invitationIds = (invitationsData || []).map(inv => inv.id);

      // Step 2: Fetch submissions by invitation_id (the critical join)
      let submissionsData: any[] = [];
      if (invitationIds.length > 0) {
        const { data, error: subError } = await supabase
          .from('challenge_submissions')
          .select('id, invitation_id, status, submitted_at, draft_payload, submitted_payload, signals_payload, signals_version')
          .in('invitation_id', invitationIds);

        if (subError) throw subError;
        submissionsData = data || [];
      }

      // Step 3: Fetch reviews for these invitations
      let reviewsData: any[] = [];
      if (invitationIds.length > 0) {
        const { data, error: reviewError } = await supabase
          .from('challenge_reviews')
          .select('invitation_id, decision, followup_question')
          .in('invitation_id', invitationIds)
          .eq('business_id', businessId);

        if (reviewError) throw reviewError;
        reviewsData = data || [];
      }

      const submissionInvitationIds = submissionsData.map(s => s.invitation_id);

      // Step 4: Get profile info for candidate display (anonymous by default)
      const candidateProfileIds = (invitationsData || []).map(inv => inv.candidate_profile_id);
      let profilesData: any[] = [];
      if (candidateProfileIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, name, ximatar, ximatar_archetype, ximatar_level')
          .in('id', candidateProfileIds);
        profilesData = data || [];
      }

      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      const submissionsByInvitation = new Map(submissionsData.map(s => [s.invitation_id, s]));
      const reviewsByInvitation = new Map(reviewsData.map(r => [r.invitation_id, r]));

      // Step 5: Build unified rows (anonymous display — candidateName kept for internal ref but not shown to users)
      const mapped: InvitationWithSubmission[] = (invitationsData || []).map((inv, index) => {
        const profile = profilesMap.get(inv.candidate_profile_id);
        const submission = submissionsByInvitation.get(inv.id);
        const review = reviewsByInvitation.get(inv.id);

        let derivedStatus: ResponseStatus | null = null;
        if (!submission) {
          derivedStatus = null; // pending - no submission
        } else if (submission.status === 'submitted') {
          derivedStatus = 'submitted';
        } else {
          derivedStatus = 'draft';
        }

        const archetype = (profile?.ximatar_archetype || profile?.ximatar || 'unknown').toString().toLowerCase();
        const anonLabel = (inv as any).anonymous_label || String(index + 1);

        return {
          invitationId: inv.id,
          candidateProfileId: inv.candidate_profile_id,
          candidateName: `Candidate #${anonLabel} — ${archetype.charAt(0).toUpperCase() + archetype.slice(1)}`,
          anonymousLabel: anonLabel,
          ximatarArchetype: archetype,
          ximatarLevel: profile?.ximatar_level || 1,
          invitationStatus: inv.status,
          invitedAt: inv.created_at,
          submissionId: submission?.id || null,
          submissionStatus: derivedStatus,
          submittedAt: submission?.submitted_at || null,
          draftPayload: submission?.draft_payload || null,
          submittedPayload: submission?.submitted_payload || null,
          signalsPayload: (submission?.signals_payload as unknown as SignalsPayload) || null,
          signalsVersion: submission?.signals_version || null,
          reviewDecision: (review?.decision as ReviewDecision) || null,
          reviewFollowupQuestion: review?.followup_question || null,
        };
      });

      setRows(mapped);
      setStats(computeStats(mapped));
      setDebug({
        invitationIds: invitationIds.slice(0, 5),
        submissionInvitationIds: submissionInvitationIds.slice(0, 5),
      });

    } catch (err) {
      console.error('[useChallengeResponsesData] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [businessId, challengeId, computeStats]);

  // Optimistic update for row decision
  const updateRowDecision = useCallback((invitationId: string, decision: ReviewDecision, followupQuestion?: string | null) => {
    setRows(prev => {
      const updated = prev.map(row => 
        row.invitationId === invitationId 
          ? { ...row, reviewDecision: decision, reviewFollowupQuestion: followupQuestion ?? row.reviewFollowupQuestion }
          : row
      );
      setStats(computeStats(updated));
      return updated;
    });
  }, [computeStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    rows,
    stats,
    loading,
    error,
    refetch: fetchData,
    updateRowDecision,
    debug,
  };
}

/**
 * Lightweight hook to get stats for multiple challenges (used in Dashboard overview).
 * Returns a map of challengeId -> stats
 */
export function useChallengeStatsMap(
  businessId: string | null | undefined,
  challengeIds: string[]
): {
  statsMap: Map<string, ChallengeResponseStats>;
  loading: boolean;
  debug: { [challengeId: string]: { invCount: number; subCount: number } };
} {
  const [statsMap, setStatsMap] = useState<Map<string, ChallengeResponseStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<{ [challengeId: string]: { invCount: number; subCount: number } }>({});

  useEffect(() => {
    async function fetchBulk() {
      if (!businessId || challengeIds.length === 0) {
        setStatsMap(new Map());
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch all invitations for all these challenges
        const { data: invitationsData, error: invError } = await supabase
          .from('challenge_invitations')
          .select('id, challenge_id, status')
          .in('challenge_id', challengeIds)
          .eq('business_id', businessId);

        if (invError) throw invError;

        const allInvitationIds = (invitationsData || []).map(inv => inv.id);

        // Fetch submissions for all these invitations
        let submissionsData: any[] = [];
        if (allInvitationIds.length > 0) {
          const { data, error: subError } = await supabase
            .from('challenge_submissions')
            .select('invitation_id, status')
            .in('invitation_id', allInvitationIds);

          if (subError) throw subError;
          submissionsData = data || [];
        }

        // Build submissions lookup by invitation_id
        const submissionsByInvId = new Map(submissionsData.map(s => [s.invitation_id, s]));

        // Build debug and stats per challenge
        const newStatsMap = new Map<string, ChallengeResponseStats>();
        const newDebug: { [challengeId: string]: { invCount: number; subCount: number } } = {};

        for (const challengeId of challengeIds) {
          const invitationsForChallenge = (invitationsData || []).filter(inv => inv.challenge_id === challengeId);
          const invitationIdsForChallenge = invitationsForChallenge.map(inv => inv.id);

          let responses = 0;
          let drafts = 0;
          let pending = 0;

          for (const invId of invitationIdsForChallenge) {
            const sub = submissionsByInvId.get(invId);
            if (!sub) {
              pending++;
            } else if (sub.status === 'submitted') {
              responses++;
            } else {
              drafts++;
            }
          }

          newStatsMap.set(challengeId, {
            invited: invitationsForChallenge.length,
            responses,
            pending,
            drafts,
            needsDecision: 0, // Not computed in bulk stats
            shortlisted: 0,
            followup: 0,
            passed: 0,
          });

          newDebug[challengeId] = {
            invCount: invitationsForChallenge.length,
            subCount: submissionsData.filter(s => invitationIdsForChallenge.includes(s.invitation_id)).length,
          };
        }

        setStatsMap(newStatsMap);
        setDebug(newDebug);

      } catch (err) {
        console.error('[useChallengeStatsMap] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBulk();
  }, [businessId, challengeIds.join(',')]);

  return { statsMap, loading, debug };
}
