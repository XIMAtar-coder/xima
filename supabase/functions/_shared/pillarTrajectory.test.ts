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
import { applyDeltas } from './pillarTrajectory.ts';

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
