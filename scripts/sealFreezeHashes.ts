/**
 * scripts/sealFreezeHashes.ts
 * 
 * Automated freeze hash sealing script.
 * Computes djb2 hashes of assessmentSets for all locales and patches freezeGuard.ts.
 * 
 * Usage:
 *   npx tsx scripts/sealFreezeHashes.ts
 * 
 * This script is idempotent:
 *   - If already sealed and matches → no-op
 *   - If sealed but mismatch → fails loudly
 *   - If not yet sealed (null) → patches file
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── Replicate the EXACT hashing logic from freezeGuard.ts ───

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
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

// ─── Main ───

const ROOT = resolve(import.meta.dirname, '..');
const GUARD_PATH = resolve(ROOT, 'src/lib/assessment/freezeGuard.ts');
const LOCALES = ['en', 'it', 'es'] as const;

console.log('🔒 XIMA Freeze Hash Sealer');
console.log('──────────────────────────');

// 1. Load locale files
const hashes: Record<string, string> = {};
for (const lang of LOCALES) {
  const jsonPath = resolve(ROOT, `src/i18n/locales/${lang}.json`);
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const subtree = getAssessmentSubtree(data);
  if (!subtree) {
    console.error(`❌ FATAL: assessmentSets missing from ${lang}.json`);
    process.exit(1);
  }
  hashes[lang] = computeHash(data);
  console.log(`  ${lang.toUpperCase()}: ${hashes[lang]} (${subtree.length} chars)`);
}

// 2. Read current freezeGuard.ts
let guardSource = readFileSync(GUARD_PATH, 'utf-8');

// 3. Check current state
const alreadySealedPattern = /const ASSESSMENT_FREEZE_HASHES:\s*Record<string,\s*string>\s*=\s*\{([^}]+)\}/;
const nullPattern = /(?:let|const) ASSESSMENT_FREEZE_HASHES:\s*Record<string,\s*string\s*\|\s*null>\s*=\s*\{([^}]+)\}/;

const sealedMatch = guardSource.match(alreadySealedPattern);
const nullMatch = guardSource.match(nullPattern);

if (sealedMatch) {
  // Already sealed — verify
  let allMatch = true;
  for (const lang of LOCALES) {
    const existing = sealedMatch[1].match(new RegExp(`${lang}:\\s*"([^"]+)"`));
    if (!existing) {
      console.error(`❌ FATAL: Could not find ${lang} hash in sealed block`);
      process.exit(1);
    }
    if (existing[1] !== hashes[lang]) {
      console.error(`❌ MISMATCH: ${lang.toUpperCase()} expected ${hashes[lang]}, found ${existing[1]}`);
      allMatch = false;
    }
  }
  if (allMatch) {
    console.log('\n✅ Already sealed and all hashes match. No-op.');
    process.exit(0);
  } else {
    console.error('\n❌ FATAL: Sealed hashes do not match computed values.');
    console.error('   Content may have changed. Bump version or revert.');
    process.exit(1);
  }
} else if (nullMatch) {
  // Not yet sealed — patch
  console.log('\n📝 Patching freezeGuard.ts with computed hashes...');
  
  const replacement = `const ASSESSMENT_FREEZE_HASHES: Record<string, string> = {\n  en: "${hashes.en}",\n  it: "${hashes.it}",\n  es: "${hashes.es}",\n}`;
  
  guardSource = guardSource.replace(nullPattern, replacement);
  writeFileSync(GUARD_PATH, guardSource, 'utf-8');
  
  console.log('✅ freezeGuard.ts sealed successfully.');
} else {
  console.error('❌ FATAL: Could not find ASSESSMENT_FREEZE_HASHES declaration in freezeGuard.ts');
  process.exit(1);
}

console.log('\n🔒 Seal complete.');
