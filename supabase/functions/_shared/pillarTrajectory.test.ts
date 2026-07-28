/**
 * Symmetry of the pillar trajectory engine.
 *
 * These scores feed hiring decisions, so a pillar that can rise but not fall is
 * not a measurement — it is accumulated participation wearing a psychometric
 * costume. The engine previously capped gains at +5 and losses at -3, and
 * applied diminishing returns only to gains. These tests pin the corrected
 * behaviour so it cannot quietly drift back.
 */
import { describe, expect, it } from 'vitest';
import {
  applyDeltas,
  isUngradable,
  clampGrowthHubLifetime,
  GROWTH_HUB_LIFETIME_CAP,
} from './pillarTrajectory.ts';

const zero = {
  drive: 0,
  computational_power: 0,
  communication: 0,
  creativity: 0,
  knowledge: 0,
};

const scoresAt = (v: number) => ({
  drive: v,
  computational_power: v,
  communication: v,
  creativity: v,
  knowledge: v,
});

describe('applyDeltas — symmetry', () => {
  it('moves a mid-range score equally far up and down for the same magnitude', () => {
    const up = applyDeltas(scoresAt(50), { ...zero, drive: 4 }, 'l1_challenge');
    const down = applyDeltas(scoresAt(50), { ...zero, drive: -4 }, 'l1_challenge');

    const gained = up.drive - 50;
    const lost = 50 - down.drive;
    expect(gained).toBeCloseTo(lost, 5);
    expect(gained).toBeGreaterThan(0);
  });

  it('caps a large negative delta as generously as a large positive one', () => {
    // Raw deltas beyond the cap: +99 / -99 on an assessed source.
    const up = applyDeltas(scoresAt(50), { ...zero, knowledge: 99 }, 'l2_challenge');
    const down = applyDeltas(scoresAt(50), { ...zero, knowledge: -99 }, 'l2_challenge');
    expect(up.knowledge - 50).toBeCloseTo(50 - down.knowledge, 5);
  });

  it('slows movement near whichever bound it approaches', () => {
    // Near the ceiling, a gain should be damped...
    const highGain = applyDeltas(scoresAt(95), { ...zero, drive: 4 }, 'l1_challenge').drive - 95;
    const midGain = applyDeltas(scoresAt(50), { ...zero, drive: 4 }, 'l1_challenge').drive - 50;
    expect(highGain).toBeLessThan(midGain);

    // ...and near the floor, a loss should be damped too (this was the bug:
    // losses used to pass through at full force).
    const lowLoss = 5 - applyDeltas(scoresAt(5), { ...zero, drive: -4 }, 'l1_challenge').drive;
    const midLoss = 50 - applyDeltas(scoresAt(50), { ...zero, drive: -4 }, 'l1_challenge').drive;
    expect(lowLoss).toBeLessThan(midLoss);
  });

  it('keeps scores within 0–100', () => {
    const floor = applyDeltas(scoresAt(1), { ...zero, creativity: -99 }, 'l1_challenge');
    const ceiling = applyDeltas(scoresAt(99), { ...zero, creativity: 99 }, 'l1_challenge');
    expect(floor.creativity).toBeGreaterThanOrEqual(0);
    expect(ceiling.creativity).toBeLessThanOrEqual(100);
  });

  it('never moves a pillar further than the grader awarded', () => {
    // The gradient caps a challenge delta at +/-5. Diminishing returns used to
    // scale by room/50 with no upper bound, so anywhere with more than 50 points
    // of room it amplified instead: a graded -5 at 100 landed as -10. The cap has
    // to hold at every point on the scale, not just the middle.
    for (const score of [0, 10, 25, 50, 75, 90, 100]) {
      const gained = applyDeltas(scoresAt(score), { ...zero, drive: 5 }, 'l1_challenge').drive - score;
      const lost = score - applyDeltas(scoresAt(score), { ...zero, drive: -5 }, 'l1_challenge').drive;
      expect(gained).toBeLessThanOrEqual(5);
      expect(lost).toBeLessThanOrEqual(5);
    }
  });

  it('applies the full graded delta when the bound is far away', () => {
    // Damping should express proximity to a bound, not shrink every move.
    expect(applyDeltas(scoresAt(50), { ...zero, drive: 5 }, 'l1_challenge').drive - 50).toBe(5);
    expect(50 - applyDeltas(scoresAt(50), { ...zero, drive: -5 }, 'l1_challenge').drive).toBe(5);
  });

  it('leaves the Growth Hub non-negative on purpose — practice is not penalised', () => {
    const after = applyDeltas(scoresAt(50), { ...zero, drive: -3 }, 'growth_hub_test');
    expect(after.drive).toBe(50);
  });

  it('still lets the Growth Hub raise a score', () => {
    const after = applyDeltas(scoresAt(50), { ...zero, drive: 3 }, 'growth_hub_test');
    expect(after.drive).toBeGreaterThan(50);
  });

  it('treats mentor sessions as inert in both directions', () => {
    expect(applyDeltas(scoresAt(50), { ...zero, drive: 5 }, 'mentor_session').drive).toBe(50);
    expect(applyDeltas(scoresAt(50), { ...zero, drive: -5 }, 'mentor_session').drive).toBe(50);
  });

  it('does not move pillars with no delta', () => {
    const after = applyDeltas(scoresAt(42), { ...zero, drive: 3 }, 'l1_challenge');
    expect(after.communication).toBe(42);
    expect(after.knowledge).toBe(42);
  });
});

describe('isUngradable — refusing to score a non-answer', () => {
  it('refuses empty and whitespace-only submissions', () => {
    expect(isUngradable('')).toBe(true);
    expect(isUngradable('   \n\t  ')).toBe(true);
  });

  it('refuses a submission below the minimum length', () => {
    expect(isUngradable('idk')).toBe(true);
    expect(isUngradable('no comment')).toBe(true);
  });

  it('grades a short but real answer — this is not a quality bar', () => {
    // 20+ chars of genuine content. A bad answer still gets graded, and can
    // still lose points; only the absence of an answer is refused.
    expect(isUngradable('We shipped it late.')).toBe(true);
    expect(isUngradable('We shipped it late and lost the client.')).toBe(false);
  });

  it('ignores padding — whitespace is collapsed before measuring', () => {
    expect(isUngradable('a' + ' '.repeat(200))).toBe(true);
  });

  it('does not refuse when the caller supplies no text to check', () => {
    // Distinct from an empty submission: the caller is not making a claim
    // about the response, so there is nothing to refuse.
    expect(isUngradable(undefined)).toBe(false);
    expect(isUngradable(null)).toBe(false);
  });
});

describe('growth hub lifetime cap — practice cannot buy rank forever', () => {
  // Minimal stand-in for the Supabase client: only the one query shape used.
  const clientWith = (rows: Record<string, number>[]) => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ data: rows, error: null }),
        }),
      }),
    }),
  }) as never;

  const award = { ...zero, drive: 3, knowledge: 3 };

  it('lets an award through when there is headroom', async () => {
    const out = await clampGrowthHubLifetime(clientWith([]), 'u1', award, 'c1');
    expect(out.drive).toBe(3);
    expect(out.knowledge).toBe(3);
  });

  it('trims the award to the remaining headroom', async () => {
    // 14 of 15 banked on drive -> only 1 left.
    const out = await clampGrowthHubLifetime(
      clientWith([{ drive_delta: 14, knowledge_delta: 0 }]), 'u1', award, 'c1');
    expect(out.drive).toBe(1);
    expect(out.knowledge).toBe(3);
  });

  it('refuses any further gain once the cap is reached', async () => {
    const out = await clampGrowthHubLifetime(
      clientWith([{ drive_delta: GROWTH_HUB_LIFETIME_CAP }]), 'u1', award, 'c1');
    expect(out.drive).toBe(0);
  });

  it('never turns a capped gain into a loss', async () => {
    // Banked beyond the cap (historical data predating the cap) must clamp to
    // zero, not to a negative — the Growth Hub does not take points away.
    const out = await clampGrowthHubLifetime(
      clientWith([{ drive_delta: 40 }]), 'u1', award, 'c1');
    expect(out.drive).toBe(0);
    expect(out.drive).toBeGreaterThanOrEqual(0);
  });

  it('caps each pillar independently', async () => {
    const out = await clampGrowthHubLifetime(
      clientWith([{ drive_delta: 15, knowledge_delta: 0 }]), 'u1', award, 'c1');
    expect(out.drive).toBe(0);
    expect(out.knowledge).toBe(3);
  });

  it('passes deltas through unchanged when the lookup fails', async () => {
    const broken = {
      from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: null, error: new Error('x') }) }) }) }),
    } as never;
    const out = await clampGrowthHubLifetime(broken, 'u1', award, 'c1');
    expect(out.drive).toBe(3);
  });
});
