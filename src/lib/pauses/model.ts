/**
 * «Pause»: four work-sample breaks inside the 2.0 questionnaire.
 *
 * After the 5th, 10th, 15th and 20th scenario the questionnaire stops and the
 * person does something real from their own line of work with one finger:
 * load the van, leave a message for the next shift, pick the right product
 * from the label, lay out a space. One break per content pillar. They are
 * framed as a pause — no timer, no grade, always skippable — and what is
 * recorded are facts (needed items on board, necessary lines sent, right
 * product on the right job, distinct valid layouts), never a judgement.
 *
 * The structure below (quantities, sizes, grid, constraints) is the same for
 * every field so that the six fields stay comparable; only the words and the
 * objects change, and those live in the locale files under `pauses.fields`.
 * La Salita is not here: it stays the same for every field.
 */

import type { ContentPillar } from '@/lib/assessment/v2/model';

export type PauseKind = 'van' | 'handover' | 'stock' | 'yard';

/** Which pause follows which scenario, and which pillar it looks at. */
export const PAUSES: readonly { kind: PauseKind; after: number; pillar: ContentPillar }[] = [
  { kind: 'van', after: 5, pillar: 'computational_power' },
  { kind: 'handover', after: 10, pillar: 'communication' },
  { kind: 'stock', after: 15, pillar: 'knowledge' },
  { kind: 'yard', after: 20, pillar: 'creativity' },
];

export const pauseAfter = (q: number): PauseKind | null => PAUSES.find((p) => p.after === q)?.kind ?? null;

// ---------------------------------------------------------------------------
// 1 · The van (calculation): load what the note says, and only that; it all
// has to fit.
// ---------------------------------------------------------------------------

export interface VanItem { id: string; size: number; needed: number; available: number }

export const VAN: { capacity: number; items: VanItem[] } = {
  // 22 cells: everything needed takes 21, so one superfluous piece already
  // pushes the last needed one out.
  capacity: 22,
  items: [
    { id: 'adhesive', size: 1, needed: 4, available: 6 },
    { id: 'tiles', size: 4, needed: 1, available: 1 },
    { id: 'boards', size: 3, needed: 2, available: 3 },
    { id: 'mixer', size: 4, needed: 1, available: 1 },
    { id: 'ladder', size: 3, needed: 1, available: 1 },
    { id: 'buckets', size: 2, needed: 0, available: 2 },
    { id: 'trestle', size: 3, needed: 0, available: 1 },
  ],
};

export interface VanResult {
  kind: 'van';
  /** needed units on board / needed units in total */
  needed: number;
  neededTotal: number;
  /** units on board that were not on the note (extras or beyond the quantity) */
  superfluous: number;
  complete: boolean;
  unloads: number;
  loaded: Record<string, number>;
}

export const vanUsed = (loaded: Record<string, number>): number =>
  VAN.items.reduce((n, it) => n + (loaded[it.id] ?? 0) * it.size, 0);

export const vanCanLoad = (loaded: Record<string, number>, id: string): boolean => {
  const it = VAN.items.find((x) => x.id === id);
  if (!it) return false;
  if ((loaded[id] ?? 0) >= it.available) return false;
  return vanUsed(loaded) + it.size <= VAN.capacity;
};

export function evaluateVan(loaded: Record<string, number>, unloads: number): VanResult {
  let needed = 0; let neededTotal = 0; let superfluous = 0;
  for (const it of VAN.items) {
    const n = loaded[it.id] ?? 0;
    neededTotal += it.needed;
    needed += Math.min(n, it.needed);
    superfluous += Math.max(0, n - it.needed);
  }
  return { kind: 'van', needed, neededTotal, superfluous, complete: needed === neededTotal, unloads, loaded };
}

// ---------------------------------------------------------------------------
// 2 · The handover (communication): three lines for the person who comes in
// tomorrow, who already knows some things.
// ---------------------------------------------------------------------------

export type PieceRole = 'necessary' | 'known' | 'filler';
export interface HandoverPiece { id: string; role: PieceRole }

export const HANDOVER: { slots: number; pieces: HandoverPiece[] } = {
  slots: 3,
  pieces: [
    { id: 'client', role: 'necessary' },
    { id: 'floor', role: 'necessary' },
    { id: 'material', role: 'necessary' },
    { id: 'boss', role: 'known' },
    { id: 'key', role: 'known' },
    { id: 'goodluck', role: 'filler' },
    { id: 'bye', role: 'filler' },
  ],
};

export interface HandoverResult {
  kind: 'handover';
  necessary: number;      // necessary pieces sent
  necessaryTotal: number;
  redundant: number;      // pieces the receiver already knew
  filler: number;
  linesUsed: number;
  lines: string[];
}

export function evaluateHandover(lines: string[]): HandoverResult {
  const role = (id: string) => HANDOVER.pieces.find((p) => p.id === id)?.role;
  const necessary = lines.filter((l) => role(l) === 'necessary').length;
  const redundant = lines.filter((l) => role(l) === 'known').length;
  const filler = lines.filter((l) => role(l) === 'filler').length;
  return {
    kind: 'handover', necessary, necessaryTotal: HANDOVER.pieces.filter((p) => p.role === 'necessary').length,
    redundant, filler, linesUsed: lines.length, lines,
  };
}

// ---------------------------------------------------------------------------
// 3 · The stock (knowledge): the right product, in the quantity the label
// says. Everything needed is on the label.
// ---------------------------------------------------------------------------

export interface StockJob { id: string; area: number; product: string }
export interface StockProduct { id: string; yieldPerUnit: number; available: number }

export const STOCK: { jobs: StockJob[]; products: StockProduct[] } = {
  jobs: [
    { id: 'job1', area: 8, product: 'p1' },    // 2 units
    { id: 'job2', area: 6, product: 'p2' },    // 2 units
    { id: 'job3', area: 10, product: 'p3' },   // 2 units
  ],
  products: [
    { id: 'p1', yieldPerUnit: 4, available: 4 },
    { id: 'p2', yieldPerUnit: 3, available: 4 },
    { id: 'p3', yieldPerUnit: 5, available: 4 },
    { id: 'p4', yieldPerUnit: 6, available: 4 },   // the look-alike that fits no job
  ],
};

export const unitsNeeded = (job: StockJob): number => {
  const p = STOCK.products.find((x) => x.id === job.product)!;
  return Math.ceil(job.area / p.yieldPerUnit);
};

export type StockAssignment = Record<string, Record<string, number>>; // job → product → units

export interface StockResult {
  kind: 'stock';
  productRight: number;   // jobs with the right product (and nothing else)
  quantityRight: number;  // jobs with the right product in the right quantity
  jobsTotal: number;
  labelsOpened: number;
  assignment: StockAssignment;
}

export function evaluateStock(assignment: StockAssignment, labelsOpened: number): StockResult {
  let productRight = 0; let quantityRight = 0;
  for (const job of STOCK.jobs) {
    const a = assignment[job.id] ?? {};
    const others = Object.entries(a).some(([pid, n]) => pid !== job.product && n > 0);
    const n = a[job.product] ?? 0;
    if (n > 0 && !others) {
      productRight += 1;
      if (n === unitsNeeded(job)) quantityRight += 1;
    }
  }
  return { kind: 'stock', productRight, quantityRight, jobsTotal: STOCK.jobs.length, labelsOpened, assignment };
}

// ---------------------------------------------------------------------------
// 4 · The yard (creativity): lay out the modules so that the space works;
// more than one layout does. Then a new need arrives.
// ---------------------------------------------------------------------------

export const YARD_COLS = 8;
export const YARD_ROWS = 10;

export type Cell = { r: number; c: number };
export interface Rect { r: number; c: number; w: number; h: number }

/** Fixed parts of the plan: the building, the dig with its buffer, the gate. */
export const YARD_FIXED = {
  home: { r: 0, c: 2, w: 4, h: 3 } as Rect,          // rows 0-2, cols 2-5
  homeDoor: [{ r: 3, c: 3 }, { r: 3, c: 4 }] as Cell[],  // cells in front of the building
  dig: { r: 5, c: 6, w: 2, h: 4 } as Rect,            // rows 5-8, cols 6-7
  buffer: { r: 4, c: 5, w: 3, h: 6 } as Rect,         // amber band around the dig, rows 4-9, cols 5-7
  gate: [{ r: 9, c: 3 }, { r: 9, c: 4 }] as Cell[],
};

export interface YardModule { id: string; w: number; h: number }
export const YARD_MODULES: YardModule[] = [
  { id: 'cabin', w: 3, h: 2 },
  { id: 'toilet', w: 1, h: 1 },
  { id: 'store', w: 2, h: 2 },
  { id: 'machine', w: 2, h: 2 },
];

export type Placement = Rect & { id: string };

const inRect = (cell: Cell, rect: Rect): boolean =>
  cell.r >= rect.r && cell.r < rect.r + rect.h && cell.c >= rect.c && cell.c < rect.c + rect.w;
const overlaps = (a: Rect, b: Rect): boolean =>
  a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h;
const cellsOf = (rect: Rect): Cell[] => {
  const out: Cell[] = [];
  for (let r = rect.r; r < rect.r + rect.h; r += 1) for (let c = rect.c; c < rect.c + rect.w; c += 1) out.push({ r, c });
  return out;
};

/** Where a module may stand: inside the plan, off the building, the buffer and the gate, not on another module. */
export function placementOk(p: Placement, others: Placement[]): boolean {
  if (p.r < 0 || p.c < 0 || p.r + p.h > YARD_ROWS || p.c + p.w > YARD_COLS) return false;
  const { home, buffer } = YARD_FIXED;
  if (overlaps(p, home) || overlaps(p, buffer)) return false;
  if (YARD_FIXED.gate.some((g) => inRect(g, p))) return false;
  if (YARD_FIXED.homeDoor.some((g) => inRect(g, p))) return false;
  return !others.some((o) => o.id !== p.id && overlaps(o, p));
}

/** Free cells: nothing fixed (building, dig) and no module; the buffer is walkable. */
export function freeGrid(placements: Placement[], opts: { avoidNear?: string } = {}): boolean[][] {
  const grid: boolean[][] = Array.from({ length: YARD_ROWS }, () => Array(YARD_COLS).fill(true));
  for (const cell of cellsOf(YARD_FIXED.home)) grid[cell.r][cell.c] = false;
  for (const cell of cellsOf(YARD_FIXED.dig)) grid[cell.r][cell.c] = false;
  for (const p of placements) {
    for (const cell of cellsOf(p)) grid[cell.r][cell.c] = false;
    if (opts.avoidNear && p.id === opts.avoidNear) {
      // People keep a cell away from the machine.
      for (const cell of cellsOf({ r: p.r - 1, c: p.c - 1, w: p.w + 2, h: p.h + 2 })) {
        if (cell.r >= 0 && cell.c >= 0 && cell.r < YARD_ROWS && cell.c < YARD_COLS) grid[cell.r][cell.c] = false;
      }
    }
  }
  return grid;
}

/** Breadth-first walk over free cells from any `from` cell to any `to` cell. */
export function pathExists(grid: boolean[][], from: Cell[], to: Cell[]): boolean {
  const key = (c: Cell) => `${c.r},${c.c}`;
  const target = new Set(to.map(key));
  const seen = new Set<string>();
  const queue: Cell[] = from.filter((c) => grid[c.r]?.[c.c]);
  for (const c of queue) seen.add(key(c));
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (target.has(key(cur))) return true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { r: cur.r + dr, c: cur.c + dc };
      if (n.r < 0 || n.c < 0 || n.r >= YARD_ROWS || n.c >= YARD_COLS) continue;
      if (!grid[n.r][n.c] || seen.has(key(n))) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return false;
}

export type YardCheck = 'placed' | 'walk' | 'truck';

/**
 * Which constraints a layout satisfies. `withTruck` adds the second-phase
 * need: the mixer truck must reach the dig band from the gate.
 */
export function checkYard(placements: Placement[], withTruck: boolean): Record<YardCheck, boolean> {
  const placed = placements.length === YARD_MODULES.length && placements.every((p) => placementOk(p, placements));
  const walk = placed && pathExists(freeGrid(placements, { avoidNear: 'machine' }), YARD_FIXED.gate, YARD_FIXED.homeDoor);
  const truck = !withTruck || (placed && pathExists(freeGrid(placements), YARD_FIXED.gate, cellsOf(YARD_FIXED.buffer)));
  return { placed, walk, truck };
}

export const yardValid = (placements: Placement[], withTruck: boolean): boolean =>
  Object.values(checkYard(placements, withTruck)).every(Boolean);

/**
 * Two layouts belong to the same family when every module sits in the same
 * third of the plan (horizontally and vertically). Nudging a module by one
 * cell is not a new idea; moving the store from the left to the right is.
 */
export function layoutFamily(placements: Placement[]): string {
  return [...placements]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.id}:${Math.floor(((p.c + p.w / 2) / YARD_COLS) * 3)}${Math.floor(((p.r + p.h / 2) / YARD_ROWS) * 3)}`)
    .join('|');
}

export interface YardResult {
  kind: 'yard';
  validLayouts: number;      // distinct families saved before the new need
  truckSolved: boolean;      // a valid layout saved after the new need arrived
  saves: number;             // save attempts, valid or not
  families: string[];
}

export function evaluateYard(families: string[], truckSolved: boolean, saves: number): YardResult {
  return { kind: 'yard', validLayouts: new Set(families).size, truckSolved, saves, families };
}

// ---------------------------------------------------------------------------

export type PauseResult = VanResult | HandoverResult | StockResult | YardResult | { kind: PauseKind; skipped: true };
export type PauseResults = Partial<Record<PauseKind, PauseResult>>;

export const isSkipped = (r: PauseResult | undefined): boolean => Boolean(r && 'skipped' in r && r.skipped);
