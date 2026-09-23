import { describe, expect, it } from 'vitest';
import { LEVELS, generatePicture, isSolved, pictureBoard, fittingTiles } from '../puzzle';

describe('La Salita — the pictures', () => {
  it('draws a consistent board for every level, sized like the level', () => {
    for (const level of LEVELS) {
      const board = pictureBoard(level.picture);
      expect(board.size).toBe(level.size);
      expect(isSolved(board)).toBe(true);
      expect(fittingTiles(board)).toBe(level.size * level.size);
    }
  });

  it('never hands out the picture already made, whatever the seed', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const { solved, scrambled } = generatePicture(level.picture, seed * 104729);
        expect(isSolved(solved)).toBe(true);
        expect(isSolved(scrambled)).toBe(false);
        // Turning never adds or removes pipe ends: the picture is intact underneath.
        const ends = (t: number) => [1, 2, 4, 8].filter((b) => (t & b) !== 0).length;
        expect(scrambled.tiles.map(ends)).toEqual(solved.tiles.map(ends));
      }
    }
  });

  it('keeps the climb steep: the spiral sets every one of the 49 tiles', () => {
    const spiral = pictureBoard('spiral');
    expect(spiral.tiles.every((t) => t !== 0)).toBe(true);
    // and the window leaves its middle empty
    expect(pictureBoard('window').tiles[4]).toBe(0);
  });

  it('is the same picture for everyone: the seed only turns the tiles', () => {
    const a = generatePicture('house', 1).solved;
    const b = generatePicture('house', 2).solved;
    expect(a.tiles).toEqual(b.tiles);
  });
});
