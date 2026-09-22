/**
 * La Salita — the puzzle behind the Drive trial.
 *
 * A "network" puzzle: every tile carries pipe ends (north, east, south, west)
 * and can be rotated with one tap. The grid is solved when every pipe end
 * meets a pipe end on the neighbouring tile and none points at the border.
 * No words, no reading, one finger — the same for a site worker and a PhD.
 *
 * Levels are generated from a random spanning tree, so every board has at
 * least one solution and the solution is never shown. Difficulty is size:
 * the fourth level is large and timed, built to be failed at the first try.
 * That is the point of the trial — what the person does after failing.
 */

export type Dir = 0 | 1 | 2 | 3; // N E S W
export type Tile = number;        // bitmask: 1=N 2=E 4=S 8=W
export interface Board { size: number; tiles: Tile[] }

export interface Level {
  /** 1..4 */
  n: number;
  size: number;
  /** seconds, or null when untimed */
  limit: number | null;
}

/** The four steps of the climb. The last one is the near-impossible one. */
export const LEVELS: Level[] = [
  { n: 1, size: 3, limit: null },
  { n: 2, size: 4, limit: null },
  { n: 3, size: 5, limit: 90 },
  { n: 4, size: 7, limit: 60 },
];

const BITS: Record<Dir, number> = { 0: 1, 1: 2, 2: 4, 3: 8 };
const OPP: Record<Dir, Dir> = { 0: 2, 1: 3, 2: 0, 3: 1 };
const DELTA: Record<Dir, [number, number]> = { 0: [-1, 0], 1: [0, 1], 2: [1, 0], 3: [0, -1] };

/** Deterministic generator so a board can be reproduced from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rotate a tile clockwise `times` quarter turns. */
export function rotate(tile: Tile, times = 1): Tile {
  let t = tile;
  for (let i = 0; i < ((times % 4) + 4) % 4; i += 1) {
    t = ((t << 1) & 0b1111) | (t >> 3);
  }
  return t;
}

/**
 * A solved board from a random spanning tree (randomised depth-first search),
 * then every tile turned a random number of times. A tile that looks the same
 * from every side (a cross, or empty) cannot be scrambled; the generator makes
 * them rare because the tree has few crossings.
 */
export function generate(size: number, seed: number): { solved: Board; scrambled: Board } {
  const rnd = mulberry32(seed);
  const tiles: Tile[] = new Array(size * size).fill(0);
  const seen: boolean[] = new Array(size * size).fill(false);
  const idx = (r: number, c: number) => r * size + c;
  const stack: [number, number][] = [];
  const startR = Math.floor(rnd() * size);
  const startC = Math.floor(rnd() * size);
  seen[idx(startR, startC)] = true;
  stack.push([startR, startC]);
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const dirs: Dir[] = [0, 1, 2, 3];
    for (let i = dirs.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    let moved = false;
    for (const d of dirs) {
      const nr = r + DELTA[d][0];
      const nc = c + DELTA[d][1];
      if (nr < 0 || nc < 0 || nr >= size || nc >= size || seen[idx(nr, nc)]) continue;
      seen[idx(nr, nc)] = true;
      tiles[idx(r, c)] |= BITS[d];
      tiles[idx(nr, nc)] |= BITS[OPP[d]];
      stack.push([nr, nc]);
      moved = true;
      break;
    }
    if (!moved) stack.pop();
  }
  const solved: Board = { size, tiles };
  const scrambled: Board = {
    size,
    tiles: tiles.map((t) => {
      // Never hand out a board that is already solved: give a symmetric-free
      // tile at least one real turn.
      const turns = 1 + Math.floor(rnd() * 3);
      const turned = rotate(t, turns);
      return turned === t ? rotate(t, 1) : turned;
    }),
  };
  return { solved, scrambled: isSolved(scrambled) ? { size, tiles: scrambled.tiles.map((t, i) => (i === 0 ? rotate(t, 1) : t)) } : scrambled };
}

/** True when every pipe end meets a matching end on its neighbour. */
export function isSolved(board: Board): boolean {
  const { size, tiles } = board;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const t = tiles[r * size + c];
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const has = (t & BITS[d]) !== 0;
        const nr = r + DELTA[d][0];
        const nc = c + DELTA[d][1];
        const inside = nr >= 0 && nc >= 0 && nr < size && nc < size;
        const neighbourHas = inside && (tiles[nr * size + nc] & BITS[OPP[d]]) !== 0;
        if (has !== neighbourHas) return false;
      }
    }
  }
  return true;
}

/** Turn one tile clockwise and return the new board. */
export function tap(board: Board, index: number): Board {
  const tiles = board.tiles.slice();
  tiles[index] = rotate(tiles[index], 1);
  return { size: board.size, tiles };
}

/** How many tiles are already in a position that fits all their neighbours (for gentle feedback). */
export function fittingTiles(board: Board): number {
  const { size, tiles } = board;
  let ok = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const t = tiles[r * size + c];
      let fits = true;
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const has = (t & BITS[d]) !== 0;
        const nr = r + DELTA[d][0];
        const nc = c + DELTA[d][1];
        const inside = nr >= 0 && nc >= 0 && nr < size && nc < size;
        const neighbourHas = inside && (tiles[nr * size + nc] & BITS[OPP[d]]) !== 0;
        if (has !== neighbourHas) { fits = false; break; }
      }
      if (fits) ok += 1;
    }
  }
  return ok;
}
