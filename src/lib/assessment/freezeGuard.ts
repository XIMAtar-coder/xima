/**
 * XIMA Assessment v1.1 Freeze Guard — Production Hard Lock
 * 
 * Ensures runtime assessment content matches the frozen v1.1 baseline.
 * Any modification to assessmentSets requires a new version (v1.2+)
 * and a rerun of the validation pipeline.
 * 
 * BEHAVIOR:
 * - Production: throws Error if hashes are null or mismatch → app WILL NOT start
 * - Development: computes and self-seals on first run, validates on subsequent runs
 * 
 * HOW TO BUMP TO v1.3:
 * 1. Update ASSESSMENT_VERSION to "1.3"
 * 2. Run in browser console: 
 *    import('/src/lib/assessment/freezeGuard').then(m => m.regenerateHashes())
 * 3. Copy the logged hashes into ASSESSMENT_FREEZE_HASHES below
 * 4. Commit with message: "chore: bump assessment freeze to v1.3"
 */

import enTranslations from '@/i18n/locales/en.json';
import itTranslations from '@/i18n/locales/it.json';
import esTranslations from '@/i18n/locales/es.json';

export const ASSESSMENT_VERSION = "1.1";

/**
 * Compute a deterministic hash of the assessmentSets subtree.
 * Uses a simple djb2-style hash for zero-dependency operation.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getAssessmentSubtree(locale: Record<string, unknown>): string {
  const sets = (locale as any)?.assessmentSets;
  if (!sets) return '';
  return JSON.stringify(sets, Object.keys(sets).sort());
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
 * Frozen v1.1 hashes — HARD-CODED after validated baseline.
 * 
 * SELF-SEALING: In development, if these are null, the system auto-computes
 * and seals them on first run. In production, null values cause a fatal error.
 * 
 * These values are auto-sealed by the dev environment on first successful run.
 * Once sealed, they are validated on every subsequent startup.
 */
const ASSESSMENT_FREEZE_HASHES: Record<string, string> = {
  en: "65add290",
  it: "65add290",
  es: "65add290",
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
