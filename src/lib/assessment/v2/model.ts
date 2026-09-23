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

export const V2_FIELDS = ['science_tech', 'business_leadership', 'arts_creative', 'service_ops', 'trades_operations', 'restaurant'] as const;
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
 * The content pillars are a forced choice: every scenario offers one answer per
 * pillar, so what a person gives to one they take from the others. Their four
 * values are therefore **shares of one profile**, not four independent levels —
 * dividing each by the whole questionnaire (3 × 21) made every real profile
 * land between 1 and 3 out of 10, which is what Pietro and Roberta saw.
 *
 * So the share is what is measured, and the 0–10 is a reading of it:
 *
 *   share_p = Σ intensity on p ÷ Σ intensity on all four
 *   score_p = 10 × √share_p
 *
 * The square root puts the three anchors where they belong: a pillar chosen as
 * much as the other three (25%) reads 5, a pillar that takes the whole profile
 * reads 10, and nothing reads 0. It is monotonic, so the order of the pillars —
 * and the animal, which is the pair (strongest, weakest) — never changes.
 *
 * Drive is not part of that budget: it has its own five scenarios where both
 * answers are serious, so it stays absolute, Σ intensity of the stretch choices
 * ÷ (3 × 5) × 10.
 *
 * Every value is 0–10 with two decimals; missing answers count as zero, so a
 * partial submission scores low rather than crashing.
 */
export function computeScoresV2(answers: AnswersV2): PillarScores {
  const sum: Record<ContentPillar, number> = { computational_power: 0, communication: 0, knowledge: 0, creativity: 0 };
  for (const a of Object.values(answers.mc)) sum[a.pillar] += a.intensity;
  const total = CONTENT_PILLARS.reduce((n, p) => n + sum[p], 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  const score = (p: ContentPillar) => (total > 0 ? round(10 * Math.sqrt(sum[p] / total)) : 0);
  let drive = 0;
  for (const d of Object.values(answers.drive)) if (d.stretch) drive += d.intensity;
  return {
    computational_power: score('computational_power'),
    communication: score('communication'),
    knowledge: score('knowledge'),
    creativity: score('creativity'),
    drive: round((drive / (3 * V2_DRIVE_COUNT)) * 10),
  };
}

/** The same shares as percentages, for saying «a third of your profile» honestly. */
export function pillarShares(answers: AnswersV2): Record<ContentPillar, number> {
  const sum: Record<ContentPillar, number> = { computational_power: 0, communication: 0, knowledge: 0, creativity: 0 };
  for (const a of Object.values(answers.mc)) sum[a.pillar] += a.intensity;
  const total = CONTENT_PILLARS.reduce((n, p) => n + sum[p], 0);
  const out = {} as Record<ContentPillar, number>;
  for (const p of CONTENT_PILLARS) out[p] = total > 0 ? Math.round((sum[p] / total) * 100) : 0;
  return out;
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
