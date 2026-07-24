/**
 * Test Harness for XIMAtar Recommendation Engine
 * 
 * This file contains sample test cases to validate the recommendation
 * algorithm produces stable, deterministic results.
 * 
 * Run with: import and call runRecommendationTests() in browser console
 * or integrate with your test framework.
 */

import { computeXimatarRecommendations, type CompanyRecommendationContext, type HiringGoalRecommendationContext, type RecommendationResult } from '../computeXimatarRecommendations';

interface TestCase {
  name: string;
  company: CompanyRecommendationContext;
  goal: HiringGoalRecommendationContext;
  expectedTop3Contains?: string[];
  expectedStrategy?: RecommendationResult['strategy_used'];
  minCompanyConstraintOverride?: number;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Tech Startup - Data Engineer',
    company: {
      ideal_ximatar_profile_ids: ['owl', 'cat', 'bee', 'fox', 'wolf', 'lion', 'horse', 'chameleon', 'dolphin', 'parrot', 'bear', 'elephant'],
      pillar_vector: { drive: 75, comp_power: 85, communication: 60, creativity: 70, knowledge: 65 },
      values: ['innovation', 'data-driven', 'agile', 'collaboration'],
      ideal_traits: ['analytical', 'problem-solving', 'technical'],
      industry: 'technology',
    },
    goal: {
      role_title: 'Senior Data Engineer',
      function_area: 'Engineering',
      experience_level: 'senior',
      task_description: 'Build and maintain ETL pipelines, data warehouse infrastructure, and analytics systems',
      skills: ['python', 'sql', 'spark', 'airflow', 'aws'],
      requirements_must: 'Strong experience with data pipelines and cloud infrastructure',
    },
    expectedTop3Contains: ['owl', 'cat', 'bee'], // Analytical profiles should rank high
    expectedStrategy: 'hybrid',
  },
  
  {
    name: 'Consulting Firm - Sales Director',
    company: {
      ideal_ximatar_profile_ids: ['lion', 'fox', 'wolf', 'parrot', 'dolphin', 'chameleon', 'horse', 'elephant', 'owl', 'cat', 'bee', 'bear'],
      pillar_vector: { drive: 85, comp_power: 60, communication: 80, creativity: 65, knowledge: 70 },
      values: ['client-focused', 'excellence', 'integrity', 'teamwork'],
      ideal_traits: ['leadership', 'persuasion', 'relationship-building'],
      industry: 'consulting',
    },
    goal: {
      role_title: 'Sales Director',
      function_area: 'Sales',
      experience_level: 'director',
      task_description: 'Lead B2B sales team, develop client relationships, close enterprise deals',
      skills: ['sales', 'negotiation', 'crm', 'team management', 'strategy'],
      requirements_must: 'Proven track record in B2B enterprise sales with 10+ years experience',
    },
    expectedTop3Contains: ['lion', 'fox', 'wolf'], // Leadership + sales profiles
    expectedStrategy: 'hybrid',
  },
  
  {
    name: 'Healthcare - HR Manager (No Company Profile)',
    company: {
      // No ideal_ximatar_profile_ids - should use goal-only strategy
      pillar_vector: { drive: 60, comp_power: 55, communication: 75, creativity: 50, knowledge: 70 },
      industry: 'healthcare',
    },
    goal: {
      role_title: 'HR Manager',
      function_area: 'Human Resources',
      experience_level: 'manager',
      task_description: 'Manage HR operations, recruiting, employee relations, and compliance',
      skills: ['recruiting', 'employee relations', 'compliance', 'training'],
      requirements_must: 'Healthcare industry experience preferred',
    },
    expectedTop3Contains: ['dolphin', 'bear'], // People-focused + compliance
    expectedStrategy: 'goal_only',
  },
  
  {
    name: 'Creative Agency - UX Designer',
    company: {
      ideal_ximatar_profile_ids: ['cat', 'parrot', 'fox', 'chameleon', 'owl', 'dolphin', 'lion', 'wolf', 'bee', 'horse', 'elephant', 'bear'],
      pillar_vector: { drive: 65, comp_power: 60, communication: 75, creativity: 90, knowledge: 55 },
      values: ['creativity', 'innovation', 'design-thinking', 'user-first'],
      ideal_traits: ['creative', 'user-focused', 'collaborative'],
      industry: 'design',
    },
    goal: {
      role_title: 'Senior UX Designer',
      function_area: 'Design',
      experience_level: 'senior',
      task_description: 'Lead UX research and design for mobile and web applications',
      skills: ['ux research', 'prototyping', 'figma', 'user testing', 'design systems'],
      requirements_must: 'Portfolio demonstrating user-centered design process',
    },
    expectedTop3Contains: ['cat', 'parrot'], // Creative + communication focused
    expectedStrategy: 'hybrid',
  },
];

export interface TestResult {
  name: string;
  passed: boolean;
  result: RecommendationResult;
  checks: {
    strategy_correct: boolean;
    top3_contains_expected: boolean;
    has_12_recommendations: boolean;
    deterministic: boolean;
  };
  errors: string[];
}

export function runRecommendationTests(): TestResult[] {
  const results: TestResult[] = [];
  
  for (const testCase of TEST_CASES) {
    const errors: string[] = [];
    
    // Run twice to check determinism
    const result1 = computeXimatarRecommendations(
      testCase.company,
      testCase.goal,
      { minCompanyConstraint: testCase.minCompanyConstraintOverride }
    );
    
    const result2 = computeXimatarRecommendations(
      testCase.company,
      testCase.goal,
      { minCompanyConstraint: testCase.minCompanyConstraintOverride }
    );
    
    // Check determinism
    const isDeterministic = result1.recommendations.map(r => r.ximatar_id).join(',') ===
                           result2.recommendations.map(r => r.ximatar_id).join(',');
    if (!isDeterministic) {
      errors.push('Results are not deterministic between runs');
    }
    
    // Check count
    const has12 = result1.recommendations.length === 12;
    if (!has12) {
      errors.push(`Expected 12 recommendations, got ${result1.recommendations.length}`);
    }
    
    // Check strategy
    const strategyCorrect = !testCase.expectedStrategy || result1.strategy_used === testCase.expectedStrategy;
    if (!strategyCorrect) {
      errors.push(`Expected strategy ${testCase.expectedStrategy}, got ${result1.strategy_used}`);
    }
    
    // Check top 3 contains expected
    const top3Ids = result1.recommendations.slice(0, 3).map(r => r.ximatar_id);
    const top3ContainsExpected = !testCase.expectedTop3Contains || 
      testCase.expectedTop3Contains.some(id => top3Ids.includes(id));
    if (!top3ContainsExpected) {
      errors.push(`Expected top 3 to contain one of [${testCase.expectedTop3Contains?.join(', ')}], got [${top3Ids.join(', ')}]`);
    }
    
    results.push({
      name: testCase.name,
      passed: errors.length === 0,
      result: result1,
      checks: {
        strategy_correct: strategyCorrect,
        top3_contains_expected: top3ContainsExpected,
        has_12_recommendations: has12,
        deterministic: isDeterministic,
      },
      errors,
    });
  }
  
  return results;
}

/**
 * Console-friendly test runner
 */
export function runAndLogTests(): void {
  console.group('🧪 XIMAtar Recommendation Engine Tests');
  
  const results = runRecommendationTests();
  let passed = 0;
  let failed = 0;
  
  for (const result of results) {
    if (result.passed) {
      passed++;
      console.log(`✅ ${result.name}`);
      console.log(`   Strategy: ${result.result.strategy_used}`);
      console.log(`   Top 3: ${result.result.recommendations.slice(0, 3).map(r => r.ximatar_id).join(', ')}`);
      console.log(`   Constraint breakdown: Company=${result.result.company_constraint_count}, Goal=${result.result.goal_match_count}, Fallback=${result.result.fallback_count}`);
    } else {
      failed++;
      console.error(`❌ ${result.name}`);
      result.errors.forEach(err => console.error(`   - ${err}`));
    }
  }
  
  console.log('');
  console.log(`Results: ${passed}/${results.length} passed`);
  console.groupEnd();
}

// Export for module access
export { TEST_CASES };
