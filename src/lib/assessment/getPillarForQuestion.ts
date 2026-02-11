/**
 * Single source of truth: question → pillar mapping.
 *
 * The i18n category labels rotate cyclically:
 *   q1  Computational Power   (index 0 → 0 % 5 = 0)
 *   q2  Communication         (index 1 → 1 % 5 = 1)
 *   q3  Knowledge             (index 2 → 2 % 5 = 2)
 *   q4  Creativity            (index 3 → 3 % 5 = 3)
 *   q5  Drive                 (index 4 → 4 % 5 = 4)
 *   q6  Computational Power   (index 5 → 5 % 5 = 0)
 *   ...
 *   q21 Computational Power   (index 20 → 20 % 5 = 0)
 */

export type PillarKey =
  | 'computational_power'
  | 'communication'
  | 'knowledge'
  | 'creativity'
  | 'drive';

/** Canonical cyclic order (matches i18n category rotation). */
const PILLAR_CYCLE: PillarKey[] = [
  'computational_power',
  'communication',
  'knowledge',
  'creativity',
  'drive',
];

/** Map localised category labels → pillar key (EN / IT / ES). */
const CATEGORY_LABEL_MAP: Record<string, PillarKey> = {
  // EN
  'computational power': 'computational_power',
  'communication': 'communication',
  'knowledge': 'knowledge',
  'creativity': 'creativity',
  'drive': 'drive',
  // IT
  'potenza computazionale': 'computational_power',
  'comunicazione': 'communication',
  'conoscenza': 'knowledge',
  'creatività': 'creativity',
  'motivazione': 'drive',
  // ES
  'potencia computacional': 'computational_power',
  'comunicación': 'communication',
  'conocimiento': 'knowledge',
  'creatividad': 'creativity',
  'impulso': 'drive',
};

/**
 * Derive the pillar a question belongs to.
 *
 * Strategy:
 *  1. If a `categoryLabel` is supplied (from i18n), normalise it and look up.
 *  2. Otherwise fall back to the deterministic cyclic pattern based on question number.
 *  3. Log a warning (dev-only) whenever the fallback is used.
 */
export function getPillarForQuestion(
  questionId: number | string,
  categoryLabel?: string,
): PillarKey {
  // --- attempt i18n category lookup ---
  if (categoryLabel) {
    const normalised = categoryLabel.trim().toLowerCase();
    const hit = CATEGORY_LABEL_MAP[normalised];
    if (hit) return hit;

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[getPillarForQuestion] Unknown category label "${categoryLabel}" for question ${questionId}. Using cyclic fallback.`,
      );
    }
  }

  // --- cyclic fallback ---
  const n = typeof questionId === 'string'
    ? parseInt(questionId.replace(/\D/g, ''), 10)
    : questionId;

  if (isNaN(n) || n < 1) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[getPillarForQuestion] Invalid questionId "${questionId}". Defaulting to creativity.`,
      );
    }
    return 'creativity';
  }

  return PILLAR_CYCLE[(n - 1) % 5];
}

/**
 * Build the full pillar map for questions 1-21.
 * Returns { 1: 'computational_power', 2: 'communication', ... }
 */
export function buildQuestionPillarMap(): Record<number, PillarKey> {
  const map: Record<number, PillarKey> = {};
  for (let i = 1; i <= 21; i++) {
    map[i] = PILLAR_CYCLE[(i - 1) % 5];
  }
  return map;
}

/**
 * Group question IDs by pillar (cyclic mapping).
 * Returns e.g. { computational_power: [1,6,11,16,21], communication: [2,7,12,17], ... }
 */
export function getQuestionIdsByPillar(): Record<PillarKey, number[]> {
  const groups: Record<PillarKey, number[]> = {
    computational_power: [],
    communication: [],
    knowledge: [],
    creativity: [],
    drive: [],
  };
  for (let i = 1; i <= 21; i++) {
    groups[PILLAR_CYCLE[(i - 1) % 5]].push(i);
  }
  return groups;
}

export { PILLAR_CYCLE };
