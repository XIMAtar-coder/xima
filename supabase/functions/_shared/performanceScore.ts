/**
 * Turning a challenge submission into the number that feeds the 20-point
 * performance axis of the shortlist.
 *
 * Two grading shapes exist, on purpose:
 *
 *  - L1 and mindset submissions produce a numeric `overall` (0–100).
 *  - L2 produces five ordinal signals plus a readiness verdict, and no number.
 *    A technical deep-dive is graded on whether each dimension is legible, not
 *    on a point total.
 *
 * The shortlist originally read `overall` only, so every L2 submission was
 * skipped — the deepest stage of the funnel contributed nothing to the axis in
 * either direction. In the production data at the time of the fix that cut one
 * way: five of six L2 submissions graded `insufficient`, so failing the
 * technical deep-dive was free. Applying this mapping lowered all three affected
 * candidates' performance means. A strong L2 now helps for the same reason.
 *
 * The fix maps the ordinals here rather than fabricating an `overall` upstream,
 * which would have put an invented number into the stored grading record.
 */

/** Even spread of a 3-point ordinal scale over 0–100. */
const L2_SIGNAL_SCORE: Record<string, number> = {
  clear: 100,
  partial: 50,
  fragmented: 0,
};

const L2_SIGNAL_FIELDS = [
  "hardSkillClarity",
  "toolMethodMaturity",
  "decisionQualityUnderConstraints",
  "riskAwareness",
  "executionRealism",
];

/**
 * Returns the 0–100 performance score for a submission, or null when the payload
 * carries no gradable result and the submission should be skipped.
 *
 * Readiness (`overallReadiness`) is deliberately not folded in: it is the model's
 * holistic read of these same five signals, so counting it would double-weight
 * them.
 */
export function performanceScore(
  signalsPayload: Record<string, unknown> | null | undefined,
): number | null {
  const sp = signalsPayload;
  if (!sp || typeof sp !== "object") return null;

  if (typeof sp.overall === "number" && Number.isFinite(sp.overall)) {
    return sp.overall as number;
  }

  const values = L2_SIGNAL_FIELDS
    .map((f) => L2_SIGNAL_SCORE[String(sp[f])])
    .filter((v): v is number => typeof v === "number");

  // All five or nothing. A payload missing signals is a payload we do not
  // understand, and averaging the remainder would quietly invent a score for a
  // candidate we failed to grade.
  if (values.length !== L2_SIGNAL_FIELDS.length) return null;

  return values.reduce((a, b) => a + b, 0) / values.length;
}
