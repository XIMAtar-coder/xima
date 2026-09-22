import { describe, expect, it } from 'vitest';
import {
  VAN, HANDOVER, STOCK, YARD_MODULES, YARD_FIXED,
  evaluateVan, vanCanLoad, vanUsed, evaluateHandover, evaluateStock, unitsNeeded,
  placementOk, checkYard, yardValid, layoutFamily, evaluateYard, pauseAfter, type Placement,
} from '../model';

describe('pauses — the van', () => {
  const fullLoad = Object.fromEntries(VAN.items.map((it) => [it.id, it.needed]));

  it('needs 21 of 22 cells for the note, so one extra piece pushes something out', () => {
    expect(vanUsed(fullLoad)).toBe(21);
    expect(VAN.capacity).toBe(22);
    expect(vanCanLoad(fullLoad, 'buckets')).toBe(false);   // size 2 does not fit any more
    expect(vanCanLoad(fullLoad, 'adhesive')).toBe(true);    // one more sack still fits… and is superfluous
  });

  it('counts needed and superfluous units separately', () => {
    const r = evaluateVan({ ...fullLoad, adhesive: 5, trestle: 0 }, 1);
    expect(r.complete).toBe(true);
    expect(r.superfluous).toBe(1);
    expect(r.unloads).toBe(1);
    const half = evaluateVan({ adhesive: 2, tiles: 1 }, 0);
    expect(half.needed).toBe(3);
    expect(half.neededTotal).toBe(9);
    expect(half.complete).toBe(false);
  });

  it('never loads more than the warehouse has', () => {
    expect(vanCanLoad({ tiles: 1 }, 'tiles')).toBe(false);
  });
});

describe('pauses — the handover', () => {
  it('scores what the receiver needed and did not know', () => {
    const r = evaluateHandover(['client', 'floor', 'material']);
    expect(r.necessary).toBe(3);
    expect(r.redundant).toBe(0);
    const w = evaluateHandover(['boss', 'goodluck', 'client']);
    expect(w.necessary).toBe(1);
    expect(w.redundant).toBe(1);
    expect(w.filler).toBe(1);
    expect(w.linesUsed).toBe(3);
  });

  it('has exactly three necessary pieces for three slots', () => {
    expect(HANDOVER.pieces.filter((p) => p.role === 'necessary')).toHaveLength(HANDOVER.slots);
  });
});

describe('pauses — the stock', () => {
  it('reads the quantity off the label yield', () => {
    expect(STOCK.jobs.map(unitsNeeded)).toEqual([2, 2, 2]);
  });

  it('separates the right product from the right quantity', () => {
    const r = evaluateStock({ job1: { p1: 2 }, job2: { p2: 1 }, job3: { p4: 2 } }, 3);
    expect(r.productRight).toBe(2);
    expect(r.quantityRight).toBe(1);
    expect(r.labelsOpened).toBe(3);
    const mixed = evaluateStock({ job1: { p1: 2, p4: 1 } }, 0);
    expect(mixed.productRight).toBe(0);
  });
});

describe('pauses — the yard', () => {
  const good: Placement[] = [
    { id: 'cabin', r: 1, c: 7, w: 1, h: 3 },   // rotated, right edge… wait: buffer is cols 5-7 rows 4-9; rows 1-3 free
    { id: 'toilet', r: 0, c: 0, w: 1, h: 1 },
    { id: 'store', r: 6, c: 0, w: 2, h: 2 },
    { id: 'machine', r: 1, c: 0, w: 2, h: 2 },
  ];

  it('rejects modules on the building, the buffer, the gate or each other', () => {
    expect(placementOk({ id: 'store', r: 0, c: 2, w: 2, h: 2 }, [])).toBe(false);      // building
    expect(placementOk({ id: 'store', r: 5, c: 5, w: 2, h: 2 }, [])).toBe(false);      // buffer
    expect(placementOk({ id: 'toilet', r: 9, c: 3, w: 1, h: 1 }, [])).toBe(false);     // gate
    expect(placementOk({ id: 'store', r: 6, c: 0, w: 2, h: 2 }, good)).toBe(true);     // itself
    expect(placementOk({ id: 'toilet', r: 6, c: 1, w: 1, h: 1 }, good)).toBe(false);   // on the store
  });

  it('accepts a layout where people walk from the gate to the door away from the machine', () => {
    const c = checkYard(good, false);
    expect(c.placed).toBe(true);
    expect(c.walk).toBe(true);
    expect(yardValid(good, false)).toBe(true);
  });

  it('fails the walk when the machine sits in front of the door', () => {
    const blocked: Placement[] = [
      { id: 'cabin', r: 6, c: 0, w: 3, h: 2 },
      { id: 'toilet', r: 0, c: 0, w: 1, h: 1 },
      { id: 'store', r: 1, c: 0, w: 2, h: 2 },
      { id: 'machine', r: 4, c: 3, w: 2, h: 2 },   // right under the door, people cannot pass beside it
    ];
    expect(checkYard(blocked, false).walk).toBe(false);
  });

  it('adds the truck path only in the second phase', () => {
    const wall: Placement[] = [
      { id: 'cabin', r: 5, c: 2, w: 3, h: 2 },     // cols 2-4 rows 5-6
      { id: 'store', r: 7, c: 3, w: 2, h: 2 },     // cols 3-4 rows 7-8
      { id: 'machine', r: 7, c: 0, w: 2, h: 2 },   // cols 0-1 rows 7-8… people go around? column 2 rows 7-9 free
      { id: 'toilet', r: 0, c: 0, w: 1, h: 1 },
    ];
    // the truck can still reach the buffer band from the gate via column 5? gate cells are cols 3-4 row 9;
    // row 9 cols 5-7 are the buffer itself, so the truck reaches it: truck true.
    expect(checkYard(wall, true).truck).toBe(true);
    expect(checkYard(good, true).truck).toBe(true);
    expect(YARD_FIXED.buffer.r + YARD_FIXED.buffer.h).toBe(10);
  });

  it('calls a nudge the same family and a real move a new one', () => {
    const a = layoutFamily(good);
    const nudged = good.map((p) => (p.id === 'toilet' ? { ...p, c: 1 } : p));
    const moved = good.map((p) => (p.id === 'store' ? { ...p, c: 3, r: 7 } : p));
    expect(layoutFamily(nudged)).toBe(a);
    expect(layoutFamily(moved)).not.toBe(a);
    expect(evaluateYard([a, a, layoutFamily(moved)], true, 3).validLayouts).toBe(2);
  });

  it('has four modules and a pause after 5, 10, 15, 20', () => {
    expect(YARD_MODULES).toHaveLength(4);
    expect([5, 10, 15, 20].map(pauseAfter)).toEqual(['van', 'handover', 'stock', 'yard']);
    expect(pauseAfter(7)).toBeNull();
  });
});
