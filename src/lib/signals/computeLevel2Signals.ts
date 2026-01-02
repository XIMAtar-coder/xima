/**
 * XIMA Level 2 Signals - Hard Skill Interpretation
 * 
 * Generates qualitative AI interpretation for Level 2 (role-based) submissions.
 * Uses edge function for AI-powered analysis.
 * NO SCORES - only qualitative assessments.
 */

import { supabase } from '@/integrations/supabase/client';

export interface Level2SignalsPayload {
  hardSkillClarity: 'clear' | 'partial' | 'fragmented';
  hardSkillExplanation: string;
  toolMethodMaturity: 'clear' | 'partial' | 'fragmented';
  toolMethodExplanation: string;
  decisionQualityUnderConstraints: 'clear' | 'partial' | 'fragmented';
  decisionExplanation: string;
  riskAwareness: 'clear' | 'partial' | 'fragmented';
  riskExplanation: string;
  executionRealism: 'clear' | 'partial' | 'fragmented';
  executionExplanation: string;
  overallReadiness: 'ready' | 'needs_clarification' | 'insufficient';
  summary: string;
  flags: string[];
  generatedAt?: string;
}

interface Level2Payload {
  approach?: string;
  decisions_tradeoffs?: string;
  concrete_deliverables?: string;
  tools_methods?: string;
  risks_failures?: string;
  questions_for_company?: string;
  // Legacy fields
  role_plan?: string;
  assumptions_tradeoffs?: string;
  key_deliverables?: string;
}

/**
 * Call the edge function to compute Level 2 signals using AI
 */
export async function computeLevel2SignalsAsync(submissionId: string): Promise<Level2SignalsPayload> {
  console.log('Calling compute-level2-signals edge function for:', submissionId);
  
  const { data, error } = await supabase.functions.invoke('compute-level2-signals', {
    body: { submission_id: submissionId }
  });

  if (error) {
    console.error('Edge function error:', error);
    throw new Error(error.message || 'Failed to compute Level 2 signals');
  }

  if (data?.error) {
    console.error('Edge function returned error:', data.error);
    throw new Error(data.error);
  }

  if (!data?.signals) {
    throw new Error('No signals returned from edge function');
  }

  return data.signals as Level2SignalsPayload;
}

// Word count helper
const countWords = (text: string): number => text?.trim().split(/\s+/).filter(Boolean).length || 0;

// Check for specific technical depth indicators
const hasTechnicalTerms = (text: string): boolean => 
  /api|database|framework|architecture|system|integration|pipeline|deployment|testing|ci\/cd|docker|kubernetes|aws|gcp|azure|sql|nosql|rest|graphql|microservice|monolith|cache|queue|scalab/i.test(text);

const hasMethodology = (text: string): boolean =>
  /agile|scrum|kanban|waterfall|lean|sprint|iteration|standup|retrospective|roadmap|backlog|milestone|deadline|timeline|phase|stage/i.test(text);

const hasConcreteDeliverables = (text: string): boolean =>
  /document|report|prototype|mvp|demo|presentation|spec|requirement|design|mockup|wireframe|diagram|analysis|proposal|plan|strategy/i.test(text);

const hasRiskLanguage = (text: string): boolean =>
  /risk|failure|challenge|blocker|dependency|bottleneck|constraint|limitation|issue|problem|concern|assumption|unknown|uncertainty/i.test(text);

const hasMitigationLanguage = (text: string): boolean =>
  /mitigate|prevent|address|handle|manage|contingency|fallback|alternative|backup|monitor|track|escalat/i.test(text);

const hasSpecificTools = (text: string): boolean =>
  /jira|confluence|notion|figma|sketch|miro|slack|teams|zoom|google|microsoft|salesforce|hubspot|zendesk|tableau|looker|amplitude|mixpanel|segment|stripe|twilio|sendgrid|datadog|splunk|grafana|prometheus/i.test(text);

/**
 * Fallback: Compute Level 2 signals locally (no AI)
 * Used when edge function fails or for quick preview
 */
export function computeLevel2Signals(payload: Level2Payload): Level2SignalsPayload {
  const flags: string[] = [];

  // Normalize to new format
  const approach = payload.approach || '';
  const decisionsTradeoffs = payload.decisions_tradeoffs || payload.assumptions_tradeoffs || '';
  const deliverables = payload.concrete_deliverables || payload.key_deliverables || '';
  const tools = payload.tools_methods || payload.role_plan || '';
  const risks = payload.risks_failures || '';
  const questions = payload.questions_for_company || '';

  const allText = `${approach} ${decisionsTradeoffs} ${deliverables} ${tools} ${risks}`;

  // === HARD SKILL CLARITY ===
  let hardSkillClarity: 'clear' | 'partial' | 'fragmented' = 'partial';
  let hardSkillExplanation = '';

  const approachWords = countWords(approach);
  const hasTech = hasTechnicalTerms(approach) || hasTechnicalTerms(tools);
  const hasMethod = hasMethodology(approach) || hasMethodology(tools);

  if (approachWords >= 80 && (hasTech || hasMethod)) {
    hardSkillClarity = 'clear';
    hardSkillExplanation = 'Technical approach is well-articulated with specific methodologies or technologies referenced.';
    flags.push('strong_technical_depth');
  } else if (approachWords >= 40 || hasTech) {
    hardSkillClarity = 'partial';
    hardSkillExplanation = 'Technical elements present but could be more specific about methods or tools.';
  } else {
    hardSkillClarity = 'fragmented';
    hardSkillExplanation = 'Approach lacks technical specificity. Consider probing for more concrete methods.';
    flags.push('weak_technical_depth');
  }

  // === TOOL & METHOD MATURITY ===
  let toolMethodMaturity: 'clear' | 'partial' | 'fragmented' = 'partial';
  let toolMethodExplanation = '';

  const toolsWords = countWords(tools);
  const hasSpecific = hasSpecificTools(tools);

  if (toolsWords >= 60 && hasSpecific) {
    toolMethodMaturity = 'clear';
    toolMethodExplanation = 'Demonstrates familiarity with industry-standard tools and frameworks.';
    flags.push('tool_expertise');
  } else if (toolsWords >= 30 || hasSpecificTools(allText)) {
    toolMethodMaturity = 'partial';
    toolMethodExplanation = 'Some tool awareness shown but could name specific solutions.';
  } else {
    toolMethodMaturity = 'fragmented';
    toolMethodExplanation = 'Limited tool/method specification. May benefit from exploring practical experience.';
    flags.push('generic_tooling');
  }

  // === DECISION QUALITY UNDER CONSTRAINTS ===
  let decisionQualityUnderConstraints: 'clear' | 'partial' | 'fragmented' = 'partial';
  let decisionExplanation = '';

  const tradeoffWords = countWords(decisionsTradeoffs);
  const hasExplicitTradeoff = /trade-?off|prioritiz|sacrifice|instead of|rather than|versus|vs\./i.test(decisionsTradeoffs);

  if (tradeoffWords >= 60 && hasExplicitTradeoff) {
    decisionQualityUnderConstraints = 'clear';
    decisionExplanation = 'Clearly articulates trade-offs and decision rationale under constraints.';
    flags.push('clear_decision_logic');
  } else if (tradeoffWords >= 30 || hasExplicitTradeoff) {
    decisionQualityUnderConstraints = 'partial';
    decisionExplanation = 'Some decision logic present but trade-offs could be more explicit.';
  } else {
    decisionQualityUnderConstraints = 'fragmented';
    decisionExplanation = 'Trade-off reasoning not clearly articulated. Consider follow-up on prioritization.';
    flags.push('weak_tradeoff_reasoning');
  }

  // === RISK AWARENESS ===
  let riskAwareness: 'clear' | 'partial' | 'fragmented' = 'partial';
  let riskExplanation = '';

  const risksWords = countWords(risks);
  const hasRisks = hasRiskLanguage(risks);
  const hasMitigation = hasMitigationLanguage(risks);

  if (risksWords >= 50 && hasRisks && hasMitigation) {
    riskAwareness = 'clear';
    riskExplanation = 'Identifies risks and proposes mitigation strategies.';
    flags.push('proactive_risk_management');
  } else if (risksWords >= 25 || hasRisks) {
    riskAwareness = 'partial';
    riskExplanation = 'Risks identified but mitigation strategies could be more concrete.';
  } else {
    riskAwareness = 'fragmented';
    riskExplanation = 'Risk analysis is limited. May benefit from exploring failure scenarios.';
    flags.push('limited_risk_awareness');
  }

  // === EXECUTION REALISM ===
  let executionRealism: 'clear' | 'partial' | 'fragmented' = 'partial';
  let executionExplanation = '';

  const deliverableWords = countWords(deliverables);
  const hasConcrete = hasConcreteDeliverables(deliverables);
  const hasTimeline = /week|day|month|sprint|phase|milestone|deadline|timeline/i.test(allText);

  if (deliverableWords >= 50 && hasConcrete && hasTimeline) {
    executionRealism = 'clear';
    executionExplanation = 'Concrete deliverables with realistic timeline awareness.';
    flags.push('realistic_execution_plan');
  } else if (deliverableWords >= 25 || hasConcrete) {
    executionRealism = 'partial';
    executionExplanation = 'Deliverables outlined but could benefit from more timeline context.';
  } else {
    executionRealism = 'fragmented';
    executionExplanation = 'Deliverables are vague. Consider probing for specific outputs.';
    flags.push('vague_deliverables');
  }

  // Questions for company - bonus flag
  if (countWords(questions) >= 20) {
    flags.push('asks_thoughtful_questions');
  }

  // === OVERALL READINESS ===
  const clearCount = [hardSkillClarity, toolMethodMaturity, decisionQualityUnderConstraints, riskAwareness, executionRealism]
    .filter(s => s === 'clear').length;
  const fragmentedCount = [hardSkillClarity, toolMethodMaturity, decisionQualityUnderConstraints, riskAwareness, executionRealism]
    .filter(s => s === 'fragmented').length;

  let overallReadiness: 'ready' | 'needs_clarification' | 'insufficient';
  if (clearCount >= 4) {
    overallReadiness = 'ready';
  } else if (fragmentedCount >= 3) {
    overallReadiness = 'insufficient';
  } else {
    overallReadiness = 'needs_clarification';
  }

  // === SUMMARY ===
  let summary: string;
  if (overallReadiness === 'ready') {
    summary = 'Strong Level 2 response demonstrating concrete hard skills and practical execution readiness. Consider proceeding to interview or Level 3.';
  } else if (overallReadiness === 'needs_clarification') {
    const weakAreas = [];
    if (hardSkillClarity === 'fragmented') weakAreas.push('technical approach');
    if (riskAwareness === 'fragmented') weakAreas.push('risk awareness');
    if (executionRealism === 'fragmented') weakAreas.push('execution planning');
    summary = `Solid foundation with areas that could benefit from clarification: ${weakAreas.join(', ') || 'some specifics'}. A follow-up question may help.`;
  } else {
    summary = 'Response shows potential but lacks concrete specificity. Consider targeted follow-up before proceeding.';
  }

  return {
    hardSkillClarity,
    hardSkillExplanation,
    toolMethodMaturity,
    toolMethodExplanation,
    decisionQualityUnderConstraints,
    decisionExplanation,
    riskAwareness,
    riskExplanation,
    executionRealism,
    executionExplanation,
    overallReadiness,
    summary,
    flags: [...new Set(flags)],
  };
}
