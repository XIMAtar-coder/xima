/**
 * Anonymous candidate display utilities.
 * Used throughout the business pipeline to show XIMAtar identity
 * instead of PII until the offer/hire stage.
 */

export interface AnonymousCandidate {
  anonymous_label?: string | null;
  ximatar_archetype?: string | null;
  ximatar_level?: number | null;
  pillar_scores?: Record<string, number>;
  identity_revealed?: boolean;
  pipeline_stage?: string | null;
  // Only available when identity_revealed === true:
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  cv_summary?: string | null;
  photo_url?: string | null;
}

const ARCHETYPE_EMOJI: Record<string, string> = {
  lion: '🦁', owl: '🦉', dolphin: '🐬', fox: '🦊', bear: '🐻', bee: '🐝',
  wolf: '🐺', cat: '🐱', parrot: '🦜', elephant: '🐘', horse: '🐴', chameleon: '🦎',
};

export function getDisplayName(candidate: AnonymousCandidate): string {
  if (candidate.identity_revealed && candidate.full_name) {
    return candidate.full_name;
  }
  const archetype = candidate.ximatar_archetype || 'Candidate';
  const label = candidate.anonymous_label || '?';
  const capitalizedArchetype = archetype.charAt(0).toUpperCase() + archetype.slice(1);
  return `Candidate #${label} — ${capitalizedArchetype}`;
}

export function getArchetypeEmoji(archetype: string | null | undefined): string {
  return ARCHETYPE_EMOJI[(archetype || '').toLowerCase()] || '🔮';
}

export function getDisplayAvatar(candidate: AnonymousCandidate): string {
  if (candidate.identity_revealed && candidate.photo_url) {
    return candidate.photo_url;
  }
  return `/ximatars/${(candidate.ximatar_archetype || 'chameleon').toLowerCase()}.png`;
}

export function canRevealIdentity(pipelineStage: string | null | undefined): boolean {
  return ['offer_pending', 'offered', 'hired'].includes(pipelineStage || '');
}

export const PIPELINE_STAGES = [
  { key: 'shortlisted', labelKey: 'anonymous.stage.shortlisted' },
  { key: 'l1_invited', labelKey: 'anonymous.stage.l1_invited' },
  { key: 'l1_completed', labelKey: 'anonymous.stage.l1_completed' },
  { key: 'l1_evaluated', labelKey: 'anonymous.stage.l1_evaluated' },
  { key: 'l2_invited', labelKey: 'anonymous.stage.l2_invited' },
  { key: 'l2_completed', labelKey: 'anonymous.stage.l2_completed' },
  { key: 'l2_evaluated', labelKey: 'anonymous.stage.l2_evaluated' },
  { key: 'l3_invited', labelKey: 'anonymous.stage.l3_invited' },
  { key: 'l3_completed', labelKey: 'anonymous.stage.l3_completed' },
  { key: 'l3_evaluated', labelKey: 'anonymous.stage.l3_evaluated' },
  { key: 'offer_pending', labelKey: 'anonymous.stage.offer_pending' },
  { key: 'offered', labelKey: 'anonymous.stage.offered' },
  { key: 'hired', labelKey: 'anonymous.stage.hired' },
] as const;
