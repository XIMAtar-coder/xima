import { describe, expect, it } from 'vitest';
import {
  pickPair, readDrive, emptyRun, OBSERVATION_GAMES, MANIPULATION_GAMES, GAME_AFTER_SCENARIO,
  IDLE_SECONDS, MAX_ACTIVE_SECONDS, type GameRun,
} from '../model';
import { EASY, HARD, shortestSolution, freeRange, move, canExit, cells, type Board } from '../exit';
import { EASY_FIGURE, HARD_FIGURE, countTriangles, categories, options, perLevel } from '../triangles';

const noOverlap = (b: Board) => {
  const grid: (string | null)[][] = Array.from({ length: b.size }, () => Array(b.size).fill(null));
  for (const t of b.tiles) {
    for (const c of cells(t)) {
      if (c.row >= b.size || c.col >= b.size) return `${t.id} fuori`;
      if (grid[c.row][c.col]) return `${t.id} su ${grid[c.row][c.col]}`;
      grid[c.row][c.col] = t.id;
    }
  }
  return null;
};

describe('games — pairing', () => {
  it('always shows one game to look at and one to handle, in either order', () => {
    let rnd = 0;
    const seq = [0.1, 0.9, 0.1, 0.9, 0.1, 0.9];
    const next = () => seq[rnd++ % seq.length];
    for (let i = 0; i < 20; i += 1) {
      const { first, second } = pickPair(next);
      const kinds = [first, second].map((g) => ((OBSERVATION_GAMES as readonly string[]).includes(g) ? 'look' : 'hands'));
      expect(new Set(kinds).size).toBe(2);
    }
  });

  it('can produce all eight arrangements', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i += 1) {
      const p = pickPair();
      seen.add(`${p.first}>${p.second}`);
    }
    expect(seen.size).toBe(OBSERVATION_GAMES.length * MANIPULATION_GAMES.length * 2);
  });

  it('sits after the 7th and the 14th scenario, and opens the choice on stillness, not on a stopwatch', () => {
    expect(GAME_AFTER_SCENARIO).toEqual([7, 14]);
    expect(IDLE_SECONDS).toBeLessThan(MAX_ACTIVE_SECONDS);
  });
});

describe('games — reading Drive', () => {
  const run = (over: Partial<GameRun>): GameRun => ({ ...emptyRun('exit', 1), ...over });

  it('never turns «solved straight away» into a zero', () => {
    const r = readDrive([
      run({ observation: 'solved_without_choice', outcome: 'solved_before_help' }),
      run({ game: 'triangles', position: 2, observation: 'solved_without_choice', outcome: 'solved_before_help' }),
    ]);
    expect(r.occasions).toBe(0);
    expect(r.notObserved).toBe(2);
    expect(r.firstChoices).toEqual([]);
  });

  it('keeps the first choice of each game that met the obstacle', () => {
    const r = readDrive([
      run({
        observation: 'choice_met',
        episodes: [
          { n: 1, openedBy: 'invalid', seconds: 30, choice: 'retry' },
          { n: 2, openedBy: 'idle', seconds: 20, choice: 'explain' },
        ],
        helpAsked: true, helpFinished: true, resumedAfterHelp: true, outcome: 'solved_after_help',
      }),
      run({ game: 'pour', position: 2, observation: 'choice_met', episodes: [{ n: 1, openedBy: 'stuck', seconds: 40, choice: 'skip' }], outcome: 'moved_on' }),
    ]);
    expect(r.occasions).toBe(2);
    expect(r.firstChoices).toEqual(['retry', 'skip']);
    expect(r.retries).toBe(1);
    expect(r.helpAsked).toBe(1);
    expect(r.resumed).toBe(1);
    expect(r.hardSeconds).toBe(90);
  });

  it('counts a skipped game as missing, not as giving up', () => {
    const r = readDrive([run({ observation: 'left_before_choice', outcome: 'skipped' })]);
    expect(r.occasions).toBe(0);
    expect(r.notObserved).toBe(0);
  });
});

describe('games — libera l\'uscita', () => {
  it('has valid boards', () => {
    expect(noOverlap(EASY)).toBeNull();
    expect(noOverlap(HARD)).toBeNull();
  });

  it('teaches the gesture in one slide, then asks for six', () => {
    expect(shortestSolution(EASY)).toHaveLength(1);
    const hard = shortestSolution(HARD);
    expect(hard).not.toBeNull();
    expect(hard!.length).toBeGreaterThanOrEqual(6);
    expect(hard!.length).toBeLessThanOrEqual(8);
  });

  it('cannot be solved by dragging the blue tile alone', () => {
    let b: Board | null = HARD;
    expect(canExit(b)).toBe(false);
    let guard = 0;
    while (b && guard < 10) {
      const next: Board | null = move(b, 'X', freeRange(b, 'X').fwd || 1);
      if (!next) break;
      b = next;
      expect(canExit(b)).toBe(false);
      guard += 1;
    }
  });

  it('asks a tile to go back where it was: the point of the board', () => {
    const path = shortestSolution(HARD)!;
    const moved = path.map((m) => m[0]);
    const twice = moved.filter((id, i) => moved.indexOf(id) !== i);
    expect(twice.length).toBeGreaterThan(0);
  });

  it('refuses a slide through an occupied cell', () => {
    expect(move(HARD, 'X', 5)).toBeNull();
    expect(move(HARD, 'D', -1)).toBeNull();   // C is right above D
  });
});

describe('games — quanti triangoli', () => {
  it('counts eighteen on the hard figure and three on the easy one', () => {
    expect(countTriangles(EASY_FIGURE)).toBe(3);
    expect(countTriangles(HARD_FIGURE)).toBe(18);
    expect(perLevel(HARD_FIGURE)).toBe(6);
  });

  it('explains it as categories that add up, with no figure counted twice', () => {
    const cats = categories(HARD_FIGURE);
    expect(cats).toHaveLength((HARD_FIGURE.bands + 1) * HARD_FIGURE.base);
    expect(cats.reduce((n, c) => n + c.count, 0)).toBe(18);
    // On every level: three one wide, two of two, one of three.
    expect(cats.filter((c) => c.level === 1).map((c) => c.count)).toEqual([3, 2, 1]);
  });

  it('offers four answers, the right one among plausible misses', () => {
    const o = options(HARD_FIGURE);
    expect(o).toHaveLength(4);
    expect(o).toContain(18);
    expect(new Set(o).size).toBe(4);
    expect([...o].sort((a, b) => a - b)).toEqual(o);
  });
});
