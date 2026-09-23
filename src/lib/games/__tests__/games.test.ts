import { describe, expect, it } from 'vitest';
import {
  pickPair, readDrive, emptyRun, OBSERVATION_GAMES, MANIPULATION_GAMES, GAME_AFTER_SCENARIO,
  IDLE_SECONDS, MAX_ACTIVE_SECONDS, type GameRun,
} from '../model';
import { EASY, HARD, shortestSolution, freeRange, move, canExit, cells, type Board } from '../exit';
import { EASY_FIGURE, HARD_FIGURE, countTriangles, categories, options, perLevel } from '../triangles';
import { EASY_SCENE, HARD_SCENE, hitTest, shadowAngle, shadowTip } from '../shadow';
import {
  CAPACITY, EASY as POUR_EASY, HARD as POUR_HARD, canPour, isSolved as pourSolved, isStuck,
  pour, shortestSolution as pourSolution, LAYERS,
} from '../pour';

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


describe('games — trova l\'impossibile', () => {
  it('turns exactly one shadow, and the easy one is the obvious kind', () => {
    expect(EASY_SCENE.turn).toBe(180);
    expect(HARD_SCENE.turn).toBe(45);
    expect(HARD_SCENE.solids.filter((s) => s.id === HARD_SCENE.wrong)).toHaveLength(1);
  });

  it('keeps the wrong shadow on the side away from the light, so «right side» is not enough', () => {
    const cyl = HARD_SCENE.solids.find((s) => s.id === HARD_SCENE.wrong)!;
    const away = Math.atan2(cyl.y - HARD_SCENE.light.y, cyl.x - HARD_SCENE.light.x);
    const shown = shadowAngle(HARD_SCENE, cyl);
    const diff = Math.abs(((shown - away + Math.PI) % (2 * Math.PI)) - Math.PI);
    expect(diff).toBeGreaterThan(0.5);      // clearly turned
    expect(diff).toBeLessThan(Math.PI / 2); // but still pointing away
    const tip = shadowTip(HARD_SCENE, cyl);
    expect(Math.hypot(tip.x - HARD_SCENE.light.x, tip.y - HARD_SCENE.light.y))
      .toBeGreaterThan(Math.hypot(cyl.x - HARD_SCENE.light.x, cyl.y - HARD_SCENE.light.y));
  });

  it('answers the same whether the solid or its shadow is tapped', () => {
    const cyl = HARD_SCENE.solids.find((s) => s.id === 'cylinder')!;
    expect(hitTest(HARD_SCENE, { x: cyl.x, y: cyl.y })).toBe('cylinder');
    const tip = shadowTip(HARD_SCENE, cyl);
    expect(hitTest(HARD_SCENE, { x: (cyl.x + tip.x) / 2, y: (cyl.y + tip.y) / 2 })).toBe('cylinder');
    expect(hitTest(HARD_SCENE, { x: 2, y: 98 })).toBeNull();
  });
});

describe('games — separa i colori', () => {
  it('pours one layer, onto an empty container or onto its own kind', () => {
    expect(canPour(POUR_HARD, 0, 3)).toBe(true);    // onto the empty one
    expect(canPour(POUR_HARD, 0, 1)).toBe(false);   // a on b
    expect(canPour(POUR_HARD, 3, 0)).toBe(false);   // nothing to pour
    const next = pour(POUR_HARD, 0, 3)!;
    expect(next[3]).toEqual(['a']);
    expect(next[0]).toHaveLength(3);
  });

  it('is solvable, and the hard board asks for the free container twice over', () => {
    expect(pourSolution(POUR_EASY)).toBe(3);
    expect(pourSolution(POUR_HARD, 20)).toBe(16);
  });

  it('is solved when every kind is together, whatever the capacity', () => {
    expect(pourSolved([['a', 'a'], ['b', 'b'], []])).toBe(true);
    expect(pourSolved([['a', 'a'], ['b'], ['b']])).toBe(false);
    expect(pourSolved(POUR_HARD)).toBe(false);
  });

  it('knows a dead end from a mistake', () => {
    expect(isStuck(POUR_HARD)).toBe(false);
    const jammed = [['a', 'b', 'a', 'b'], ['b', 'a', 'b', 'a'], ['c', 'a', 'c', 'a'], ['c', 'b', 'c', 'b']];
    expect(isStuck(jammed)).toBe(true);
  });

  it('has four layers of each kind and four places to put them', () => {
    const all = POUR_HARD.flat();
    for (const l of LAYERS) expect(all.filter((x) => x === l)).toHaveLength(CAPACITY);
    expect(POUR_HARD).toHaveLength(4);
  });
});
