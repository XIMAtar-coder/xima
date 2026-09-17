import { describe, expect, it } from 'vitest';
import { INDUSTRIES, isKnownIndustry, normalizeIndustry } from '../industries';

describe('industries', () => {
  it('covers every value registration and settings used to offer', () => {
    const registration = ['technology', 'finance', 'consulting', 'manufacturing', 'automotive', 'energy', 'healthcare',
      'education', 'media', 'retail', 'food', 'real_estate', 'nonprofit', 'government', 'other'];
    const settings = ['technology', 'engineering', 'finance', 'consulting', 'healthcare', 'manufacturing', 'retail',
      'education', 'other'];
    for (const v of [...registration, ...settings]) expect(INDUSTRIES).toContain(v);
  });

  it('normalizes casing variants onto known values', () => {
    expect(normalizeIndustry('Automotive')).toBe('automotive');
    expect(normalizeIndustry(' real estate ')).toBe('real_estate');
  });

  it('keeps unknown legacy values instead of blanking them', () => {
    expect(normalizeIndustry('Aerospace & Defence')).toBe('Aerospace & Defence');
    expect(isKnownIndustry('Aerospace & Defence')).toBe(false);
    expect(normalizeIndustry(null)).toBe('');
  });
});
