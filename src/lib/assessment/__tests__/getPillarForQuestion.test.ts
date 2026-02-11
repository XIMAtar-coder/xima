import { describe, it, expect } from 'vitest';
import {
  getPillarForQuestion,
  buildQuestionPillarMap,
  getQuestionIdsByPillar,
  PILLAR_CYCLE,
} from '../getPillarForQuestion';

/**
 * Expected cyclic mapping (verified against en.json i18n categories):
 *   q1  → computational_power
 *   q2  → communication
 *   q3  → knowledge
 *   q4  → creativity
 *   q5  → drive
 *   q6  → computational_power
 *   q7  → communication
 *   ...
 *   q21 → computational_power
 */
const EXPECTED_MAP: Record<number, string> = {
  1: 'computational_power',
  2: 'communication',
  3: 'knowledge',
  4: 'creativity',
  5: 'drive',
  6: 'computational_power',
  7: 'communication',
  8: 'knowledge',
  9: 'creativity',
  10: 'drive',
  11: 'computational_power',
  12: 'communication',
  13: 'knowledge',
  14: 'creativity',
  15: 'drive',
  16: 'computational_power',
  17: 'communication',
  18: 'knowledge',
  19: 'creativity',
  20: 'drive',
  21: 'computational_power',
};

describe('getPillarForQuestion — cyclic mapping', () => {
  it('maps all 21 questions to correct cyclic pillars', () => {
    for (let i = 1; i <= 21; i++) {
      expect(getPillarForQuestion(i)).toBe(EXPECTED_MAP[i]);
    }
  });

  it('buildQuestionPillarMap matches expected map', () => {
    const map = buildQuestionPillarMap();
    expect(map).toEqual(EXPECTED_MAP);
  });

  it('getQuestionIdsByPillar groups correctly', () => {
    const groups = getQuestionIdsByPillar();
    expect(groups.computational_power).toEqual([1, 6, 11, 16, 21]);
    expect(groups.communication).toEqual([2, 7, 12, 17]);
    expect(groups.knowledge).toEqual([3, 8, 13, 18]);
    expect(groups.creativity).toEqual([4, 9, 14, 19]);
    expect(groups.drive).toEqual([5, 10, 15, 20]);
  });
});

describe('getPillarForQuestion — i18n category label (EN)', () => {
  it('resolves EN category labels', () => {
    expect(getPillarForQuestion(1, 'Computational Power')).toBe('computational_power');
    expect(getPillarForQuestion(2, 'Communication')).toBe('communication');
    expect(getPillarForQuestion(3, 'Knowledge')).toBe('knowledge');
    expect(getPillarForQuestion(4, 'Creativity')).toBe('creativity');
    expect(getPillarForQuestion(5, 'Drive')).toBe('drive');
  });
});

describe('getPillarForQuestion — i18n category label (IT)', () => {
  it('resolves IT category labels', () => {
    expect(getPillarForQuestion(1, 'Potenza Computazionale')).toBe('computational_power');
    expect(getPillarForQuestion(2, 'Comunicazione')).toBe('communication');
    expect(getPillarForQuestion(3, 'Conoscenza')).toBe('knowledge');
    expect(getPillarForQuestion(4, 'Creatività')).toBe('creativity');
    expect(getPillarForQuestion(5, 'Motivazione')).toBe('drive');
  });
});

describe('getPillarForQuestion — i18n category label (ES)', () => {
  it('resolves ES category labels', () => {
    expect(getPillarForQuestion(1, 'Potencia Computacional')).toBe('computational_power');
    expect(getPillarForQuestion(2, 'Comunicación')).toBe('communication');
    expect(getPillarForQuestion(3, 'Conocimiento')).toBe('knowledge');
    expect(getPillarForQuestion(4, 'Creatividad')).toBe('creativity');
    expect(getPillarForQuestion(5, 'Impulso')).toBe('drive');
  });
});

describe('getPillarForQuestion — regression: old block mapping was wrong', () => {
  it('q2 (labeled Communication) scores as communication, NOT computational_power', () => {
    // The OLD code mapped q2 → computational_power (block 1-5). This was the bug.
    expect(getPillarForQuestion(2)).toBe('communication');
    expect(getPillarForQuestion(2)).not.toBe('computational_power');
  });

  it('q6 (labeled Computational Power) scores as computational_power, NOT communication', () => {
    // OLD code mapped q6 → communication (block 6-10). Bug.
    expect(getPillarForQuestion(6)).toBe('computational_power');
    expect(getPillarForQuestion(6)).not.toBe('communication');
  });

  it('q21 (labeled Computational Power) scores as computational_power, NOT drive', () => {
    // OLD code mapped q21 → drive (block 19-21). Bug.
    expect(getPillarForQuestion(21)).toBe('computational_power');
    expect(getPillarForQuestion(21)).not.toBe('drive');
  });
});

describe('getPillarForQuestion — fallback for unknown/missing labels', () => {
  it('falls back to cyclic pattern when category is empty', () => {
    expect(getPillarForQuestion(7, '')).toBe('communication');
  });

  it('falls back to cyclic pattern for unknown category', () => {
    expect(getPillarForQuestion(3, 'Unknown Category')).toBe('knowledge');
  });

  it('handles string question IDs like "q14"', () => {
    expect(getPillarForQuestion('q14')).toBe('creativity');
  });
});
