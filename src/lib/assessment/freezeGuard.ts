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

import { log } from '@/lib/log';

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
 * Compute hashes for a set of already-loaded locales.
 *
 * Takes the locale data as an argument rather than importing it. Importing all
 * three here is what forced every locale into the entry chunk: this module runs
 * at startup, so a static import of en/it/es made them unsplittable no matter
 * how i18n loaded them.
 */
export function computeAllHashes(
  locales: Record<string, Record<string, unknown>>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(locales).map(([lang, data]) => [lang, computeHash(data)])
  );
}

/**
 * Frozen v1.2.1 content-lock hashes — HARD-CODED.
 * These are sealed by: npx tsx scripts/sealFreezeHashes.ts
 * 
 * IMPORTANT: These MUST differ per locale (unless translations are identical).
 */
export const ASSESSMENT_FREEZE_HASHES: Record<string, string> = {
  en: "11ffb15d",
  it: "e7b14a09",
  es: "d7d4491d",
};

const validatedLocales = new Set<string>();

/**
 * Validate one locale's assessment content against its sealed hash.
 *
 * Called as each locale is loaded, rather than once over all three at startup —
 * with locales code-split, only the ones actually in use exist at runtime, so
 * "validate everything" is no longer a question this module can answer. The
 * complete set is covered at build time instead, by the freezeGuard test that
 * imports all three and asserts every sealed hash.
 *
 * PRODUCTION: throws on a missing subtree or a hash mismatch — the app will not
 * render with assessment content that has silently drifted.
 * DEVELOPMENT: logs the violation and continues.
 */
export function validateLocaleFreeze(
  lang: string,
  data: Record<string, unknown>
): string | null {
  const subtree = getAssessmentSubtree(data);

  if (!subtree) {
    const msg =
      `🚨 FATAL: [ASSESSMENT FREEZE] v${ASSESSMENT_VERSION} ` +
      `${lang.toUpperCase()}: assessmentSets subtree MISSING`;
    log.error(msg);
    if (import.meta.env.PROD) throw new Error(msg);
    return null;
  }

  const hash = computeHash(data);
  const frozenHash = ASSESSMENT_FREEZE_HASHES[lang];

  // An unknown locale has no sealed baseline to compare against. Say so rather
  // than passing it silently, which would read as "verified".
  if (!frozenHash) {
    log.warn(
      `[ASSESSMENT FREEZE] v${ASSESSMENT_VERSION} ${lang.toUpperCase()}: ` +
      `no sealed hash for this locale — content is UNVERIFIED (got ${hash})`
    );
    return hash;
  }

  if (frozenHash !== hash) {
    const msg =
      `🚨 FATAL: [ASSESSMENT FREEZE VIOLATION] v${ASSESSMENT_VERSION} ` +
      `${lang.toUpperCase()} hash mismatch!\n` +
      `   Expected: ${frozenHash}\n` +
      `   Got:      ${hash}\n` +
      `   Assessment content was modified without updating the version.\n` +
      `   This BREAKS psychometric validity. Revert, or bump the version and reseal.`;
    log.error(msg);
    if (import.meta.env.PROD) throw new Error(msg);
    return hash;
  }

  if (!validatedLocales.has(lang)) {
    validatedLocales.add(lang);
    log.debug(`✅ [Assessment Freeze] v${ASSESSMENT_VERSION} ${lang.toUpperCase()}: ${hash}`);
  }
  return hash;
}
