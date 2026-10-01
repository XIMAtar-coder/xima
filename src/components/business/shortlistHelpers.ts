import type { TFunction } from 'i18next';

/** Helpers shared by the shortlist table and the selected-candidate card. */

export interface ShortlistCandidate {
  id?: string;
  candidate_user_id: string;
  anonymous_label?: string | null;
  total_score: number;
  identity_score: number;
  trajectory_score: number;
  engagement_score: number;
  location_score: number;
  credential_score: number | null;
  performance_score?: number | null;
  match_narrative?: string | null;
  ximatar_archetype: string;
  ximatar_level: number;
  pillar_scores: Record<string, number>;
  trajectory_summary: string;
  engagement_level: string;
  location_match: string;
  availability: string;
  status: string;
  identity_revealed?: boolean;
  pipeline_stage?: string;
  subscriber_code?: string | null;
}

export type Reason = { k: string; v?: string | number };

// match_narrative holds the scoring reasons as JSON codes (written by
// generate-shortlist). Older rows hold nothing or free text: show no reasons.
export const parseReasons = (raw?: string | null): Reason[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.k === 'string') : [];
  } catch {
    return [];
  }
};

export const getArchetypeImageUrl = (archetype: string) =>
  `/ximatars/${(archetype || 'chameleon').toLowerCase()}.webp`;

const POSITIVE_REASONS = new Set(['pillar_fit', 'pillar_above', 'archetype_recommended', 'education_meets', 'experience_in_range', 'languages_meet', 'challenges_done']);
const WARNING_REASONS = new Set(['pillar_below', 'education_below', 'experience_below', 'experience_above', 'language_missing', 'wants_remote']);
const GOOD_LOCATIONS = new Set(['exact', 'region', 'remote', 'willing_to_relocate', 'any']);

/** ↗ for a point in favour, ! for a point against, — for data that is missing or neutral. */
export const reasonGlyph = (r: Reason): 'up' | 'warn' | 'none' => {
  if (r.k === 'location') return GOOD_LOCATIONS.has(String(r.v)) ? 'up' : r.v === 'no_match' ? 'warn' : 'none';
  if (POSITIVE_REASONS.has(r.k)) return 'up';
  if (WARNING_REASONS.has(r.k)) return 'warn';
  return 'none';
};

/** Which kinds of evidence a compatibility was computed on ("identity", "challenges", …). */
export const evidenceOf = (raw?: string | null): string[] => {
  const e = parseReasons(raw).find((r) => r.k === 'evidence');
  return e ? String(e.v ?? '').split(',').filter(Boolean) : [];
};

/**
 * Same order as the server, except that candidates on the same score are
 * taken one XIMAtar at a time: five equal scores should not read as five
 * copies of one animal when the next five are just as close.
 */
export const interleaveTies = <T extends { total_score: number; ximatar_archetype: string }>(rows: T[]): T[] => {
  const out: T[] = [];
  let i = 0;
  while (i < rows.length) {
    const score = Math.round(rows[i].total_score);
    const group: T[] = [];
    while (i < rows.length && Math.round(rows[i].total_score) === score) group.push(rows[i++]);
    const byArchetype = new Map<string, T[]>();
    for (const r of group) {
      const k = (r.ximatar_archetype || '').toLowerCase();
      if (!byArchetype.has(k)) byArchetype.set(k, []);
      byArchetype.get(k)!.push(r);
    }
    const queues = [...byArchetype.values()];
    while (queues.some((q) => q.length > 0)) {
      for (const q of queues) { const next = q.shift(); if (next) out.push(next); }
    }
  }
  return out;
};

export const reasonText = (t: TFunction, r: Reason): string => {
  if (r.k === 'evidence') return '';
  const pillarName = (key: string) => t(`shortlist.pillar.${key}`, key);
  return t(`shortlist.reason.${r.k}`, {
    defaultValue: '',
    value: r.k.startsWith('pillar_') && r.k !== 'pillar_fit' ? pillarName(String(r.v)) : r.v,
    location: r.k === 'location' ? t(`shortlist.location.${r.v === 'willing_to_relocate' ? 'relocate' : r.v}`, String(r.v)) : undefined,
  });
};

/** Localised XIMAtar name ("owl" → "Gufo"), falling back to the capitalised id. */
export const archetypeDisplayName = (t: TFunction, archetype: string) => {
  const id = (archetype || '').toLowerCase();
  return t(`about.archetypes.name_${id}`, id.charAt(0).toUpperCase() + id.slice(1));
};
