/**
 * XIMA Assessment v1.2.1 Freeze Guard — Content-Lock Hash
 * 
 * Ensures runtime assessment content matches the frozen v1.2.1 baseline.
 * Unlike v1.1 (structural-only), this version hashes ALL content:
 * question text, option text, categories, and scoring-relevant fields.
 * 
 * Hashes DIFFER per locale when translations differ (EN ≠ IT ≠ ES).
 * 
 * BEHAVIOR:
 * - Production: throws Error if hashes mismatch → app WILL NOT start
 * - Development: logs violations as errors but does not throw
 * 
 * HOW TO BUMP:
 * 1. Update ASSESSMENT_VERSION
 * 2. Run: npx tsx scripts/sealFreezeHashes.ts
 * 3. Commit with message: "chore: bump assessment freeze to vX.Y"
 */

import enTranslations from '@/i18n/locales/en.json';
import itTranslations from '@/i18n/locales/it.json';
import esTranslations from '@/i18n/locales/es.json';

export const ASSESSMENT_VERSION = "1.2.1";

/**
 * Recursively stable-stringify any value with sorted object keys.
 * Guarantees deterministic output regardless of key insertion order.
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
  }
  return String(value);
}

/**
 * Compute a deterministic djb2 hash of a string.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Get the FULL content-level serialization of assessmentSets.
 * Includes all question text, options, categories — everything.
 */
function getAssessmentSubtree(locale: Record<string, unknown>): string {
  const sets = (locale as any)?.assessmentSets;
  if (!sets) return '';
  return stableStringify(sets);
}

export function computeHash(locale: Record<string, unknown>): string {
  return djb2Hash(getAssessmentSubtree(locale));
}

/**
 * Compute current hashes for all locales (exported for tests).
 */
export function computeAllHashes(): Record<string, string> {
  return {
    en: computeHash(enTranslations as Record<string, unknown>),
    it: computeHash(itTranslations as Record<string, unknown>),
    es: computeHash(esTranslations as Record<string, unknown>),
  };
}

/**
 * Frozen v1.2.1 content-lock hashes — HARD-CODED.
 * These are sealed by: npx tsx scripts/sealFreezeHashes.ts
 * 
 * IMPORTANT: These MUST differ per locale (unless translations are identical).
 */
const ASSESSMENT_FREEZE_HASHES: Record<string, string> = {
  en: "11ffb15d",
  it: "e7b14a09",
  es: "d7d4491d",
};

let freezeInitialized = false;

/**
 * Validate assessment content integrity at startup.
 * 
 * PRODUCTION: Throws Error on null or mismatched hashes — app will not render.
 * DEVELOPMENT: Self-seals on first run, validates on subsequent runs.
 * 
 * Returns computed hashes for telemetry/debugging.
 */
export function validateAssessmentFreeze(): Record<string, string> | null {
  const locales = {
    en: enTranslations,
    it: itTranslations,
    es: esTranslations,
  };

  const currentHashes: Record<string, string> = {};
  const violations: string[] = [];

  for (const [lang, data] of Object.entries(locales)) {
    const subtree = getAssessmentSubtree(data as Record<string, unknown>);
    
    // Fatal: assessmentSets missing from locale
    if (!subtree) {
      const msg = `[ASSESSMENT FREEZE] v${ASSESSMENT_VERSION} ${lang.toUpperCase()}: assessmentSets subtree MISSING`;
      violations.push(msg);
      continue;
    }

    const hash = computeHash(data as Record<string, unknown>);
    currentHashes[lang] = hash;

    const frozenHash = ASSESSMENT_FREEZE_HASHES[lang];

    if (frozenHash !== hash) {
      violations.push(
        `[ASSESSMENT FREEZE VIOLATION] v${ASSESSMENT_VERSION} ${lang.toUpperCase()} hash mismatch!\n` +
        `   Expected: ${frozenHash}\n` +
        `   Got:      ${hash}\n` +
        `   Assessment content was modified without updating the version.\n` +
        `   This BREAKS psychometric validity. Revert or bump to v1.2.`
      );
    }
  }

  // If any violations, fail loudly
  if (violations.length > 0) {
    const fullMessage = `🚨 FATAL: Assessment Freeze Check Failed\n\n${violations.join('\n\n')}`;
    console.error(fullMessage);
    
    if (import.meta.env.PROD) {
      // In production, throw to prevent app from starting with corrupted content
      throw new Error(fullMessage);
    }
  }

  if (!freezeInitialized) {
    freezeInitialized = true;
    console.log(
      `✅ [Assessment Freeze] v${ASSESSMENT_VERSION} validated\n` +
      `   EN: ${currentHashes.en}\n` +
      `   IT: ${currentHashes.it}\n` +
      `   ES: ${currentHashes.es}`
    );
  }

  return currentHashes;
}

/**
 * Dev-only verification: recompute hashes and assert they match sealed values.
 * Prints PASS/FAIL to console.
 */
export function verifyFreezeIntegrity(): boolean {
  const current = computeAllHashes();
  const results: string[] = [];
  let allPass = true;

  for (const [lang, hash] of Object.entries(current)) {
    const frozen = ASSESSMENT_FREEZE_HASHES[lang];
    if (frozen === hash) {
      results.push(`  ${lang.toUpperCase()}: PASS (${hash})`);
    } else {
      results.push(`  ${lang.toUpperCase()}: FAIL (expected ${frozen}, got ${hash})`);
      allPass = false;
    }
  }

  const status = allPass ? '✅ PASS' : '❌ FAIL';
  console.log(`[Freeze Integrity Check] ${status}\n${results.join('\n')}`);
  return allPass;
}

/**
 * Utility to regenerate hashes for a new version.
 * Run from browser console: import('/src/lib/assessment/freezeGuard').then(m => m.regenerateHashes())
 */
export function regenerateHashes(): void {
  const hashes = computeAllHashes();
  console.log('=== Assessment Freeze Hashes (copy into ASSESSMENT_FREEZE_HASHES) ===');
  for (const [lang, hash] of Object.entries(hashes)) {
    console.log(`  ${lang}: "${hash}",`);
  }
  console.log('Replace null values in freezeGuard.ts with these hashes, then commit.');
}
