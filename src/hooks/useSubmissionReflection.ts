import { useRef } from 'react';
/**
 * Reads back the verified evidence for the candidate's own submission.
 *
 * Scoring is deliberately fire-and-forget at submit time so the candidate is
 * never blocked, which means the reflection lands a few seconds after they
 * finish. This polls briefly for it and then stops — a candidate who closes the
 * tab loses nothing, because the evidence is persisted on the submission and
 * shown again whenever they reopen it.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReflectionEvidence } from '@/components/signals/EvidenceReflectionCard';

const POLL_INTERVAL_MS = 3000;
/** ~45s. Scoring normally completes well inside this; after that we stop asking. */
const MAX_POLLS = 15;

interface UseSubmissionReflectionResult {
  evidence: ReflectionEvidence[] | null;
  /** True while we are still waiting for the scorer to write evidence. */
  isPending: boolean;
  /** Polling finished without evidence — the scorer has not produced it (yet). */
  exhausted: boolean;
}

export function useSubmissionReflection(
  invitationId: string | null | undefined,
  enabled = true
): UseSubmissionReflectionResult {
  const pollsRef = useRef(0);
  const query = useQuery({
    queryKey: ['submission-reflection', invitationId],
    enabled: Boolean(invitationId) && enabled,
    queryFn: async (): Promise<{ evidence: ReflectionEvidence[] | null; polls: number }> => {
      pollsRef.current += 1;
      const { data: row, error } = await supabase
        .from('challenge_submissions')
        .select('signals_payload')
        .eq('invitation_id', invitationId!)
        .maybeSingle();

      if (error) throw error;

      const payload = row?.signals_payload as Record<string, unknown> | null;
      const raw = payload?.evidence;
      const evidence = Array.isArray(raw) ? (raw as ReflectionEvidence[]) : null;
      return { evidence, polls: 0 };
    },
    // Keep asking only until the evidence shows up, then stop.
    refetchInterval: (query) => {
      const current = query.state.data?.evidence;
      if (current && current.length > 0) return false;
      const attempts = query.state.dataUpdateCount ?? 0;
      return attempts >= MAX_POLLS ? false : POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { data, failureCount } = query;
  const evidence = data?.evidence ?? null;
  // Counts polls actually made. The previous expression, (data ? 1 : 0) +
  // failureCount, could never reach MAX_POLLS on a successful-but-empty read —
  // so when the scorer failed server-side, isPending stayed true forever and
  // the candidate watched a spinner that had already given up.
  const polls = pollsRef.current + failureCount;
  const exhausted = polls >= MAX_POLLS;

  return {
    evidence,
    isPending: !evidence && !exhausted,
    /** Polling finished without evidence — the scorer has not produced it (yet). */
    exhausted: !evidence && exhausted,
  };
}
