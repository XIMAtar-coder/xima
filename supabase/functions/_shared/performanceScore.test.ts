/**
 * The regression pinned here: L2 submissions scored 0 on the performance axis
 * because they carry ordinal signals instead of a numeric `overall`. Six live
 * submissions across three candidates were affected — all of them people who had
 * reached the deepest stage of the funnel.
 */
import { describe, expect, it } from "vitest";
import { performanceScore } from "./performanceScore.ts";

const l2 = (over: Record<string, string> = {}) => ({
  hardSkillClarity: "clear",
  toolMethodMaturity: "clear",
  decisionQualityUnderConstraints: "clear",
  riskAwareness: "clear",
  executionRealism: "clear",
  overallReadiness: "ready",
  ...over,
});

describe("performanceScore", () => {
  it("passes a numeric overall through untouched", () => {
    expect(performanceScore({ overall: 73 })).toBe(73);
  });

  it("scores an L2 payload instead of skipping it", () => {
    // The bug: this returned null, so the submission never reached the axis.
    expect(performanceScore(l2())).toBe(100);
  });

  it("separates the two shapes seen in production", () => {
    // Real payload: ready, four clear + one partial.
    const strong = performanceScore(l2({ toolMethodMaturity: "partial" }));
    // Real payload: insufficient, all five fragmented.
    const weak = performanceScore(
      l2({
        hardSkillClarity: "fragmented",
        toolMethodMaturity: "fragmented",
        decisionQualityUnderConstraints: "fragmented",
        riskAwareness: "fragmented",
        executionRealism: "fragmented",
        overallReadiness: "insufficient",
      }),
    );
    expect(strong).toBe(90);
    expect(weak).toBe(0);
    expect(strong!).toBeGreaterThan(weak!);
  });

  it("spreads the ordinal scale evenly", () => {
    expect(performanceScore(l2({ hardSkillClarity: "partial" }))).toBe(90);
    expect(
      performanceScore(
        l2({
          hardSkillClarity: "partial",
          toolMethodMaturity: "partial",
          decisionQualityUnderConstraints: "partial",
          riskAwareness: "partial",
          executionRealism: "partial",
        }),
      ),
    ).toBe(50);
  });

  it("ignores readiness, which would double-count the same five signals", () => {
    const a = performanceScore(l2({ overallReadiness: "ready" }));
    const b = performanceScore(l2({ overallReadiness: "insufficient" }));
    expect(a).toBe(b);
  });

  it("refuses to grade a partial payload rather than guessing", () => {
    const missing = l2();
    delete (missing as Record<string, unknown>).riskAwareness;
    expect(performanceScore(missing)).toBeNull();
  });

  it("refuses unrecognised ordinal values", () => {
    expect(performanceScore(l2({ riskAwareness: "excellent" }))).toBeNull();
  });

  it("returns null for empty, null and non-gradable payloads", () => {
    expect(performanceScore(null)).toBeNull();
    expect(performanceScore(undefined)).toBeNull();
    expect(performanceScore({})).toBeNull();
    expect(performanceScore({ summary: "no grade here" })).toBeNull();
  });

  it("rejects a non-finite overall instead of poisoning the mean", () => {
    expect(performanceScore({ overall: NaN })).toBeNull();
    expect(performanceScore({ overall: Infinity })).toBeNull();
  });
});
