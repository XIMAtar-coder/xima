/**
 * XIMAtar Recommendations Module
 * 
 * Exports the main recommendation computation function and related utilities.
 */

export {
  computeXimatarRecommendations,
  SCORING_WEIGHTS,
  SENIORITY_MAP,
  type CompanyRecommendationContext,
  type HiringGoalRecommendationContext,
  type XimatarRecommendation,
  type XimatarScoreBreakdown,
  type RecommendationResult,
} from './computeXimatarRecommendations';

export {
  SYNONYM_MAP,
  tokenize,
  tokenizeAndExpand,
  expandWithSynonyms,
} from './synonymMap';
