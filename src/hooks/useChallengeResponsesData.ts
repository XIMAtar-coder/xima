import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SignalsPayload } from '@/lib/signals/computeSignals';

export type ResponseStatus = 'pending' | 'draft' | 'submitted';

export interface InvitationWithSubmission {
  invitationId: string;
  candidateProfileId: string;
  candidateName: string;
  invitationStatus: string;
  invitedAt: string;
  submissionId: string | null;
  submissionStatus: ResponseStatus | null;
  submittedAt: string | null;
  draftPayload: any;
  submittedPayload: any;
  signalsPayload: SignalsPayload | null;
  signalsVersion: string | null;
}

export interface ChallengeResponseStats {
  invited: number;
  responses: number;
  pending: number;
  drafts: number;
}

export interface UseChallengeResponsesDataResult {
  rows: InvitationWithSubmission[];
  stats: ChallengeResponseStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
  const [stats, setStats] = useState<ChallengeResponseStats>({ invited: 0, responses: 0, pending: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [debug, setDebug] = useState<{ invitationIds: string[]; submissionInvitationIds: string[] }>({
    invitationIds: [],
    submissionInvitationIds: [],
  });

  const fetchData = useCallback(async () => {
    if (!businessId || !challengeId) {
      setRows([]);
      setStats({ invited: 0, responses: 0, pending: 0, drafts: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch invitations for this challenge
      const { data: invitationsData, error: invError } = await supabase
        .from('challenge_invitations')
        .select('id, candidate_profile_id, status, created_at')
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

      const submissionInvitationIds = submissionsData.map(s => s.invitation_id);

      // Step 3: Get profile info for candidate names
      const candidateProfileIds = (invitationsData || []).map(inv => inv.candidate_profile_id);
      let profilesData: any[] = [];
      if (candidateProfileIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, name')
          .in('id', candidateProfileIds);
        profilesData = data || [];
      }

      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      const submissionsByInvitation = new Map(submissionsData.map(s => [s.invitation_id, s]));

      // Step 4: Build unified rows
      const mapped: InvitationWithSubmission[] = (invitationsData || []).map(inv => {
        const profile = profilesMap.get(inv.candidate_profile_id);
        const submission = submissionsByInvitation.get(inv.id);

        let derivedStatus: ResponseStatus | null = null;
        if (!submission) {
          derivedStatus = null; // pending - no submission
        } else if (submission.status === 'submitted') {
          derivedStatus = 'submitted';
        } else {
          derivedStatus = 'draft';
        }

        return {
          invitationId: inv.id,
          candidateProfileId: inv.candidate_profile_id,
          candidateName: profile?.full_name || profile?.name || 'Unknown',
          invitationStatus: inv.status,
          invitedAt: inv.created_at,
          submissionId: submission?.id || null,
          submissionStatus: derivedStatus,
          submittedAt: submission?.submitted_at || null,
          draftPayload: submission?.draft_payload || null,
          submittedPayload: submission?.submitted_payload || null,
          signalsPayload: (submission?.signals_payload as unknown as SignalsPayload) || null,
          signalsVersion: submission?.signals_version || null,
        };
      });

      // Step 5: Compute stats
      const computedStats: ChallengeResponseStats = {
        invited: mapped.length,
        responses: mapped.filter(r => r.submissionStatus === 'submitted').length,
        pending: mapped.filter(r => r.submissionStatus === null).length,
        drafts: mapped.filter(r => r.submissionStatus === 'draft').length,
      };

      setRows(mapped);
      setStats(computedStats);
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
  }, [businessId, challengeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    rows,
    stats,
    loading,
    error,
    refetch: fetchData,
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
