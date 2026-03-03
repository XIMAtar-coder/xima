/**
 * XIMA Assessment Freeze Guard v1.2.1 — Content-Lock Verification
 * 
 * Validates that:
 * 1. All 3 locales have assessmentSets content
 * 2. Content-lock hashes differ per locale
 * 3. Hashes are deterministic
 * 4. A 1-char mutation changes the hash (content-lock proof)
 */
import { describe, it, expect } from 'vitest';
import { computeHash, computeAllHashes, ASSESSMENT_VERSION } from '../freezeGuard';
import enTranslations from '@/i18n/locales/en.json';
import itTranslations from '@/i18n/locales/it.json';
import esTranslations from '@/i18n/locales/es.json';

describe('Assessment Freeze Guard v1.2.1 (content-lock)', () => {
  it('version is 1.2.1', () => {
    expect(ASSESSMENT_VERSION).toBe('1.2.1');
  });

  it('all locales have assessmentSets content', () => {
    expect((enTranslations as any).assessmentSets).toBeDefined();
    expect((itTranslations as any).assessmentSets).toBeDefined();
    expect((esTranslations as any).assessmentSets).toBeDefined();
  });

  it('produces 8-char hex hashes', () => {
    const hashes = computeAllHashes();
    for (const [lang, hash] of Object.entries(hashes)) {
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
      console.log(`CONTENT-HASH ${lang.toUpperCase()}: ${hash}`);
    }
  });

  it('produces DIFFERENT hashes per locale (content-lock proof)', () => {
    const hashes = computeAllHashes();
    expect(hashes.en).not.toBe(hashes.it);
    expect(hashes.en).not.toBe(hashes.es);
    expect(hashes.it).not.toBe(hashes.es);
  });

  it('is deterministic', () => {
    const first = computeAllHashes();
    const second = computeAllHashes();
    expect(first).toEqual(second);
  });

  it('detects 1-char content mutation', () => {
    const mutated = JSON.parse(JSON.stringify(enTranslations));
    mutated.assessmentSets.science_tech.questions.q1.question += 'X';
    const original = computeHash(enTranslations as Record<string, unknown>);
    const changed = computeHash(mutated);
    expect(original).not.toBe(changed);
  });

  it('computed hashes match hard-coded sealed values', () => {
    const SEALED = { en: '11ffb15d', it: 'e7b14a09', es: 'd7d4491d' };
    const hashes = computeAllHashes();
    expect(hashes.en).toBe(SEALED.en);
    expect(hashes.it).toBe(SEALED.it);
    expect(hashes.es).toBe(SEALED.es);
  });
});
