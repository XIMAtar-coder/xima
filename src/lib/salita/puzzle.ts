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
  /** what the solved board shows */
  picture: Picture;
}

/**
 * What each level draws when it is solved. Roberta's note: turning tubes
 * for their own sake means nothing; turning them until a window, a ladder,
 * a house, a spiral appears does. The picture is the meaning, and the
 * solved board is the same for everyone, so the climb stays comparable.
 */
export type Picture = 'window' | 'ladder' | 'house' | 'spiral';

/** The four steps of the climb. The last one is the near-impossible one. */
export const LEVELS: Level[] = [
  { n: 1, size: 3, limit: null, picture: 'window' },
  { n: 2, size: 4, limit: null, picture: 'ladder' },
  { n: 3, size: 5, limit: 90, picture: 'house' },
  { n: 4, size: 7, limit: 60, picture: 'spiral' },
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

type Edge = [Cell, Cell];
type Cell = [number, number];

/** Tiles from a list of edges between neighbouring cells. */
function tilesFromEdges(size: number, edges: Edge[]): Tile[] {
  const tiles: Tile[] = new Array(size * size).fill(0);
  for (const [[r1, c1], [r2, c2]] of edges) {
    const d: Dir | null = r2 === r1 - 1 && c2 === c1 ? 0 : c2 === c1 + 1 && r2 === r1 ? 1 : r2 === r1 + 1 && c2 === c1 ? 2 : c2 === c1 - 1 && r2 === r1 ? 3 : null;
    if (d === null) throw new Error(`not neighbours: ${r1},${c1} → ${r2},${c2}`);
    tiles[r1 * size + c1] |= BITS[d];
    tiles[r2 * size + c2] |= BITS[OPP[d]];
  }
  return tiles;
}

/** A path through consecutive cells, as edges. */
const path = (cells: Cell[]): Edge[] => cells.slice(1).map((c, i) => [cells[i], c] as Edge);

/** The spiral: every cell of the grid visited once, from the outside in. */
function spiralCells(size: number): Cell[] {
  const out: Cell[] = [];
  let top = 0; let left = 0; let bottom = size - 1; let right = size - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c += 1) out.push([top, c]);
    for (let r = top + 1; r <= bottom; r += 1) out.push([r, right]);
    if (top < bottom) for (let c = right - 1; c >= left; c -= 1) out.push([bottom, c]);
    if (left < right) for (let r = bottom - 1; r > top; r -= 1) out.push([r, left]);
    top += 1; left += 1; bottom -= 1; right -= 1;
  }
  return out;
}

/** The solved board of each picture. Sizes match LEVELS. */
export function pictureBoard(picture: Picture): Board {
  switch (picture) {
    case 'window': {
      // 3×3: a frame around an empty middle.
      const ring: Cell[] = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0], [0, 0]];
      return { size: 3, tiles: tilesFromEdges(3, path(ring)) };
    }
    case 'ladder': {
      // 4×4: two uprights and two rungs.
      const edges: Edge[] = [
        ...path([[0, 0], [1, 0], [2, 0], [3, 0]]),
        ...path([[0, 3], [1, 3], [2, 3], [3, 3]]),
        ...path([[1, 0], [1, 1], [1, 2], [1, 3]]),
        ...path([[2, 0], [2, 1], [2, 2], [2, 3]]),
      ];
      return { size: 4, tiles: tilesFromEdges(4, edges) };
    }
    case 'house': {
      // 5×5: walls, a floor, a chimney on the roof and a door post.
      const walls: Cell[] = [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [3, 0], [2, 0], [1, 0]];
      const edges: Edge[] = [...path(walls), [[0, 2], [1, 2]], [[3, 2], [4, 2]]];
      return { size: 5, tiles: tilesFromEdges(5, edges) };
    }
    case 'spiral':
      // 7×7: one long turn from the outside to the centre — 49 tiles to set.
      return { size: 7, tiles: tilesFromEdges(7, path(spiralCells(7))) };
  }
}

/** Every tile given a real turn, so the picture never arrives already made. */
function scramble(solved: Board, seed: number): Board {
  const rnd = mulberry32(seed);
  const tiles = solved.tiles.map((t) => {
    if (t === 0 || t === 0b1111) return t;        // empty and crosses look the same from every side
    const turns = 1 + Math.floor(rnd() * 3);
    const turned = rotate(t, turns);
    return turned === t ? rotate(t, 1) : turned;
  });
  const board = { size: solved.size, tiles };
  if (!isSolved(board)) return board;
  const i = tiles.findIndex((t) => t !== 0 && t !== 0b1111);
  return { size: solved.size, tiles: tiles.map((t, k) => (k === i ? rotate(t, 1) : t)) };
}

/** The level's picture, scrambled by the seed. */
export function generatePicture(picture: Picture, seed: number): { solved: Board; scrambled: Board } {
  const solved = pictureBoard(picture);
  return { solved, scrambled: scramble(solved, seed) };
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
