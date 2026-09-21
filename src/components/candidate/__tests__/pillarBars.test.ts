import { describe, it, expect } from 'vitest';
import { readPillar } from '../PillarBars';

/** Pillars are stored on two scales and with two spellings; the bars draw 0–10. */
describe('readPillar (candidate bars)', () => {
  it('reads the 0-10 profile scale as-is', () => {
    expect(readPillar({ drive: 5.5 }, 'drive')).toBe(5.5);
  });
  it('brings a 0-100 vector back to 0-10', () => {
    expect(readPillar({ drive: 72 }, 'drive')).toBe(7.2);
  });
  it('accepts either computational spelling', () => {
    expect(readPillar({ computational_power: 8.2 }, 'computational_power')).toBe(8.2);
    expect(readPillar({ comp_power: 88 }, 'computational_power')).toBe(8.8);
  });
  it('returns null when the value is missing or not a number', () => {
    expect(readPillar({}, 'knowledge')).toBeNull();
    expect(readPillar(null, 'knowledge')).toBeNull();
  });
});
