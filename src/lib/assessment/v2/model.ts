/**
 * XIMA assessment 2.0 — the model, in one place.
 *
 * Content pillars (four): each scenario offers one answer per pillar; the
 * person picks the one they would actually do and, optionally, how much it
 * is like them (1 a little · 2 fairly · 3 very). Drive is measured apart:
 * five comfort-versus-stretch scenarios (four interleaved, one adaptive on
 * the weakest pillar). The archetype is the ordered pair (strongest, weakest)
 * of the content pillars — four times three, exactly twelve — and Drive is
 * the animal's energy, not its identity.
 */

export const CONTENT_PILLARS = ['computational_power', 'communication', 'knowledge', 'creativity'] as const;
export type ContentPillar = (typeof CONTENT_PILLARS)[number];
export type Pillar = ContentPillar | 'drive';

export const V2_FIELDS = ['trades_operations', 'restaurant'] as const;
export type V2Field = (typeof V2_FIELDS)[number];
export const isV2Field = (f: string | null | undefined): f is V2Field =>
  (V2_FIELDS as readonly string[]).includes(f ?? '');

export const V2_MC_COUNT = 21;
export const V2_DRIVE_COUNT = 5; // 4 interleaved + 1 adaptive
/** A Drive scenario follows these questions (1-based). */
export const DRIVE_AFTER_QUESTION = [5, 10, 15, 20] as const;
export const INTENSITY_DEFAULT = 2;
export type Intensity = 1 | 2 | 3;

export interface McAnswerV2 { pillar: ContentPillar; intensity: Intensity }
export interface DriveAnswerV2 { stretch: boolean; intensity: Intensity }

export interface AnswersV2 {
  mc: Record<number, McAnswerV2>;        // 1..21
  drive: Record<number, DriveAnswerV2>;  // 1..5
}

export type PillarScores = Record<Pillar, number>;

/**
 * Content pillar = Σ intensity when chosen ÷ (3 × 21) × 10.
 * Drive = Σ intensity when the stretch was chosen ÷ (3 × 5) × 10.
 * Every value is 0–10 with two decimals; missing answers count as zero, so a
 * partial submission scores low rather than crashing.
 */
export function computeScoresV2(answers: AnswersV2): PillarScores {
  const sum: Record<ContentPillar, number> = { computational_power: 0, communication: 0, knowledge: 0, creativity: 0 };
  for (const a of Object.values(answers.mc)) sum[a.pillar] += a.intensity;
  const maxContent = 3 * V2_MC_COUNT;
  const round = (n: number) => Math.round(n * 100) / 100;
  let drive = 0;
  for (const d of Object.values(answers.drive)) if (d.stretch) drive += d.intensity;
  return {
    computational_power: round((sum.computational_power / maxContent) * 10),
    communication: round((sum.communication / maxContent) * 10),
    knowledge: round((sum.knowledge / maxContent) * 10),
    creativity: round((sum.creativity / maxContent) * 10),
    drive: round((drive / (3 * V2_DRIVE_COUNT)) * 10),
  };
}

/** Taxonomy 2.0: (strongest, weakest) → animal. Agreed with the founder on 2026-09-22. */
export const PAIR_TO_ARCHETYPE: Record<ContentPillar, Record<ContentPillar, string>> = {
  computational_power: { creativity: 'owl', communication: 'cat', knowledge: 'horse', computational_power: 'owl' },
  communication: { creativity: 'wolf', computational_power: 'parrot', knowledge: 'lion', communication: 'wolf' },
  knowledge: { creativity: 'elephant', communication: 'bear', computational_power: 'bee', knowledge: 'elephant' },
  creativity: { knowledge: 'fox', computational_power: 'dolphin', communication: 'chameleon', creativity: 'fox' },
};

export interface ArchetypeV2 {
  label: string;
  strongest: ContentPillar;
  weakest: ContentPillar;
  driveLevel: 'high' | 'medium' | 'low';
}

/**
 * Ties are broken by the canonical pillar order (the same rule as the database
 * function), so the guest path and the server path give the same animal for
 * the same scores. `scores` may carry extra keys (drive) or either spelling of
 * computational power; only the four content pillars decide.
 */
export function archetypeFromScores(scores: Record<string, number | null | undefined>): ArchetypeV2 {
  const val = (p: ContentPillar) => {
    const raw = p === 'computational_power' ? (scores.computational_power ?? scores.comp_power) : scores[p];
    return Number(raw ?? 0);
  };
  let strongest: ContentPillar = CONTENT_PILLARS[0];
  let weakest: ContentPillar = CONTENT_PILLARS[0];
  for (const p of CONTENT_PILLARS) {
    if (val(p) > val(strongest)) strongest = p;
    if (val(p) < val(weakest)) weakest = p;
  }
  if (strongest === weakest) {
    // Flat profile: keep the first as strongest and take the last as weakest.
    weakest = CONTENT_PILLARS[CONTENT_PILLARS.length - 1];
  }
  const drive = Number(scores.drive ?? 0);
  return {
    label: PAIR_TO_ARCHETYPE[strongest][weakest],
    strongest,
    weakest,
    driveLevel: drive >= 7.5 ? 'high' : drive >= 5 ? 'medium' : 'low',
  };
}

/** The Drive scenario shown at the end is the one for the weakest pillar so far. */
export function weakestContentPillar(answers: AnswersV2): ContentPillar {
  return archetypeFromScores(computeScoresV2(answers)).weakest;
}
