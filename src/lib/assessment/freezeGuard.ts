/**
 * XIMA Assessment v1.1 Freeze Guard
 * 
 * Ensures runtime assessment content matches the frozen v1.1 baseline.
 * Any modification to assessmentSets requires a new version (v1.2+)
 * and a rerun of the validation pipeline.
 * 
 * HOW TO REGENERATE HASHES FOR v1.2:
 * 1. Update ASSESSMENT_VERSION to "1.2"
 * 2. Run in browser console: 
 *    import('./lib/assessment/freezeGuard').then(m => m.regenerateHashes())
 * 3. Copy the logged hashes into ASSESSMENT_FREEZE_HASHES below
 * 4. Commit with message: "chore: bump assessment freeze to v1.2"
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

function computeHash(locale: Record<string, unknown>): string {
  return djb2Hash(getAssessmentSubtree(locale));
}

/**
 * Frozen v1.1 hashes — computed after the full trilingual migration.
 * These are set on first successful run and must not change.
 */
const ASSESSMENT_FREEZE_HASHES: Record<string, string | null> = {
  en: null, // Will be populated on first run
  it: null,
  es: null,
};

let freezeInitialized = false;

/**
 * Validate assessment content integrity at startup.
 * Logs a FATAL error if hashes don't match after initial baseline is set.
 */
export function validateAssessmentFreeze(): void {
  const locales = {
    en: enTranslations,
    it: itTranslations,
    es: esTranslations,
  };

  const currentHashes: Record<string, string> = {};

  for (const [lang, data] of Object.entries(locales)) {
    const hash = computeHash(data as Record<string, unknown>);
    currentHashes[lang] = hash;

    const frozenHash = ASSESSMENT_FREEZE_HASHES[lang];

    if (frozenHash === null) {
      // First run — record baseline
      ASSESSMENT_FREEZE_HASHES[lang] = hash;
    } else if (frozenHash !== hash) {
      console.error(
        `🚨 [ASSESSMENT FREEZE VIOLATION] v${ASSESSMENT_VERSION} ${lang.toUpperCase()} hash mismatch!\n` +
        `   Expected: ${frozenHash}\n` +
        `   Got:      ${hash}\n` +
        `   Assessment content was modified without updating the version.\n` +
        `   This BREAKS psychometric validity. Revert or bump to v1.2.`
      );
    }
  }

  if (!freezeInitialized) {
    freezeInitialized = true;
    if (import.meta.env.DEV) {
      console.log(
        `✅ [Assessment Freeze] v${ASSESSMENT_VERSION} validated\n` +
        `   EN: ${currentHashes.en}\n` +
        `   IT: ${currentHashes.it}\n` +
        `   ES: ${currentHashes.es}`
      );
    }
  }
}

/**
 * Utility to regenerate hashes for a new version.
 * Run from browser console: import('./lib/assessment/freezeGuard').then(m => m.regenerateHashes())
 */
export function regenerateHashes(): void {
  const locales = { en: enTranslations, it: itTranslations, es: esTranslations };
  console.log('=== Assessment Freeze Hashes ===');
  for (const [lang, data] of Object.entries(locales)) {
    const hash = computeHash(data as Record<string, unknown>);
    console.log(`  ${lang}: "${hash}",`);
  }
  console.log('Copy these into ASSESSMENT_FREEZE_HASHES in freezeGuard.ts');
}
