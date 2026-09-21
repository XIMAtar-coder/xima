import type { TFunction } from 'i18next';

/**
 * Avatars are stored either as a full URL, as a path from the site root, or as
 * a bare file name under /avatars. Returns null when there is no image, so the
 * caller can fall back to the initial.
 */
export const mentorAvatarUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http') || raw.startsWith('/')) return raw;
  return `/avatars/${raw}`;
};

/**
 * `mentors.xima_pillars` holds the pillar keys. They used to be printed raw
 * ("comp power"), which is both English and wrong for an Italian mentor.
 */
export const pillarLabel = (t: TFunction, pillar: string): string => {
  const key = pillar === 'computational_power' ? 'comp_power' : pillar;
  return t(`shortlist.pillar.${key}`, { defaultValue: pillar.replace(/_/g, ' ') });
};
