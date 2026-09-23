/**
 * «Trova l'impossibile» — one light, four solids, one shadow that cannot be.
 *
 * Seen from above on a 0–100 square. Every shadow is built from the same
 * geometry: it lies along the line from the light through the object, and its
 * length grows with the distance from the light. One of them is turned, so it
 * still falls on the side away from the light — «it is on the right side» is
 * no longer enough, you have to check the light–object–shadow line.
 */

export type SolidKind = 'cube' | 'cylinder' | 'prism' | 'sphere';
export interface Solid { id: string; kind: SolidKind; x: number; y: number; r: number }
export interface Scene {
  /** Where the light stands, seen from above. */
  light: { x: number; y: number };
  solids: Solid[];
  /** The one whose shadow is turned, and by how much (degrees, clockwise). */
  wrong: string;
  turn: number;
}

/** The direction a shadow should point: straight away from the light. */
export function shadowAngle(scene: Scene, solid: Solid): number {
  const base = Math.atan2(solid.y - scene.light.y, solid.x - scene.light.x);
  const turned = solid.id === scene.wrong ? base + (scene.turn * Math.PI) / 180 : base;
  return turned;
}

/** How long the shadow is: the further from the light, the longer. */
export function shadowLength(scene: Scene, solid: Solid): number {
  const d = Math.hypot(solid.x - scene.light.x, solid.y - scene.light.y);
  return solid.r * 1.6 + d * 0.32;
}

/** The far end of the shadow, for drawing and for tapping. */
export function shadowTip(scene: Scene, solid: Solid): { x: number; y: number } {
  const a = shadowAngle(scene, solid);
  const len = shadowLength(scene, solid);
  return { x: solid.x + Math.cos(a) * len, y: solid.y + Math.sin(a) * len };
}

/** Tapping the solid or its shadow is the same answer. */
export function hitTest(scene: Scene, point: { x: number; y: number }): string | null {
  for (const s of scene.solids) {
    if (Math.hypot(point.x - s.x, point.y - s.y) <= s.r * 1.7) return s.id;
    const tip = shadowTip(scene, s);
    // distance from the point to the segment centre→tip
    const dx = tip.x - s.x; const dy = tip.y - s.y;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((point.x - s.x) * dx + (point.y - s.y) * dy) / len2));
    const px = s.x + dx * t; const py = s.y + dy * t;
    if (Math.hypot(point.x - px, point.y - py) <= s.r) return s.id;
  }
  return null;
}

/**
 * The easy scene: the shadow of the sphere points at the light instead of away
 * from it. Anyone sees it; it is there to teach what is being asked.
 */
export const EASY_SCENE: Scene = {
  light: { x: 18, y: 14 },
  solids: [
    { id: 'cube', kind: 'cube', x: 32, y: 60, r: 7 },
    { id: 'cylinder', kind: 'cylinder', x: 66, y: 40, r: 7 },
    { id: 'sphere', kind: 'sphere', x: 70, y: 76, r: 7 },
  ],
  wrong: 'sphere',
  turn: 180,
};

/**
 * The hard scene: the cylinder's shadow is turned by 45°. It still falls away
 * from the light, so only the light–object–shadow line gives it away.
 */
export const HARD_SCENE: Scene = {
  light: { x: 85, y: 15 },
  solids: [
    { id: 'cube', kind: 'cube', x: 25, y: 25, r: 7 },
    { id: 'cylinder', kind: 'cylinder', x: 58, y: 36, r: 7 },
    { id: 'prism', kind: 'prism', x: 30, y: 66, r: 7 },
    { id: 'sphere', kind: 'sphere', x: 64, y: 70, r: 7 },
  ],
  wrong: 'cylinder',
  turn: 45,
};
