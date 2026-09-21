/** The five pillars in display order, with the key spelling used by shortlist_results and company_profiles. */
export const PILLAR_KEYS = ['drive', 'comp_power', 'communication', 'creativity', 'knowledge'] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];

/**
 * Reads one pillar from a record that may use either key spelling
 * (comp_power / computational_power) and either a 0-10 or 0-100 scale — the
 * same normalisation generate-shortlist applies.
 */
export const readPillar = (scores: Record<string, unknown> | null | undefined, key: PillarKey): number | null => {
  if (!scores) return null;
  const raw = key === 'comp_power' ? (scores.comp_power ?? scores.computational_power) : scores[key];
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 10 ? n * 10 : n);
};
