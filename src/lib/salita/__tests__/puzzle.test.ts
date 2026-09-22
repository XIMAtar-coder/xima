import { describe, expect, it } from 'vitest';
import { generate, isSolved, rotate, tap, fittingTiles, LEVELS } from '../puzzle';

describe('La Salita — puzzle engine', () => {
  it('rotates pipe ends clockwise and comes back after four turns', () => {
    expect(rotate(0b0001)).toBe(0b0010); // N → E
    expect(rotate(0b1000)).toBe(0b0001); // W → N
    expect(rotate(0b0101, 4)).toBe(0b0101);
  });

  it('generates a solvable board whose solution is solved and whose scramble is not', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 25; seed += 1) {
        const { solved, scrambled } = generate(level.size, seed * 7919 + level.n);
        expect(isSolved(solved)).toBe(true);
        expect(isSolved(scrambled)).toBe(false);
        expect(scrambled.tiles.length).toBe(level.size * level.size);
      }
    }
  });

  it('is deterministic for a seed, so a board can be reproduced', () => {
    const a = generate(5, 42);
    const b = generate(5, 42);
    expect(a.scrambled.tiles).toEqual(b.scrambled.tiles);
  });

  it('can be solved by turning each tile back to its solved orientation', () => {
    const { solved, scrambled } = generate(4, 3);
    let board = scrambled;
    for (let i = 0; i < board.tiles.length; i += 1) {
      let guard = 0;
      while (board.tiles[i] !== solved.tiles[i] && guard < 4) { board = tap(board, i); guard += 1; }
    }
    expect(isSolved(board)).toBe(true);
    expect(fittingTiles(board)).toBe(16);
  });

  it('keeps the fourth level large and timed: the one built to be failed first', () => {
    const last = LEVELS[LEVELS.length - 1];
    expect(last.size).toBeGreaterThanOrEqual(7);
    expect(last.limit).not.toBeNull();
  });
});
