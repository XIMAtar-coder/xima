import type { TFunction } from 'i18next';

/** One row of `browse-candidate-pool`. */
export interface PoolCandidate {
  id: string;
  is_synthetic?: boolean;
  ximatar_archetype: string;
  ximatar_level: number;
  pillar_scores: Record<string, number>;
  work_preference: string | null;
  availability: string;
  engagement_level: string;
  trajectory_trend: string | null;
  profile_completed: boolean;
  subscriber_code?: string | null;
}

/**
 * Archetype name and subtitle in the interface language. The taxonomy in
 * `ximatarTaxonomy.ts` is English only, so an Italian company was reading
 * "Owl · The Analytical Thinker" in an otherwise Italian page.
 */
export const archetypeName = (t: TFunction, id: string, fallback?: string) =>
  t(`ximatar.${id}.name`, { defaultValue: fallback || id });

export const archetypeTitle = (t: TFunction, id: string, fallback?: string) =>
  t(`ximatar.${id}.title`, { defaultValue: fallback || '' });

/** The short chips shown next to a candidate: how they work, when, how active. */
export const poolSignals = (c: PoolCandidate, t: TFunction): string[] => {
  const out: string[] = [];
  if (c.work_preference) {
    const key = c.work_preference.replace('-', '');
    out.push(t(`candidate_pool.${key}`, { defaultValue: c.work_preference }));
  }
  if (c.availability && c.availability !== 'unknown') {
    out.push(
      c.availability === 'immediately' ? t('candidate_pool.available_now', 'Available now')
        : c.availability === '1_month' ? t('candidate_pool.within_month', 'Within 1 month')
          : t('candidate_pool.within_3months', 'Within 3 months'),
    );
  }
  if (c.engagement_level === 'highly_active') out.push(t('candidate_pool.highly_active', 'Very active'));
  else if (c.engagement_level === 'active') out.push(t('candidate_pool.active', 'Active'));
  if (c.trajectory_trend) {
    out.push(c.trajectory_trend === 'growing_fast'
      ? t('candidate_pool.growing_fast', 'Growing fast')
      : t('candidate_pool.growing', 'Growing'));
  }
  return out;
};
