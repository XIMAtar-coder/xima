/**
 * Interprets XIMA signals into HR-readable decision insights.
 * Presentation-only - no logic changes to underlying signal computation.
 */

import type { SignalsPayload } from './computeSignals';

export interface DecisionInsights {
  decisionProfile: string;
  strengths: string[];
  risks: string[];
  roleFitHint: string;
}

/**
 * Generate a decision profile sentence based on dominant signal patterns.
 */
function getDecisionProfile(signals: SignalsPayload): string {
  const { framing, execution_bias, impact_thinking, decision_quality } = signals;
  
  // High framing + low execution: Strategic thinker
  if (framing >= 70 && execution_bias < 50) {
    return "Strong problem framing with cautious execution. Prioritizes clarity over speed.";
  }
  
  // High execution bias: Action-oriented
  if (execution_bias >= 70) {
    return "Action-oriented decision-maker with strong execution bias.";
  }
  
  // High impact thinking
  if (impact_thinking >= 70) {
    return "Consistently reasons in terms of outcomes and business impact.";
  }
  
  // High decision quality + framing: Analytical
  if (decision_quality >= 70 && framing >= 60) {
    return "Analytical thinker who carefully weighs trade-offs before deciding.";
  }
  
  // Balanced profile
  if (framing >= 50 && execution_bias >= 50 && impact_thinking >= 50) {
    return "Well-rounded decision-maker with balanced strategic and execution capabilities.";
  }
  
  // Low scores overall
  if (signals.overall < 50) {
    return "Shows potential but may benefit from more structured decision-making frameworks.";
  }
  
  // Default
  return "Demonstrates a pragmatic approach to problem-solving.";
}

/**
 * Extract strengths from signals and flags.
 */
function getStrengths(signals: SignalsPayload): string[] {
  const strengths: string[] = [];
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // From flags
  if (flags.includes('clear_tradeoffs')) {
    strengths.push("Clearly articulates trade-offs");
  }
  if (flags.includes('bias_to_action')) {
    strengths.push("Strong bias to action");
  }
  if (flags.includes('structured_approach')) {
    strengths.push("Uses structured problem-solving approach");
  }
  
  // From numeric signals
  if (framing >= 70 && strengths.length < 2) {
    strengths.push("Excellent at framing problems and constraints");
  }
  if (impact_thinking >= 70 && strengths.length < 2) {
    strengths.push("Strong focus on business outcomes");
  }
  if (execution_bias >= 70 && strengths.length < 2) {
    strengths.push("Quickly moves from planning to action");
  }
  if (decision_quality >= 70 && strengths.length < 2) {
    strengths.push("Makes well-reasoned decisions");
  }
  
  // Fallback
  if (strengths.length === 0 && signals.overall >= 50) {
    strengths.push("Shows solid foundational decision-making skills");
  }
  
  return strengths.slice(0, 2);
}

/**
 * Extract risks from signals and flags.
 */
function getRisks(signals: SignalsPayload): string[] {
  const risks: string[] = [];
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // From flags
  if (flags.includes('no_metrics')) {
    risks.push("Limited use of concrete metrics");
  }
  if (flags.includes('vague_assumptions')) {
    risks.push("Assumptions could be more explicit");
  }
  if (flags.includes('missing_constraints')) {
    risks.push("May overlook key constraints");
  }
  
  // From numeric signals
  if (execution_bias < 40 && risks.length < 2) {
    risks.push("May hesitate under time pressure");
  }
  if (framing < 40 && risks.length < 2) {
    risks.push("Problem framing could be sharper");
  }
  if (impact_thinking < 40 && risks.length < 2) {
    risks.push("Could strengthen focus on business outcomes");
  }
  if (decision_quality < 40 && risks.length < 2) {
    risks.push("Trade-off analysis may need development");
  }
  
  return risks.slice(0, 2);
}

/**
 * Generate role fit hint based on signal profile.
 */
function getRoleFitHint(signals: SignalsPayload): string {
  const { framing, execution_bias, impact_thinking, decision_quality } = signals;
  
  // High framing + impact, low execution: Strategy roles
  if (framing >= 65 && impact_thinking >= 65 && execution_bias < 55) {
    return "Best suited for strategy, leadership, and complex stakeholder environments.";
  }
  
  // High execution + decision quality: Fast-paced execution roles
  if (execution_bias >= 65 && decision_quality >= 60) {
    return "Well suited for high-velocity execution and ownership-heavy roles.";
  }
  
  // High framing + execution: PM/ops roles
  if (framing >= 60 && execution_bias >= 60) {
    return "Good fit for product management, operations, or project leadership roles.";
  }
  
  // High impact + decision quality: Business roles
  if (impact_thinking >= 65 && decision_quality >= 60) {
    return "Strong fit for business development, consulting, or commercial roles.";
  }
  
  // Balanced high performer
  if (signals.overall >= 70) {
    return "Versatile profile suited for cross-functional or generalist roles.";
  }
  
  // Developing candidate
  if (signals.overall >= 50) {
    return "Could thrive in supportive, structured team environments with mentorship.";
  }
  
  return "May benefit from additional skills development before advanced roles.";
}

/**
 * Main function to interpret signals into HR-readable insights.
 */
export function interpretSignals(signals: SignalsPayload): DecisionInsights {
  return {
    decisionProfile: getDecisionProfile(signals),
    strengths: getStrengths(signals),
    risks: getRisks(signals),
    roleFitHint: getRoleFitHint(signals),
  };
}

/**
 * Tooltip descriptions for each signal dimension.
 */
export const signalTooltips = {
  framing: "How clearly the candidate identifies the real problem and constraints.",
  decision_quality: "How well trade-offs and choices are reasoned.",
  execution_bias: "Tendency to move from thinking to action.",
  impact_thinking: "Focus on outcomes and business results.",
  overall: "Combined assessment of decision-making capability.",
  confidence: "Model's confidence in the signal assessment.",
};
