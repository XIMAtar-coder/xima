/**
 * XIMAtar Recommendation Engine
 * 
 * Computes the top 12 recommended XIMAtar profiles for a hiring goal
 * using a hybrid strategy:
 * 
 * 1. Hard constraint: At least N (default 8) must come from Company Profile's
 *    ideal_ximatar_profile_ids when available
 * 2. Soft ranking: Within that set, rank by hiring goal similarity score
 * 3. Fill remaining slots with nearest neighbors by taxonomy similarity
 */

import { 
  XIMATAR_PROFILES, 
  XIMATAR_IDS,
  computePillarDistance,
  NEUTRAL_PILLARS,
  type XimatarPillars,
  type XimatarProfile 
} from '@/lib/ximatarTaxonomy';
import { tokenizeAndExpand } from './synonymMap';

// ============ Types ============

export interface CompanyRecommendationContext {
  ideal_ximatar_profile_ids?: string[] | null;
  pillar_vector?: XimatarPillars | null;
  values?: string[] | null;
  ideal_traits?: string[] | null;
  industry?: string | null;
}

export interface HiringGoalRecommendationContext {
  role_title?: string | null;
  function_area?: string | null;
  experience_level?: string | null;
  task_description?: string | null;
  responsibilities?: string | null;
  skills?: string[] | null;
  requirements_must?: string | null;
  country?: string | null;
  city_region?: string | null;
  language?: string | null;
}

export interface XimatarScoreBreakdown {
  skills_overlap: number;      // Weight: 0.45
  keyword_overlap: number;     // Weight: 0.25
  industry_overlap: number;    // Weight: 0.15
  seniority_fit: number;       // Weight: 0.10
  location_language: number;   // Weight: 0.05
  total: number;
}

export interface XimatarRecommendation {
  ximatar_id: string;
  profile: XimatarProfile;
  rank: number;
  score: number;
  score_breakdown: XimatarScoreBreakdown;
  source: 'company_constraint' | 'hiring_goal_match' | 'taxonomy_fallback';
  matched_skills: string[];
  matched_keywords: string[];
  matched_industries: string[];
  seniority_compatible: boolean;
  explanation: string;
}

export interface RecommendationResult {
  recommendations: XimatarRecommendation[];
  strategy_used: 'hybrid' | 'company_only' | 'goal_only' | 'fallback';
  company_constraint_count: number;
  goal_match_count: number;
  fallback_count: number;
  debug_info: {
    company_ideal_available: boolean;
    company_ideal_count: number;
    min_company_constraint: number;
    goal_tokens: string[];
    applied_weights: Record<string, number>;
  };
}

// ============ Configuration ============

const SCORING_WEIGHTS = {
  skills_overlap: 0.45,
  keyword_overlap: 0.25,
  industry_overlap: 0.15,
  seniority_fit: 0.10,
  location_language: 0.05,
};

const DEFAULT_MIN_COMPANY_CONSTRAINT = 8;
const TOTAL_RECOMMENDATIONS = 12;

// Seniority level mapping (1-5 scale)
const SENIORITY_MAP: Record<string, number> = {
  'entry': 1, 'junior': 1, 'graduate': 1, 'intern': 1,
  'mid': 2, 'intermediate': 2, 'associate': 2,
  'senior': 3, 'experienced': 3,
  'lead': 4, 'principal': 4, 'staff': 4, 'manager': 4,
  'director': 5, 'executive': 5, 'vp': 5, 'c-level': 5, 'head': 5,
};

// ============ Core Algorithm ============

export function computeXimatarRecommendations(
  companyContext: CompanyRecommendationContext,
  hiringGoalContext: HiringGoalRecommendationContext,
  options: {
    minCompanyConstraint?: number;
    debug?: boolean;
  } = {}
): RecommendationResult {
  const minCompanyConstraint = options.minCompanyConstraint ?? DEFAULT_MIN_COMPANY_CONSTRAINT;
  
  // Extract company's ideal XIMAtar list
  const companyIdealIds = (companyContext.ideal_ximatar_profile_ids || [])
    .filter(id => XIMATAR_IDS.includes(id));
  const hasCompanyIdeal = companyIdealIds.length > 0;
  
  // Tokenize hiring goal context for matching
  const goalTokens = extractGoalTokens(hiringGoalContext);
  const goalSeniority = parseSeniority(hiringGoalContext.experience_level);
  
  // Score all XIMAtars against hiring goal
  const allScored: Array<{
    id: string;
    score: number;
    breakdown: XimatarScoreBreakdown;
    matched_skills: string[];
    matched_keywords: string[];
    matched_industries: string[];
    seniority_compatible: boolean;
  }> = XIMATAR_IDS.map(id => {
    const profile = XIMATAR_PROFILES[id];
    const result = scoreXimatarAgainstGoal(profile, goalTokens, goalSeniority, companyContext);
    return { id, ...result };
  });
  
  // Sort by score descending (deterministic: use id as tiebreaker)
  allScored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id); // Alphabetical tiebreaker for stability
  });
  
  // Apply hybrid constraint strategy
  const recommendations: XimatarRecommendation[] = [];
  const usedIds = new Set<string>();
  
  let companyConstraintCount = 0;
  let goalMatchCount = 0;
  let fallbackCount = 0;
  
  if (hasCompanyIdeal) {
    // Phase 1: Pick top N from company's ideal list (ranked by goal score)
    const companyFiltered = allScored.filter(x => companyIdealIds.includes(x.id));
    const companyToTake = Math.min(minCompanyConstraint, companyFiltered.length);
    
    for (let i = 0; i < companyToTake; i++) {
      const scored = companyFiltered[i];
      usedIds.add(scored.id);
      recommendations.push(buildRecommendation(
        scored.id,
        recommendations.length + 1,
        scored,
        'company_constraint'
      ));
      companyConstraintCount++;
    }
    
    // Phase 2: Fill remaining slots with best matches not yet used
    const remaining = allScored.filter(x => !usedIds.has(x.id));
    const slotsLeft = TOTAL_RECOMMENDATIONS - recommendations.length;
    
    for (let i = 0; i < slotsLeft && i < remaining.length; i++) {
      const scored = remaining[i];
      usedIds.add(scored.id);
      
      // Determine source: company match or pure goal match
      const source = companyIdealIds.includes(scored.id) 
        ? 'company_constraint' 
        : 'hiring_goal_match';
      
      recommendations.push(buildRecommendation(
        scored.id,
        recommendations.length + 1,
        scored,
        source
      ));
      
      if (source === 'company_constraint') companyConstraintCount++;
      else goalMatchCount++;
    }
  } else {
    // No company ideal list - use pure goal-based ranking
    for (let i = 0; i < TOTAL_RECOMMENDATIONS && i < allScored.length; i++) {
      const scored = allScored[i];
      usedIds.add(scored.id);
      recommendations.push(buildRecommendation(
        scored.id,
        recommendations.length + 1,
        scored,
        'hiring_goal_match'
      ));
      goalMatchCount++;
    }
  }
  
  // Phase 3: Fallback to taxonomy distance if still short
  if (recommendations.length < TOTAL_RECOMMENDATIONS) {
    const companyVector = companyContext.pillar_vector || NEUTRAL_PILLARS;
    const remaining = XIMATAR_IDS
      .filter(id => !usedIds.has(id))
      .map(id => ({
        id,
        distance: computePillarDistance(companyVector, XIMATAR_PROFILES[id].pillars)
      }))
      .sort((a, b) => a.distance - b.distance);
    
    for (const item of remaining) {
      if (recommendations.length >= TOTAL_RECOMMENDATIONS) break;
      
      const scored = allScored.find(x => x.id === item.id)!;
      recommendations.push(buildRecommendation(
        item.id,
        recommendations.length + 1,
        scored,
        'taxonomy_fallback'
      ));
      fallbackCount++;
    }
  }
  
  // Determine strategy used
  let strategy_used: RecommendationResult['strategy_used'] = 'hybrid';
  if (!hasCompanyIdeal && goalMatchCount > 0) strategy_used = 'goal_only';
  else if (hasCompanyIdeal && goalMatchCount === 0 && fallbackCount === 0) strategy_used = 'company_only';
  else if (fallbackCount > 0 && companyConstraintCount === 0 && goalMatchCount === 0) strategy_used = 'fallback';
  
  return {
    recommendations,
    strategy_used,
    company_constraint_count: companyConstraintCount,
    goal_match_count: goalMatchCount,
    fallback_count: fallbackCount,
    debug_info: {
      company_ideal_available: hasCompanyIdeal,
      company_ideal_count: companyIdealIds.length,
      min_company_constraint: minCompanyConstraint,
      goal_tokens: goalTokens.slice(0, 20), // Limit for readability
      applied_weights: SCORING_WEIGHTS,
    },
  };
}

// ============ Scoring Functions ============

function scoreXimatarAgainstGoal(
  profile: XimatarProfile,
  goalTokens: string[],
  goalSeniority: number,
  companyContext: CompanyRecommendationContext
): {
  score: number;
  breakdown: XimatarScoreBreakdown;
  matched_skills: string[];
  matched_keywords: string[];
  matched_industries: string[];
  seniority_compatible: boolean;
} {
  // Expand profile data with synonyms
  const profileSkills = profile.skills.flatMap(s => tokenizeAndExpand(s));
  const profileKeywords = [...profile.keywords, ...profile.tags].flatMap(k => tokenizeAndExpand(k));
  const profileIndustries = profile.industries.flatMap(i => tokenizeAndExpand(i));
  
  // Add company context to matching
  const companyIndustries = tokenizeAndExpand(companyContext.industry || '');
  const companyValues = (companyContext.values || []).flatMap(v => tokenizeAndExpand(v));
  const companyTraits = (companyContext.ideal_traits || []).flatMap(t => tokenizeAndExpand(t));
  
  // Calculate overlaps
  const matched_skills = findOverlap(goalTokens, profileSkills);
  const matched_keywords = findOverlap(goalTokens, [...profileKeywords, ...companyValues, ...companyTraits]);
  const matched_industries = findOverlap([...goalTokens, ...companyIndustries], profileIndustries);
  
  // Skills overlap score (0-100)
  const skillsScore = matched_skills.length > 0 
    ? Math.min(100, (matched_skills.length / Math.max(profile.skills.length, 1)) * 100 + matched_skills.length * 10)
    : 0;
  
  // Keyword overlap score (0-100)
  const keywordScore = matched_keywords.length > 0
    ? Math.min(100, matched_keywords.length * 15)
    : 0;
  
  // Industry overlap score (0-100)
  const industryScore = matched_industries.length > 0
    ? Math.min(100, matched_industries.length * 25)
    : 0;
  
  // Seniority fit score (0-100)
  const seniority_compatible = goalSeniority >= profile.seniorityRange.min && 
                               goalSeniority <= profile.seniorityRange.max;
  const seniorityScore = seniority_compatible ? 100 : 
    Math.max(0, 100 - Math.abs(goalSeniority - (profile.seniorityRange.min + profile.seniorityRange.max) / 2) * 30);
  
  // Location/language score (placeholder - 50 baseline)
  const locationScore = 50;
  
  // Weighted total
  const total = 
    skillsScore * SCORING_WEIGHTS.skills_overlap +
    keywordScore * SCORING_WEIGHTS.keyword_overlap +
    industryScore * SCORING_WEIGHTS.industry_overlap +
    seniorityScore * SCORING_WEIGHTS.seniority_fit +
    locationScore * SCORING_WEIGHTS.location_language;
  
  return {
    score: Math.round(total * 10) / 10,
    breakdown: {
      skills_overlap: Math.round(skillsScore * 10) / 10,
      keyword_overlap: Math.round(keywordScore * 10) / 10,
      industry_overlap: Math.round(industryScore * 10) / 10,
      seniority_fit: Math.round(seniorityScore * 10) / 10,
      location_language: Math.round(locationScore * 10) / 10,
      total: Math.round(total * 10) / 10,
    },
    matched_skills,
    matched_keywords,
    matched_industries,
    seniority_compatible,
  };
}

function extractGoalTokens(goal: HiringGoalRecommendationContext): string[] {
  const texts = [
    goal.role_title,
    goal.function_area,
    goal.task_description,
    goal.responsibilities,
    goal.requirements_must,
    ...(goal.skills || []),
  ].filter(Boolean).join(' ');
  
  return tokenizeAndExpand(texts);
}

function parseSeniority(level: string | null | undefined): number {
  if (!level) return 2; // Default to mid-level
  
  const normalized = level.toLowerCase().trim();
  
  // Direct match
  if (SENIORITY_MAP[normalized]) return SENIORITY_MAP[normalized];
  
  // Partial match
  for (const [key, value] of Object.entries(SENIORITY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return 2; // Default fallback
}

function findOverlap(source: string[], target: string[]): string[] {
  const sourceSet = new Set(source.map(s => s.toLowerCase()));
  const matched: string[] = [];
  
  for (const t of target) {
    const tLower = t.toLowerCase();
    if (sourceSet.has(tLower)) {
      matched.push(t);
    } else {
      // Check partial matches
      for (const s of source) {
        if (s.length > 3 && tLower.length > 3 && (s.includes(tLower) || tLower.includes(s))) {
          matched.push(t);
          break;
        }
      }
    }
  }
  
  return [...new Set(matched)];
}

function buildRecommendation(
  id: string,
  rank: number,
  scored: {
    score: number;
    breakdown: XimatarScoreBreakdown;
    matched_skills: string[];
    matched_keywords: string[];
    matched_industries: string[];
    seniority_compatible: boolean;
  },
  source: XimatarRecommendation['source']
): XimatarRecommendation {
  const profile = XIMATAR_PROFILES[id];
  
  // Build explanation
  const explanationParts: string[] = [];
  
  if (source === 'company_constraint') {
    explanationParts.push('Aligned with company culture');
  }
  
  if (scored.matched_skills.length > 0) {
    explanationParts.push(`Skills: ${scored.matched_skills.slice(0, 3).join(', ')}`);
  }
  
  if (scored.matched_industries.length > 0) {
    explanationParts.push(`Industry: ${scored.matched_industries.slice(0, 2).join(', ')}`);
  }
  
  if (scored.seniority_compatible) {
    explanationParts.push('Seniority match');
  }
  
  if (explanationParts.length === 0) {
    explanationParts.push(`${profile.title} - general fit`);
  }
  
  return {
    ximatar_id: id,
    profile,
    rank,
    score: scored.score,
    score_breakdown: scored.breakdown,
    source,
    matched_skills: scored.matched_skills,
    matched_keywords: scored.matched_keywords,
    matched_industries: scored.matched_industries,
    seniority_compatible: scored.seniority_compatible,
    explanation: explanationParts.join(' | '),
  };
}

// ============ Utility Exports ============

export { SCORING_WEIGHTS, SENIORITY_MAP };
