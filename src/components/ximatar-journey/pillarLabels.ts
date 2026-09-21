import type { TFunction } from 'i18next';

export const PILLAR_ORDER = ['drive', 'computational_power', 'communication', 'creativity', 'knowledge'] as const;
export type PillarId = (typeof PILLAR_ORDER)[number];

/** Pillar identifiers arrive in several spellings ("computational", "Computational Power"). */
export function normalizePillarId(raw: string): PillarId | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (key === 'computational' || key === 'computational_power' || key === 'comp_power') return 'computational_power';
  if ((PILLAR_ORDER as readonly string[]).includes(key)) return key as PillarId;
  return null;
}

/** Short pillar name for chips and bars ("Drive", not "Drive (velocità di crescita)"). */
export function pillarShortName(t: TFunction, raw: string): string {
  const id = normalizePillarId(raw);
  if (!id) return raw.replace(/_/g, ' ');
  const legacyKey = id === 'computational_power' ? 'computational' : id;
  return t(`guestJourney.pillar_chips.${id}`, { defaultValue: t(`pillars.${legacyKey}.name`, { defaultValue: raw }) });
}

/** Locale-aware "8,2" / "8.2". */
export function formatScore(score: number, locale: string): string {
  try {
    return score.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } catch {
    return score.toFixed(1);
  }
}
