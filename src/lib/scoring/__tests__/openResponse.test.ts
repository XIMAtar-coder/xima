import { describe, it, expect } from "vitest";
import { scoreOpenResponse, blendOpenIntoPillars } from "../openResponse";

describe("scoreOpenResponse", () => {
  it("returns zeros for empty text", () => {
    const r = scoreOpenResponse({ text: "", field: "science_tech", language: "en", openKey: "open1" });
    expect(r.total).toBe(0);
    expect(r.length).toBe(0);
    expect(r.relevance).toBe(0);
  });

  it("scores a strong domain-relevant answer highly", () => {
    const text = [
      "I designed and implemented a data pipeline to test a hypothesis about user retention.",
      "The dataset had 12000 rows; we validated performance metrics using an experiment.",
      "Therefore, we iterated on the model and deployed a prototype that improved accuracy.",
      "For example, the algorithm reduced errors by 23% after analysis and evidence review.",
    ].join(" ");
    const r = scoreOpenResponse({ text, field: "science_tech", language: "en", openKey: "open1" });
    expect(r.total).toBeGreaterThan(60);
    expect(r.relevance).toBeGreaterThan(0);
    expect(r.specificity).toBeGreaterThan(0);
    expect(r.action).toBeGreaterThan(0);
  });

  it("clamps total to 0..100", () => {
    const long = "data ".repeat(500) + "implemented analysis experiment therefore for example 42";
    const r = scoreOpenResponse({ text: long, field: "science_tech", language: "en", openKey: "open1" });
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it("is deterministic across calls", () => {
    const text = "I designed a strategy with clear KPIs and stakeholder alignment. Therefore we delivered.";
    const a = scoreOpenResponse({ text, field: "business_leadership", language: "en", openKey: "open2" });
    const b = scoreOpenResponse({ text, field: "business_leadership", language: "en", openKey: "open2" });
    expect(a).toEqual(b);
  });
});

describe("blendOpenIntoPillars", () => {
  const base = { computational_power: 50, communication: 50, knowledge: 50, creativity: 50, drive: 50 };

  it("leaves computational_power untouched (MC-only)", () => {
    const out = blendOpenIntoPillars(base, 100, 100);
    expect(out.computational_power).toBe(50);
  });

  it("blends open scores at 10% weight toward creativity/communication/drive/knowledge", () => {
    const out = blendOpenIntoPillars(base, 100, 100);
    // creativity: 50*0.9 + (100*0.6)*0.1 = 45 + 6 = 51
    expect(out.creativity).toBe(51);
    // communication: 50*0.9 + (100*0.4)*0.1 = 45 + 4 = 49
    expect(out.communication).toBe(49);
    // drive: 50*0.9 + (100*0.6)*0.1 = 51
    expect(out.drive).toBe(51);
    // knowledge: 50*0.9 + (100*0.4)*0.1 = 49
    expect(out.knowledge).toBe(49);
  });

  it("clamps results to 0..100", () => {
    const out = blendOpenIntoPillars({ ...base, creativity: 100 }, 100, 100);
    expect(out.creativity).toBeLessThanOrEqual(100);
    expect(out.creativity).toBeGreaterThanOrEqual(0);
  });
});
