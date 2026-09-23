import { describe, expect, it } from 'vitest';
import {
  computeScoresV2, pillarShares, archetypeFromScores, weakestContentPillar, PAIR_TO_ARCHETYPE,
  CONTENT_PILLARS, type AnswersV2,
} from '../model';

const mc = (pillars: string[], intensity: 1 | 2 | 3 = 2): AnswersV2['mc'] =>
  Object.fromEntries(pillars.map((p, i) => [i + 1, { pillar: p as never, intensity }]));

describe('assessment 2.0 — scoring', () => {
  it('reads the whole profile on one pillar as a ten', () => {
    const answers: AnswersV2 = {
      mc: mc(Array(21).fill('creativity'), 3),
      drive: { 1: { stretch: true, intensity: 3 }, 2: { stretch: true, intensity: 3 }, 3: { stretch: true, intensity: 3 }, 4: { stretch: true, intensity: 3 }, 5: { stretch: true, intensity: 3 } },
    };
    const s = computeScoresV2(answers);
    expect(s.creativity).toBe(10);
    expect(s.knowledge).toBe(0);
    expect(s.drive).toBe(10);
  });

  it('puts a pillar chosen as much as the others in the middle, not at 1 out of 10', () => {
    // Four pillars, one quarter each: the honest reading of «as much as the
    // rest» is five, which is what the old denominator got wrong.
    const even: AnswersV2 = {
      mc: mc([...Array(5).fill('communication'), ...Array(5).fill('knowledge'),
              ...Array(5).fill('computational_power'), ...Array(5).fill('creativity')]),
      drive: {},
    };
    const s = computeScoresV2(even);
    expect(s.communication).toBe(5);
    expect(s.creativity).toBe(5);
    expect(pillarShares(even).communication).toBe(25);
  });

  it('spreads a real profile across the scale instead of squashing it low', () => {
    const answers: AnswersV2 = {
      mc: mc([...Array(7).fill('communication'), ...Array(7).fill('knowledge'), ...Array(7).fill('computational_power')]),
      drive: { 1: { stretch: false, intensity: 3 }, 2: { stretch: true, intensity: 1 } },
    };
    const s = computeScoresV2(answers);
    expect(s.communication).toBe(5.77);   // a third of the profile
    expect(s.creativity).toBe(0);         // never chosen
    expect(s.drive).toBe(0.67);           // Drive stays absolute: one stretch out of five
    expect(pillarShares(answers)).toEqual({ communication: 33, knowledge: 33, computational_power: 33, creativity: 0 });
  });

  it('keeps the order of the pillars, so the animal never depends on the scale', () => {
    const answers: AnswersV2 = {
      mc: mc([...Array(10).fill('creativity'), ...Array(6).fill('communication'), ...Array(4).fill('knowledge'), 'computational_power']),
      drive: {},
    };
    const s = computeScoresV2(answers);
    expect(s.creativity).toBeGreaterThan(s.communication);
    expect(s.communication).toBeGreaterThan(s.knowledge);
    expect(s.knowledge).toBeGreaterThan(s.computational_power);
    expect(s.creativity).toBeLessThanOrEqual(10);
  });

  it('is reproducible: same answers, same scores', () => {
    const answers: AnswersV2 = { mc: mc(Array(21).fill('knowledge')), drive: {} };
    expect(computeScoresV2(answers)).toEqual(computeScoresV2(answers));
  });
});

describe('assessment 2.0 — archetype by (strongest, weakest) pair', () => {
  it('covers exactly twelve animals, one per ordered pair', () => {
    const labels = new Set<string>();
    for (const s of CONTENT_PILLARS) for (const w of CONTENT_PILLARS) if (s !== w) labels.add(PAIR_TO_ARCHETYPE[s][w]);
    expect(labels.size).toBe(12);
  });

  it('assigns the agreed animals', () => {
    expect(archetypeFromScores({ computational_power: 8, communication: 5, knowledge: 6, creativity: 2 }).label).toBe('owl');
    expect(archetypeFromScores({ computational_power: 5, communication: 9, knowledge: 2, creativity: 6 }).label).toBe('lion');
    expect(archetypeFromScores({ computational_power: 2, communication: 5, knowledge: 4, creativity: 9 }).label).toBe('dolphin');
    expect(archetypeFromScores({ computational_power: 5, communication: 1, knowledge: 4, creativity: 9 }).label).toBe('chameleon');
    expect(archetypeFromScores({ comp_power: 4, communication: 7, knowledge: 6, creativity: 2 }).label).toBe('wolf');
  });

  it('breaks ties by the canonical order, like the database', () => {
    const a = archetypeFromScores({ computational_power: 5, communication: 5, knowledge: 5, creativity: 5 });
    expect(a.strongest).toBe('computational_power');
    expect(a.weakest).toBe('creativity');
    expect(a.label).toBe('owl');
  });

  it('reads the drive level from the drive score only', () => {
    expect(archetypeFromScores({ computational_power: 9, creativity: 1, drive: 8 }).driveLevel).toBe('high');
    expect(archetypeFromScores({ computational_power: 9, creativity: 1, drive: 2 }).driveLevel).toBe('low');
  });

  it('finds the weakest pillar for the adaptive drive scenario', () => {
    const answers: AnswersV2 = { mc: mc([...Array(20).fill('knowledge'), 'communication']), drive: {} };
    expect(['computational_power', 'creativity']).toContain(weakestContentPillar(answers));
  });
});
