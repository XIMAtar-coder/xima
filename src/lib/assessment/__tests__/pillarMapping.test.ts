import { describe, it, expect } from "vitest";
import {
  getPillarForQuestion,
  buildQuestionPillarMap,
  getQuestionIdsByPillar,
  PILLAR_CYCLE,
} from "../getPillarForQuestion";

describe("getPillarForQuestion", () => {
  it("respects the canonical cyclic order for q1..q5", () => {
    expect(getPillarForQuestion(1)).toBe("computational_power");
    expect(getPillarForQuestion(2)).toBe("communication");
    expect(getPillarForQuestion(3)).toBe("knowledge");
    expect(getPillarForQuestion(4)).toBe("creativity");
    expect(getPillarForQuestion(5)).toBe("drive");
  });

  it("wraps cyclically at q6 and q21", () => {
    expect(getPillarForQuestion(6)).toBe("computational_power");
    expect(getPillarForQuestion(21)).toBe("computational_power");
  });

  it("accepts string ids like 'q7'", () => {
    expect(getPillarForQuestion("q7")).toBe("communication");
  });

  it("prefers i18n category label over cyclic fallback", () => {
    // question 1 would cyclically be computational_power, but label wins
    expect(getPillarForQuestion(1, "Creatività")).toBe("creativity");
    expect(getPillarForQuestion(1, "creativity")).toBe("creativity");
    expect(getPillarForQuestion(1, "Comunicación")).toBe("communication");
  });

  it("falls back to cyclic mapping when label is unknown", () => {
    expect(getPillarForQuestion(2, "totally-unknown-label")).toBe("communication");
  });

  it("defaults to creativity for invalid ids", () => {
    expect(getPillarForQuestion("no-digits")).toBe("creativity");
    expect(getPillarForQuestion(0)).toBe("creativity");
  });
});

describe("buildQuestionPillarMap", () => {
  it("returns a 21-entry map matching the cycle", () => {
    const map = buildQuestionPillarMap();
    expect(Object.keys(map)).toHaveLength(21);
    for (let i = 1; i <= 21; i++) {
      expect(map[i]).toBe(PILLAR_CYCLE[(i - 1) % 5]);
    }
  });
});

describe("getQuestionIdsByPillar", () => {
  it("groups all 21 questions across 5 pillars", () => {
    const groups = getQuestionIdsByPillar();
    const total = Object.values(groups).reduce((a, ids) => a + ids.length, 0);
    expect(total).toBe(21);
    expect(groups.computational_power).toEqual([1, 6, 11, 16, 21]);
    expect(groups.communication).toEqual([2, 7, 12, 17]);
    expect(groups.drive).toEqual([5, 10, 15, 20]);
  });
});
