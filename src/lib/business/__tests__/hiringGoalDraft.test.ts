import { afterEach, describe, expect, it } from 'vitest';
import {
  clearGoalDraft,
  countryCodeFromProfile,
  deriveRal,
  loadGoalDraft,
  saveGoalDraft,
} from '../hiringGoalDraft';

describe('deriveRal', () => {
  it('uses the yearly range as RAL', () => {
    expect(deriveRal(30000, 40000, 'yearly')).toEqual({ ral_min: 30000, ral_max: 40000 });
  });
  it('converts a monthly range on 13 payments', () => {
    expect(deriveRal(2000, 2500, 'monthly')).toEqual({ ral_min: 26000, ral_max: 32500 });
  });
  it('treats empty values as 0', () => {
    expect(deriveRal(0, NaN, 'yearly')).toEqual({ ral_min: 0, ral_max: 0 });
  });
});

describe('countryCodeFromProfile', () => {
  it('maps common names and codes', () => {
    expect(countryCodeFromProfile('Italy')).toBe('IT');
    expect(countryCodeFromProfile(' italia ')).toBe('IT');
    expect(countryCodeFromProfile('Deutschland')).toBe('DE');
    expect(countryCodeFromProfile('U.S.A.')).toBe('US');
  });
  it('returns empty for unknown countries', () => {
    expect(countryCodeFromProfile('Portugal')).toBe('');
    expect(countryCodeFromProfile(null)).toBe('');
  });
});

describe('goal draft storage', () => {
  afterEach(() => window.localStorage.clear());

  it('round-trips per user', () => {
    saveGoalDraft('u1', 2, { role_title: 'PM' });
    expect(loadGoalDraft<{ role_title: string }>('u1')?.formData.role_title).toBe('PM');
    expect(loadGoalDraft('u1')?.step).toBe(2);
    expect(loadGoalDraft('u2')).toBeNull();
    clearGoalDraft('u1');
    expect(loadGoalDraft('u1')).toBeNull();
  });

  it('ignores corrupt entries', () => {
    window.localStorage.setItem('xima:hiring-goal-draft:v1:u3', '{not json');
    expect(loadGoalDraft('u3')).toBeNull();
  });
});
