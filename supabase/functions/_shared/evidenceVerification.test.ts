/**
 * The evidence contract: a claim shown to a candidate or an employer must be
 * traceable to a sentence the candidate actually wrote. These tests pin the
 * rejection behaviour, because a fabricated quote is the failure mode that
 * matters — it is invisible in the UI and indistinguishable from a real one.
 */
import { describe, expect, it } from 'vitest';
import {
  verifyEvidence,
  normalizeForQuoteMatch,
  MAX_EVIDENCE_ITEMS,
} from './evidenceVerification.ts';

const DIMENSIONS = new Set([
  'framing',
  'execution_bias',
  'impact_thinking',
  'decision_quality',
]);

const SOURCE =
  'Ho scelto di calmare la situazione perché di solito sono tutti nervosi. ' +
  'Poi ho verificato con il capocantiere prima di decidere qualsiasi cosa.';

const item = (over: Partial<Record<string, unknown>> = {}) => ({
  dimension: 'framing',
  quote: 'ho verificato con il capocantiere',
  is_strength: true,
  ...over,
});

describe('verifyEvidence', () => {
  it('keeps a quote that appears verbatim in the candidate text', () => {
    const out = verifyEvidence([item()], SOURCE, DIMENSIONS);
    expect(out).toHaveLength(1);
    expect(out[0].quote).toBe('ho verificato con il capocantiere');
    expect(out[0].is_strength).toBe(true);
  });

  it('drops a fabricated quote that is not in the source', () => {
    const out = verifyEvidence(
      [item({ quote: 'ho consultato immediatamente il consiglio direttivo' })],
      SOURCE,
      DIMENSIONS,
    );
    expect(out).toEqual([]);
  });

  it('drops a paraphrase — near-miss is not evidence', () => {
    // Same meaning, different words: must not pass.
    const out = verifyEvidence(
      [item({ quote: 'ho parlato con il capocantiere prima di decidere' })],
      SOURCE,
      DIMENSIONS,
    );
    expect(out).toEqual([]);
  });

  it('tolerates whitespace and curly-quote differences', () => {
    const out = verifyEvidence(
      [item({ quote: 'ho   verificato con\nil capocantiere' })],
      SOURCE,
      DIMENSIONS,
    );
    expect(out).toHaveLength(1);
  });

  it('rejects unknown dimensions', () => {
    const out = verifyEvidence([item({ dimension: 'charisma' })], SOURCE, DIMENSIONS);
    expect(out).toEqual([]);
  });

  it('rejects quotes too short to be meaningful', () => {
    const out = verifyEvidence([item({ quote: 'ho' })], SOURCE, DIMENSIONS);
    expect(out).toEqual([]);
  });

  it('never quotes from text that is not the candidate’s own words', () => {
    // The question text is deliberately NOT part of the source we match against.
    const questionText = 'Su «Capocantiere» hai scelto Calmo la situazione. Cosa ti ha guidato?';
    const out = verifyEvidence(
      [item({ quote: 'Cosa ti ha guidato' })],
      SOURCE, // candidate answers only
      DIMENSIONS,
    );
    expect(out).toEqual([]);
    expect(questionText).toContain('Cosa ti ha guidato'); // it exists — just not quotable
  });

  it('de-duplicates repeated quotes', () => {
    const out = verifyEvidence([item(), item()], SOURCE, DIMENSIONS);
    expect(out).toHaveLength(1);
  });

  it('caps the number of items', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      dimension: 'framing',
      // distinct verbatim spans so they are not de-duplicated
      quote: SOURCE.slice(i, i + 30),
      is_strength: true,
    }));
    expect(verifyEvidence(many, SOURCE, DIMENSIONS).length).toBeLessThanOrEqual(
      MAX_EVIDENCE_ITEMS,
    );
  });

  it('returns an empty list for malformed input rather than throwing', () => {
    expect(verifyEvidence(null, SOURCE, DIMENSIONS)).toEqual([]);
    expect(verifyEvidence('nope', SOURCE, DIMENSIONS)).toEqual([]);
    expect(verifyEvidence([null, 42, {}], SOURCE, DIMENSIONS)).toEqual([]);
  });

  it('returns nothing when the candidate wrote nothing', () => {
    expect(verifyEvidence([item()], '', DIMENSIONS)).toEqual([]);
  });

  it('reports why a quote was rejected', () => {
    const reasons: string[] = [];
    verifyEvidence([item({ quote: 'una frase completamente inventata' })], SOURCE, DIMENSIONS, (i) =>
      reasons.push(i.reason),
    );
    expect(reasons).toContain('not_found_in_source');
  });
});

describe('normalizeForQuoteMatch', () => {
  it('collapses whitespace and normalizes curly punctuation', () => {
    expect(normalizeForQuoteMatch('  L’ho  fatto\n“subito” ')).toBe('l\'ho fatto "subito"');
  });
});
