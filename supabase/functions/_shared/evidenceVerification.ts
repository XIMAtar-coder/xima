/**
 * Verification for model-supplied evidence quotes.
 *
 * The product shows these quotes to the candidate as their own reflection and to
 * the employer as decision support, so a fabricated quote is worse than no quote
 * at all. A model asked for a "verbatim quote" will still occasionally paraphrase,
 * translate, or invent one — so nothing is trusted until it is found in the
 * candidate's actual text.
 *
 * Matching is normalized for whitespace and curly punctuation only. It is
 * deliberately NOT fuzzy: a near-miss is a paraphrase, and a paraphrase is not
 * evidence.
 */

export interface EvidenceItem {
  dimension: string;
  quote: string;
  is_strength: boolean;
}

/** Shortest span we accept. Below this, a match is likely coincidental. */
export const MIN_QUOTE_LENGTH = 12;
/** Upper bound on how many verified items we keep. */
export const MAX_EVIDENCE_ITEMS = 4;

export function normalizeForQuoteMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Keep only the evidence items whose quote genuinely occurs in `sourceText`.
 *
 * @param raw           Whatever the model returned for `evidence` (untrusted).
 * @param sourceText    ONLY the candidate's own words. Passing question text or
 *                      labels here would let the model quote the prompt back.
 * @param allowedDimensions Dimension names considered valid.
 * @param onReject      Optional hook for observability of dropped quotes.
 */
export function verifyEvidence(
  raw: unknown,
  sourceText: string,
  allowedDimensions: ReadonlySet<string>,
  onReject?: (info: { dimension: string; quote: string; reason: string }) => void,
): EvidenceItem[] {
  if (!Array.isArray(raw)) return [];

  const haystack = normalizeForQuoteMatch(sourceText);
  if (!haystack) return [];

  const seen = new Set<string>();
  const verified: EvidenceItem[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const dimension = String((item as Record<string, unknown>).dimension ?? '').trim();
    const quote = String((item as Record<string, unknown>).quote ?? '').trim().slice(0, 200);

    if (!allowedDimensions.has(dimension)) {
      onReject?.({ dimension, quote, reason: 'unknown_dimension' });
      continue;
    }
    if (quote.length < MIN_QUOTE_LENGTH) {
      onReject?.({ dimension, quote, reason: 'too_short' });
      continue;
    }

    const needle = normalizeForQuoteMatch(quote);
    if (!haystack.includes(needle)) {
      onReject?.({ dimension, quote, reason: 'not_found_in_source' });
      continue;
    }
    if (seen.has(needle)) continue;

    seen.add(needle);
    verified.push({
      dimension,
      quote,
      is_strength: (item as Record<string, unknown>).is_strength === true,
    });
    if (verified.length >= MAX_EVIDENCE_ITEMS) break;
  }

  return verified;
}
