/**
 * «Quanti triangoli» — the figure, the count, and the way the count is shown.
 *
 * A triangle with its base cut into `base` equal parts, rays from the apex to
 * every cut, and `bands` horizontal lines parallel to the base. Every triangle
 * in the picture has the apex as its vertex and its base on one of the levels,
 * so the total is (bands + 1) × base(base + 1) / 2 and nothing is upside down.
 *
 * Codex asked for thirty (base 4, two bands): on a phone, counting thirty
 * figures with a finger is a test of patience, not of method. Eighteen (base 3,
 * two bands) keeps exactly the same lesson — count by category, never twice —
 * and stays legible at 360 px.
 */

export interface Figure {
  /** How many equal parts the base is cut into. */
  base: number;
  /** Horizontal lines between the apex and the base. */
  bands: number;
}

export const EASY_FIGURE: Figure = { base: 2, bands: 0 };   // 3
export const HARD_FIGURE: Figure = { base: 3, bands: 2 };   // 18

/** Triangles of every width on one level: base·(base+1)/2. */
export const perLevel = (f: Figure): number => (f.base * (f.base + 1)) / 2;

export const countTriangles = (f: Figure): number => (f.bands + 1) * perLevel(f);

export interface Category { width: number; level: number; count: number }

/**
 * The explanation, in the order it is shown: for each level, the triangles one
 * part wide, then two, then three. Sub-totals are what make the count
 * checkable — the point of the whole game.
 */
export function categories(f: Figure): Category[] {
  const out: Category[] = [];
  for (let level = 1; level <= f.bands + 1; level += 1) {
    for (let width = 1; width <= f.base; width += 1) out.push({ width, level, count: f.base - width + 1 });
  }
  return out;
}

/** The four answers: the right one and three plausible misses, always in order. */
export function options(f: Figure): number[] {
  const right = countTriangles(f);
  if (right === 3) return [2, 3, 4, 5];
  // Missing the composed ones, missing a level, right, counting some twice.
  return [perLevel(f) * f.bands, right - perLevel(f) + 1, right, right + f.base].sort((a, b) => a - b);
}

/**
 * Where the lines run, in a 0–100 box: apex at the top middle, base at the
 * bottom. Used by the drawing and by the explanation, so the outlines the
 * explanation highlights are the same ones the person was looking at.
 */
export interface Geometry { apex: [number, number]; base: [number, number][]; bands: [number, number][][] }

export function geometry(f: Figure, w = 100, h = 86): Geometry {
  const apex: [number, number] = [w / 2, 0];
  const base: [number, number][] = Array.from({ length: f.base + 1 }, (_, i) => [(w / f.base) * i, h]);
  const bands: [number, number][][] = [];
  for (let b = 1; b <= f.bands; b += 1) {
    const t = b / (f.bands + 1);                       // how far down from the apex
    const y = h * t;
    const left: [number, number] = [apex[0] + (base[0][0] - apex[0]) * t, y];
    const right: [number, number] = [apex[0] + (base[f.base][0] - apex[0]) * t, y];
    bands.push([left, right]);
  }
  return { apex, base, bands };
}

/** The outline of one triangle: apex, and a slice of the level it sits on. */
export function outline(f: Figure, cat: { width: number; level: number }, from: number, g = geometry(f)): string {
  const t = cat.level / (f.bands + 1);
  const y = g.base[0][1] * t;
  const x = (i: number) => g.apex[0] + (g.base[i][0] - g.apex[0]) * t;
  return `M${g.apex[0]} ${g.apex[1]} L${x(from)} ${y} L${x(from + cat.width)} ${y} Z`;
}
