import { describe, it, expect } from 'vitest';
import enTranslations from '@/i18n/locales/en.json';
import { ASSESSMENT_MC_COUNT, ASSESSMENT_OPEN_COUNT } from '../assessmentShape';

/**
 * The questionnaire intro tells candidates how many questions are ahead. The
 * numbers live in assessmentShape.ts; this keeps them honest against the
 * sealed question sets.
 */
describe('assessment shape', () => {
  const sets = (enTranslations as { assessmentSets: Record<string, { questions: Record<string, { options?: unknown[] }> }> })
    .assessmentSets;

  it.each(Object.keys(sets))('%s has the advertised number of questions', (setKey) => {
    const questions = sets[setKey].questions;
    const mc = Object.keys(questions).filter((k) => /^q\d+$/.test(k));
    const open = Object.keys(questions).filter((k) => /^open\d+$/.test(k));
    expect(mc).toHaveLength(ASSESSMENT_MC_COUNT);
    expect(open).toHaveLength(ASSESSMENT_OPEN_COUNT);
  });
});
