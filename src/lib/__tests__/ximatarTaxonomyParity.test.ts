/**
 * The XIMAtar taxonomy exists twice — once for the browser, once for edge
 * functions — with a comment saying "both files must stay in sync". Nothing
 * enforced that, and the two files had already drifted textually. What must
 * agree is the data: the twelve profiles and their pillar vectors decide both
 * which archetype a candidate is shown and how the shortlist measures distance
 * to a company. If those diverge, the candidate sees one animal and is ranked
 * as another.
 */
import { describe, expect, it } from 'vitest';
import * as client from '../ximatarTaxonomy';
import * as edge from '../../../supabase/functions/_shared/ximatarTaxonomy';

describe('ximatarTaxonomy — client/edge parity', () => {
  it('defines the same archetypes with identical pillar vectors', () => {
    expect(Object.keys(edge.XIMATAR_PROFILES).sort()).toEqual(Object.keys(client.XIMATAR_PROFILES).sort());
    for (const id of Object.keys(client.XIMATAR_PROFILES)) {
      expect(edge.XIMATAR_PROFILES[id].pillars).toEqual(client.XIMATAR_PROFILES[id].pillars);
      expect(edge.XIMATAR_PROFILES[id].name).toBe(client.XIMATAR_PROFILES[id].name);
    }
  });

  it('measures pillar distance identically', () => {
    const a = { drive: 80, comp_power: 40, communication: 65, creativity: 55, knowledge: 70 };
    const b = client.XIMATAR_PROFILES.lion.pillars;
    expect(edge.computePillarDistance(a, b)).toBeCloseTo(client.computePillarDistance(a, b), 10);
  });

  it('ranks archetypes in the same order for the same vector', () => {
    const v = { drive: 62, comp_power: 88, communication: 50, creativity: 58, knowledge: 77 };
    expect(edge.rankXimatarsByDistance(v).map((r) => r.id)).toEqual(client.rankXimatarsByDistance(v).map((r) => r.id));
  });
});
