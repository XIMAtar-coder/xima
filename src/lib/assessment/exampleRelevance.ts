/**
 * Does a per-question example still describe the question's options?
 *
 * Many per-question examples in assessmentSets were written for an earlier
 * version of the questions. The questions were rewritten, the examples were
 * not, so e.g. science_tech q5 asks how you fix a debugging weakness while its
 * example walks through "Option A (Challenging goals)", "Option B (Positive
 * impact)"... — options that do not exist. assessmentSets is hash-locked, so
 * the text cannot be corrected here; instead the UI checks each example against
 * the options it is shown with and, when they disagree, shows the general
 * category illustration, labelled as such.
 *
 * The check is deliberately strict: every one of the four option markers must
 * share a word stem with the option it names. A false "stale" only means the
 * candidate sees the general illustration; a false "fine" shows a description
 * of answers that are not on screen.
 */

// "**Option A (label):**", "**Opzione A:**" and the plain "**A.**" used by the
// rewritten examples in assessmentHelp.
const OPTION_MARKER = /\*\*(?:(?:Option|Opzione|Opción)\s+)?([A-D])(?:[.:)]|\b(?![\p{L}]))([^*]*)\*\*([^\n]*)/giu;
const LETTERS = 'ABCD';

function stems(text: string): Set<string> {
  const words: string[] = Array.from(text.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu), (m) => m[0]);
  return new Set(words.filter((w) => w.length >= 4).map((w) => w.slice(0, 4)));
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const stem of a) if (b.has(stem)) return true;
  return false;
}

export function exampleMatchesOptions(body: string, options: readonly string[] | null | undefined): boolean {
  // Open questions have no options, and an example that does not walk through
  // options cannot contradict them.
  if (!options || options.length < LETTERS.length) return true;

  const markers = [...body.matchAll(OPTION_MARKER)];
  if (markers.length < LETTERS.length) return true;

  const seen = new Set<string>();
  for (const [, letter, inner, rest] of markers) {
    const key = letter.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // "**Option A (Break into parts):** ..." → the label in brackets.
    // "**Opción A:** Segmentar en grupos ..." → the text that follows.
    const label = inner.match(/\(([^)]*)\)/)?.[1] ?? rest.slice(0, 80);
    if (!overlaps(stems(label), stems(options[LETTERS.indexOf(key)] ?? ''))) return false;
  }
  return seen.size === LETTERS.length;
}
