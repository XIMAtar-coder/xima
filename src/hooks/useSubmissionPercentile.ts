/**
 * Where this submission sits against the other candidates for the same role.
 *
 * Returns null far more often than not, by design: the underlying function
 * withholds a percentile until the pool is large enough for one to mean
 * anything (see get_submission_percentile). Callers must render nothing in that
 * case rather than substituting a placeholder — an absent number is honest, an
 * invented one is not.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubmissionPercentile {
  /** 0–100: share of the pool this submission scored above. */
  percentile: number;
  /** How many scored submissions the comparison is drawn from. */
  sampleSize: number;
}

export function useSubmissionPercentile(
  invitationId: string | null | undefined,
  enabled = true
): { percentile: SubmissionPercentile | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['submission-percentile', invitationId],
    enabled: Boolean(invitationId) && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubmissionPercentile | null> => {
      // src/integrations/supabase/types.ts is generated from the schema and does
      // not yet include this function. Casting here rather than hand-editing the
      // generated file, which is regenerated (and would lose the edit).
      const { data: rows, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{
        data: Array<{ percentile: number; sample_size: number }> | null;
        error: unknown;
      }>)('get_submission_percentile', { p_invitation_id: invitationId! });

      if (error) throw error;

      // No rows is the normal "not enough peers yet" answer, not a failure.
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row || typeof row.percentile !== 'number') return null;

      return { percentile: row.percentile, sampleSize: row.sample_size };
    },
  });

  return { percentile: data ?? null, isLoading };
}
