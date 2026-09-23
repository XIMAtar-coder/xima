/**
 * «Separa i colori» — the sorting puzzle, with textures so it works without
 * colour at all.
 *
 * Each container holds at most `CAPACITY` layers. A pour moves the top layer,
 * and only onto an empty container or onto the same kind with room left. It is
 * solved when every kind is together in one container.
 *
 * The lesson is in the empty container: the free space is a resource. It has
 * to be used and then made again somewhere else — filling it and leaving it
 * full is how the board locks up.
 */

export type Layer = 'a' | 'b' | 'c';
export type Tube = Layer[];      // bottom first
export type State = Tube[];

export const CAPACITY = 4;
export const LAYERS: Layer[] = ['a', 'b', 'c'];

export const top = (tube: Tube): Layer | undefined => tube[tube.length - 1];

export function canPour(state: State, from: number, to: number): boolean {
  if (from === to) return false;
  const src = state[from]; const dst = state[to];
  if (src.length === 0) return false;
  if (dst.length >= CAPACITY) return false;
  return dst.length === 0 || top(dst) === top(src);
}

export function pour(state: State, from: number, to: number): State | null {
  if (!canPour(state, from, to)) return null;
  const next = state.map((t) => [...t]);
  next[to].push(next[from].pop()!);
  return next;
}

/** Solved when every kind is all in one container and no container is mixed. */
export function isSolved(state: State): boolean {
  if (!state.every((t) => t.every((l) => l === t[0]))) return false;
  for (const kind of LAYERS) {
    const holders = state.filter((t) => t.includes(kind));
    if (holders.length > 1) return false;
  }
  return true;
}

/** True when nothing can be poured anywhere: a dead end, not a mistake. */
export const isStuck = (state: State): boolean =>
  !isSolved(state) && !state.some((_, i) => state.some((__, j) => canPour(state, i, j)));

const key = (s: State) => s.map((t) => t.join('')).join('|');

/** Fewest pours to sort it, or null. Used by the tests to keep the board fair. */
export function shortestSolution(state: State, limit = 30): number | null {
  if (isSolved(state)) return 0;
  const seen = new Set([key(state)]);
  let frontier = [state];
  for (let depth = 1; depth <= limit; depth += 1) {
    const next: State[] = [];
    for (const s of frontier) {
      for (let i = 0; i < s.length; i += 1) {
        for (let j = 0; j < s.length; j += 1) {
          const n = pour(s, i, j);
          if (!n) continue;
          const k = key(n);
          if (seen.has(k)) continue;
          seen.add(k);
          if (isSolved(n)) return depth;
          next.push(n);
        }
      }
    }
    if (next.length === 0) return null;
    frontier = next;
  }
  return null;
}

/** The easy round: two kinds, one free container, three pours. */
export const EASY: State = [
  ['a', 'b'],
  ['b', 'a'],
  [],
];

/**
 * The hard round: three kinds interleaved so that every compatible layer is
 * buried. The free container has to be used and then freed again.
 */
export const HARD: State = [
  ['a', 'c', 'b', 'a'],
  ['b', 'c', 'a', 'b'],
  ['c', 'b', 'a', 'c'],
  [],
];
