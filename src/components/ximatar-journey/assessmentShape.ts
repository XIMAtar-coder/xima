/**
 * The shape of the XIMAtar questionnaire, for copy that tells the candidate
 * what is ahead. XimatarAssessment defines the questions themselves; the
 * shape test keeps these numbers in step with it.
 */
export const ASSESSMENT_MC_COUNT = 21;
export const ASSESSMENT_OPEN_COUNT = 2;

/**
 * A deliberately round estimate: the multiple-choice items are short
 * scenarios (~20-30 s each) and each written answer takes a few minutes.
 */
export const ASSESSMENT_ESTIMATED_MINUTES = 15;

/** Minimum length of a written answer, in characters (after trimming). */
export const OPEN_ANSWER_MIN_CHARS = 50;
