/**
 * The client and server copies of the L1 heuristic must not drift.
 *
 * The candidate sees the score from the browser copy; the business ranks them by
 * the score the edge function computed. If these two files diverge, the product
 * shows one number and decides on another, and nothing anywhere reports it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeSignals } from '../computeSignals';

const ROOT = resolve(__dirname, '../../../..');
const CLIENT = resolve(ROOT, 'src/lib/signals/computeSignals.ts');
const SERVER = resolve(ROOT, 'supabase/functions/_shared/computeSignals.ts');

/** Everything after the leading block comment — the code, minus each file's own header. */
const bodyOf = (path: string) => {
  const src = readFileSync(path, 'utf-8');
  const end = src.indexOf('*/');
  return src.slice(end + 2).trim();
};

describe('computeSignals — client/server parity', () => {
  it('is byte-identical on both sides', () => {
    expect(bodyOf(SERVER)).toBe(bodyOf(CLIENT));
  });
});

const base = {
  approach: 'x',
  assumptions: 'y',
  first_actions: ['a', 'b', 'c'],
  tradeoff_priority: 'speed',
  confidence: 'medium',
};

describe('computeSignals — behaviour the ranking depends on', () => {
  it('is deterministic for the same input', () => {
    const a = computeSignals(base);
    const b = computeSignals(base);
    expect(a).toEqual(b);
  });

  it('keeps every score inside 0-100', () => {
    const empty = computeSignals({
      approach: '', assumptions: '', first_actions: [], tradeoff_priority: '', confidence: '',
    });
    for (const k of ['framing', 'decision_quality', 'execution_bias', 'impact_thinking', 'overall'] as const) {
      expect(empty[k]).toBeGreaterThanOrEqual(0);
      expect(empty[k]).toBeLessThanOrEqual(100);
    }

    const rich = computeSignals({
      approach: 'Because the deadline is tight I will compare two options rather than one. '.repeat(8),
      assumptions: '- budget is fixed\n- scope may change\n- the risk is the deadline\n'.repeat(4),
      first_actions: [
        'Immediately measure the 30% drop in customer conversion with the team',
        'Focus on the KPI that must move and deliver a first result in 5 days',
        'Ensure stakeholders agree the target before we commit to the deadline',
      ],
      tradeoff_priority: 'quality',
      confidence: 'high',
    });
    expect(rich.overall).toBeLessThanOrEqual(100);
    expect(rich.overall).toBeGreaterThan(computeSignals(base).overall);
  });

  it('rates a substantive answer above an empty one', () => {
    const empty = computeSignals({
      approach: '', assumptions: '', first_actions: [], tradeoff_priority: '', confidence: '',
    });
    expect(computeSignals(base).overall).toBeGreaterThan(empty.overall);
  });

  it('never repeats a flag', () => {
    const s = computeSignals(base);
    expect(new Set(s.flags).size).toBe(s.flags.length);
  });
});
