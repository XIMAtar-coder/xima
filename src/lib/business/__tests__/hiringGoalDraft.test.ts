import { afterEach, describe, expect, it } from 'vitest';
import {
  clearGoalDraft,
  countryCodeFromProfile,
  deriveRal,
  loadGoalDraft,
  saveGoalDraft,
} from '../hiringGoalDraft';
import { defaultPayMonths } from '../ccnl';

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
  it('uses 14 payments when the contract has a quattordicesima', () => {
    expect(deriveRal(2000, 2500, 'monthly', 14)).toEqual({ ral_min: 28000, ral_max: 35000 });
  });
});

describe('defaultPayMonths', () => {
  it('follows the Italian CCNL', () => {
    expect(defaultPayMonths('IT', 'commercio_terziario')).toBe(14);
    expect(defaultPayMonths('IT', 'metalmeccanico_industria')).toBe(13);
    expect(defaultPayMonths('IT', 'assicurazioni_ania')).toBe(14);
    expect(defaultPayMonths('IT', 'credito_abi')).toBe(13);
    expect(defaultPayMonths('IT', 'altro')).toBe(13);
    expect(defaultPayMonths('IT', '')).toBe(13);
  });
  it('uses the statutory 14 pagas in Spain and 12 elsewhere', () => {
    expect(defaultPayMonths('ES', '')).toBe(14);
    expect(defaultPayMonths('DE', '')).toBe(12);
    expect(defaultPayMonths('FR', 'commercio_terziario')).toBe(12);
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
