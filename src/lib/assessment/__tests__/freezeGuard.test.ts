/**
 * XIMA Assessment Freeze Guard — Verification Test
 * 
 * Validates that:
 * 1. All 3 locales (EN/IT/ES) have assessmentSets content
 * 2. Computed hashes match the hard-coded frozen values
 * 3. Hashes are deterministic (recomputing yields same result)
 */
import { describe, it, expect } from 'vitest';
import { computeHash, computeAllHashes, ASSESSMENT_VERSION } from '../freezeGuard';
import enTranslations from '@/i18n/locales/en.json';
import itTranslations from '@/i18n/locales/it.json';
import esTranslations from '@/i18n/locales/es.json';

const EXPECTED_HASHES = {
  en: '65add290',
  it: '65add290',
  es: '65add290',
};

describe('Assessment Freeze Guard', () => {
  it('computed hashes match hard-coded frozen values', () => {
    const hashes = computeAllHashes();

    console.log('[Freeze Integrity Check]');
    console.log(`  EN: ${hashes.en === EXPECTED_HASHES.en ? 'PASS' : 'FAIL'} (${hashes.en})`);
    console.log(`  IT: ${hashes.it === EXPECTED_HASHES.it ? 'PASS' : 'FAIL'} (${hashes.it})`);
    console.log(`  ES: ${hashes.es === EXPECTED_HASHES.es ? 'PASS' : 'FAIL'} (${hashes.es})`);

    expect(hashes.en).toBe(EXPECTED_HASHES.en);
    expect(hashes.it).toBe(EXPECTED_HASHES.it);
    expect(hashes.es).toBe(EXPECTED_HASHES.es);
  });

  it('produces deterministic hashes on repeated computation', () => {
    const first = computeAllHashes();
    const second = computeAllHashes();
    expect(first.en).toBe(second.en);
    expect(first.it).toBe(second.it);
    expect(first.es).toBe(second.es);
  });

  it('all locales have assessmentSets content', () => {
    expect((enTranslations as any).assessmentSets).toBeDefined();
    expect((itTranslations as any).assessmentSets).toBeDefined();
    expect((esTranslations as any).assessmentSets).toBeDefined();
  });

  it('version is set to 1.1', () => {
    expect(ASSESSMENT_VERSION).toBe('1.1');
  });
});
