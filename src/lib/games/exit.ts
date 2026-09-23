/**
 * «Libera l'uscita» — the parking-jam board.
 *
 * A 6×6 grid. Every tile slides only along its own axis and never overlaps
 * another; a slide of any length counts as one move. The blue tile leaves
 * through the gap on the right of its row.
 *
 * Codex's hard board needed eleven moves: that is a table puzzle, not a pause
 * inside a questionnaire. The board here is built around **one dependency to
 * undo** — you cannot free the exit until you have first made room elsewhere —
 * and the solver in the tests keeps it between six and eight moves.
 */

export type Axis = 'h' | 'v';
export interface Tile { id: string; axis: Axis; len: number; row: number; col: number }
export interface Board { size: number; exitRow: number; tiles: Tile[] }

export const SIZE = 6;

/** The cells a tile stands on. */
export function cells(t: Tile): { row: number; col: number }[] {
  return Array.from({ length: t.len }, (_, i) => (t.axis === 'h' ? { row: t.row, col: t.col + i } : { row: t.row + i, col: t.col }));
}

export function occupied(board: Board, except?: string): boolean[][] {
  const grid = Array.from({ length: board.size }, () => Array(board.size).fill(false));
  for (const t of board.tiles) {
    if (t.id === except) continue;
    for (const c of cells(t)) grid[c.row][c.col] = true;
  }
  return grid;
}

/** How far a tile can slide each way, in cells. */
export function freeRange(board: Board, id: string): { back: number; fwd: number } {
  const t = board.tiles.find((x) => x.id === id)!;
  const grid = occupied(board, id);
  let back = 0; let fwd = 0;
  if (t.axis === 'h') {
    while (t.col - back - 1 >= 0 && !grid[t.row][t.col - back - 1]) back += 1;
    while (t.col + t.len + fwd < board.size && !grid[t.row][t.col + t.len + fwd]) fwd += 1;
  } else {
    while (t.row - back - 1 >= 0 && !grid[t.row - back - 1][t.col]) back += 1;
    while (t.row + t.len + fwd < board.size && !grid[t.row + t.len + fwd][t.col]) fwd += 1;
  }
  return { back, fwd };
}

/** A slide of `delta` cells (negative = back). Returns null when it is not allowed. */
export function move(board: Board, id: string, delta: number): Board | null {
  if (delta === 0) return null;
  const { back, fwd } = freeRange(board, id);
  if (delta < 0 ? -delta > back : delta > fwd) return null;
  return {
    ...board,
    tiles: board.tiles.map((t) => (t.id !== id ? t : t.axis === 'h' ? { ...t, col: t.col + delta } : { ...t, row: t.row + delta })),
  };
}

/** The blue tile is out when its right edge has reached the border. */
export function isSolved(board: Board): boolean {
  const x = board.tiles.find((t) => t.id === 'X')!;
  return x.col + x.len >= board.size && freeRange(board, 'X').fwd === 0 && x.row === board.exitRow;
}

/** True when the blue tile has a clear run to the border. */
export function canExit(board: Board): boolean {
  const x = board.tiles.find((t) => t.id === 'X')!;
  return x.col + x.len + freeRange(board, 'X').fwd >= board.size;
}

const key = (b: Board) => b.tiles.map((t) => `${t.id}${t.row},${t.col}`).join('|');

/** Shortest number of slides to get the blue tile out, or null if it cannot. */
export function shortestSolution(board: Board, limit = 20): string[] | null {
  const seen = new Set([key(board)]);
  let frontier: { board: Board; path: string[] }[] = [{ board, path: [] }];
  for (let depth = 0; depth < limit; depth += 1) {
    const next: typeof frontier = [];
    for (const { board: b, path } of frontier) {
      for (const t of b.tiles) {
        const { back, fwd } = freeRange(b, t.id);
        for (let d = -back; d <= fwd; d += 1) {
          if (d === 0) continue;
          const nb = move(b, t.id, d);
          if (!nb) continue;
          const k = key(nb);
          if (seen.has(k)) continue;
          seen.add(k);
          const p = [...path, `${t.id}${d > 0 ? '+' : ''}${d}`];
          if (canExit(nb)) return p;
          next.push({ board: nb, path: p });
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return null;
}

/**
 * The easy round: one tile in the way, two moves. It teaches the gesture and
 * shows the relation between the obstacle and the gap.
 */
export const EASY: Board = {
  size: SIZE,
  exitRow: 2,
  tiles: [
    { id: 'X', axis: 'h', len: 2, row: 2, col: 0 },
    { id: 'A', axis: 'v', len: 3, row: 0, col: 3 },
  ],
};

/**
 * The hard round, six slides before the blue tile has a clear run — and the
 * sixth is only reachable by **putting a tile back where it was**: D drops to
 * let X through, then has to climb again so that B can move. Dragging the blue
 * tile over and over never gets there, which is the whole point.
 *
 *     · · · · · E
 *     · · C C · E
 *     X X D · · E
 *     · · D · · ·
 *     · F D B B B
 *     · F · · · ·
 */
export const HARD: Board = {
  size: SIZE,
  exitRow: 2,
  tiles: [
    { id: 'X', axis: 'h', len: 2, row: 2, col: 0 },
    { id: 'B', axis: 'h', len: 3, row: 4, col: 3 },
    { id: 'C', axis: 'h', len: 2, row: 1, col: 2 },
    { id: 'D', axis: 'v', len: 3, row: 2, col: 2 },
    { id: 'E', axis: 'v', len: 3, row: 0, col: 5 },
    { id: 'F', axis: 'v', len: 2, row: 4, col: 1 },
  ],
};
