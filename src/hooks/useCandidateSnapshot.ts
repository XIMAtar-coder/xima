import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useSupabaseQuery } from '@/lib/data/useSupabaseQuery';
import { PILLAR_ORDER, readPillar, type PillarKey, type PillarScores } from '@/components/candidate/PillarBars';

/**
 * The few profile facts the context panels of the candidate pages show
 * (feed, settings): name, XIMAtar, pillar scores. One cached query instead
 * of the full dashboard loader.
 */
interface SnapshotRow {
  full_name: string | null;
  name: string | null;
  ximatar_name: string | null;
  ximatar_image: string | null;
  pillar_scores: PillarScores | null;
  profile_completed: boolean | null;
}

export const useCandidateSnapshot = () => {
  const { user } = useUser();
  const { data, isLoading } = useSupabaseQuery<SnapshotRow>(
    ['candidate_snapshot', user?.id],
    () => supabase
      .from('profiles')
      .select('full_name, name, ximatar_name, ximatar_image, pillar_scores, profile_completed')
      .eq('user_id', user!.id)
      .maybeSingle() as unknown as PromiseLike<{ data: SnapshotRow | null; error: { message: string } | null }>,
    { enabled: !!user?.id, staleTime: 60_000 },
  );

  return useMemo(() => {
    const scores = data?.pillar_scores ?? null;
    let strongest: PillarKey | null = null;
    let weakest: PillarKey | null = null;
    if (scores) {
      const known = PILLAR_ORDER.map((k) => [k, readPillar(scores, k)] as const).filter(([, v]) => v !== null) as Array<[PillarKey, number]>;
      if (known.length) {
        strongest = known.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        weakest = known.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
      }
    }
    const image = data?.ximatar_image ? data.ximatar_image.replace(/^public\//, '/') : null;
    return {
      isLoading,
      name: data?.full_name || data?.name || user?.name || '',
      ximatarName: data?.ximatar_name ?? null,
      ximatarImage: image,
      pillarScores: scores,
      strongest,
      weakest,
      profileCompleted: !!data?.profile_completed,
      hasAssessment: !!scores,
    };
  }, [data, isLoading, user?.name]);
};

export default useCandidateSnapshot;
