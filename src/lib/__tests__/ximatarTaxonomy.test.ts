import { describe, it, expect } from "vitest";
import {
  computePillarDistance,
  rankXimatarsByDistance,
  getTopXimatars,
  XIMATAR_PROFILES,
  NEUTRAL_PILLARS,
} from "../ximatarTaxonomy";

describe("computePillarDistance", () => {
  it("returns 0 for identical vectors", () => {
    const v = { drive: 50, comp_power: 50, communication: 50, creativity: 50, knowledge: 50 };
    expect(computePillarDistance(v, v)).toBe(0);
  });

  it("is symmetric", () => {
    const a = XIMATAR_PROFILES.lion.pillars;
    const b = XIMATAR_PROFILES.owl.pillars;
    expect(computePillarDistance(a, b)).toBeCloseTo(computePillarDistance(b, a));
  });

  it("grows monotonically with pillar deltas", () => {
    const a = { drive: 50, comp_power: 50, communication: 50, creativity: 50, knowledge: 50 };
    const near = { ...a, drive: 55 };
    const far = { ...a, drive: 90 };
    expect(computePillarDistance(a, near)).toBeLessThan(computePillarDistance(a, far));
  });
});

describe("rankXimatarsByDistance / getTopXimatars", () => {
  it("returns the queried archetype first when its own pillar vector is the target", () => {
    const target = XIMATAR_PROFILES.lion.pillars;
    const ranked = rankXimatarsByDistance(target);
    expect(ranked[0].id).toBe("lion");
    expect(ranked[0].distance).toBe(0);
    // sorted ascending
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].distance).toBeGreaterThanOrEqual(ranked[i - 1].distance);
    }
  });

  it("getTopXimatars returns N ids", () => {
    const top = getTopXimatars(NEUTRAL_PILLARS, 3);
    expect(top).toHaveLength(3);
    top.forEach((id) => expect(XIMATAR_PROFILES[id]).toBeDefined());
  });
});
