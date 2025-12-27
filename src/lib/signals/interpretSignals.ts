/**
 * Interprets XIMA signals into HR-readable decision insights.
 * Presentation-only - no logic changes to underlying signal computation.
 * Enhanced with company context awareness for more relevant insights.
 */

import type { SignalsPayload } from './computeSignals';

export interface CompanyContext {
  industry?: string;
  size?: string;
  maturity?: string;
  roleTitle?: string;
  functionArea?: string;
  workModel?: string;
}

export interface DecisionInsights {
  decisionProfile: string;
  strengths: string[];
  risks: string[];
  roleFitHint: string;
}

/**
 * Generate a context-aware decision profile sentence based on dominant signal patterns.
 */
function getDecisionProfile(signals: SignalsPayload, context?: CompanyContext): string {
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // Context-aware prefixes
  const contextPrefix = context?.industry || context?.maturity 
    ? "In this environment, " 
    : "";

  // High framing + high execution: Balanced operator
  if (framing >= 65 && execution_bias >= 65) {
    return `${contextPrefix}the candidate tends to frame problems clearly while maintaining strong execution momentum. They balance strategic thinking with practical action.`;
  }
  
  // High framing + low execution: Strategic thinker
  if (framing >= 70 && execution_bias < 50) {
    return `${contextPrefix}the candidate prioritizes clarity and structure before acting. They invest in understanding the problem space before committing to solutions.`;
  }
  
  // High execution bias: Action-oriented
  if (execution_bias >= 70) {
    const biasToAction = flags.includes('bias_to_action') 
      ? "with clear ownership signals" 
      : "";
    return `${contextPrefix}the candidate demonstrates a strong bias toward action ${biasToAction}. They prefer momentum over extended deliberation.`;
  }
  
  // High impact thinking + decision quality: Business-minded
  if (impact_thinking >= 70 && decision_quality >= 65) {
    return `${contextPrefix}the candidate consistently reasons in terms of outcomes and business impact. They connect decisions to measurable results.`;
  }
  
  // High decision quality + framing: Analytical
  if (decision_quality >= 70 && framing >= 60) {
    return `${contextPrefix}the candidate approaches problems analytically, weighing trade-offs and alternatives before deciding. They value thoroughness over speed.`;
  }
  
  // Balanced profile (all above 50)
  if (framing >= 50 && execution_bias >= 50 && impact_thinking >= 50 && decision_quality >= 50) {
    return `${contextPrefix}the candidate shows a well-rounded decision-making style with balanced strategic and execution capabilities. Adaptable to different contexts.`;
  }
  
  // Low overall but some signals
  if (signals.overall >= 40 && signals.overall < 55) {
    return `${contextPrefix}the candidate shows developing decision-making patterns. May benefit from structured environments with clear guidance.`;
  }
  
  // Low scores overall
  if (signals.overall < 40) {
    return `${contextPrefix}the candidate may benefit from additional support in structured decision-making. Consider evaluating in more defined contexts.`;
  }
  
  // Default
  return `${contextPrefix}the candidate demonstrates a pragmatic approach to problem-solving with room for growth in specific areas.`;
}

/**
 * Extract context-aware strengths from signals and flags.
 */
function getStrengths(signals: SignalsPayload, context?: CompanyContext): string[] {
  const strengths: string[] = [];
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // From flags - most specific
  if (flags.includes('clear_tradeoffs')) {
    strengths.push("Articulates trade-offs clearly and transparently");
  }
  if (flags.includes('bias_to_action') && strengths.length < 2) {
    strengths.push("Takes ownership and drives toward action");
  }
  if (flags.includes('uses_metrics') && strengths.length < 2) {
    strengths.push("Grounds decisions in measurable outcomes");
  }
  
  // From numeric signals - context-aware phrasing
  if (framing >= 70 && strengths.length < 2) {
    strengths.push("Comfortable structuring ambiguity into clear problem frames");
  }
  if (impact_thinking >= 70 && strengths.length < 2) {
    strengths.push("Naturally connects work to business outcomes");
  }
  if (execution_bias >= 70 && strengths.length < 2) {
    strengths.push("Moves decisively from planning to execution");
  }
  if (decision_quality >= 70 && strengths.length < 2) {
    strengths.push("Demonstrates careful reasoning under uncertainty");
  }
  
  // Combined strength patterns
  if (framing >= 60 && execution_bias >= 60 && strengths.length < 2) {
    strengths.push("Balances strategic thinking with practical momentum");
  }
  
  // Fallback for solid performers
  if (strengths.length === 0 && signals.overall >= 55) {
    strengths.push("Shows solid foundational decision-making capabilities");
  }
  
  // Even lower fallback
  if (strengths.length === 0 && signals.overall >= 40) {
    strengths.push("Demonstrates willingness to engage with complex problems");
  }
  
  return strengths.slice(0, 2);
}

/**
 * Extract context-aware risks from signals and flags.
 * Framed as situational, not personal flaws.
 */
function getRisks(signals: SignalsPayload, context?: CompanyContext): string[] {
  const risks: string[] = [];
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // From flags - specific behavioral patterns
  if (flags.includes('no_metrics')) {
    risks.push("May under-invest in quantifying impact and outcomes");
  }
  if (flags.includes('vague_language') && risks.length < 2) {
    risks.push("Could be challenged when precise commitments are required");
  }
  if (flags.includes('weak_assumptions') && risks.length < 2) {
    risks.push("May struggle to surface hidden assumptions early");
  }
  if (flags.includes('no_tradeoff') && risks.length < 2) {
    risks.push("Could find it difficult to prioritize competing demands");
  }
  
  // From numeric signals - situational framing
  if (execution_bias < 40 && risks.length < 2) {
    risks.push("May hesitate in fast-moving, high-velocity environments");
  }
  if (framing < 40 && risks.length < 2) {
    risks.push("Could struggle when problems lack clear structure");
  }
  if (impact_thinking < 40 && risks.length < 2) {
    risks.push("May need support connecting work to business results");
  }
  if (decision_quality < 40 && risks.length < 2) {
    risks.push("Could benefit from frameworks for complex trade-offs");
  }
  
  // Confidence mismatch is a notable risk
  if (flags.includes('confidence_mismatch') && risks.length < 2) {
    risks.push("Self-assessment may not fully align with demonstrated capability");
  }
  
  return risks.slice(0, 2);
}

/**
 * Generate context-aware role fit hint based on signal profile.
 */
function getRoleFitHint(signals: SignalsPayload, context?: CompanyContext): string {
  const { framing, execution_bias, impact_thinking, decision_quality } = signals;
  
  // Add context specificity if available
  const workModelHint = context?.workModel === 'remote' 
    ? " in distributed settings" 
    : "";
  
  // High framing + impact, low execution: Strategy/leadership
  if (framing >= 65 && impact_thinking >= 65 && execution_bias < 55) {
    return `Likely to perform well in strategic, advisory, or complex stakeholder environments${workModelHint}.`;
  }
  
  // High execution + decision quality: Fast-paced execution
  if (execution_bias >= 65 && decision_quality >= 60) {
    return `Suited for high-velocity, ownership-heavy roles where speed matters${workModelHint}.`;
  }
  
  // High framing + execution: PM/ops/project
  if (framing >= 60 && execution_bias >= 60) {
    return `Good fit for product, operations, or project leadership positions${workModelHint}.`;
  }
  
  // High impact + decision quality: Commercial/consulting
  if (impact_thinking >= 65 && decision_quality >= 60) {
    return `Strong fit for commercial, consulting, or client-facing roles${workModelHint}.`;
  }
  
  // Balanced high performer
  if (signals.overall >= 70) {
    return `Versatile profile suited for cross-functional or generalist positions${workModelHint}.`;
  }
  
  // Solid performer
  if (signals.overall >= 55) {
    return `Could thrive in collaborative team settings with clear goals${workModelHint}.`;
  }
  
  // Developing candidate
  if (signals.overall >= 40) {
    return `May benefit from structured environments with mentorship and guidance.`;
  }
  
  return `Consider evaluating in more defined contexts before role matching.`;
}

/**
 * Main function to interpret signals into HR-readable insights.
 * Optionally accepts company context for more relevant interpretation.
 */
export function interpretSignals(signals: SignalsPayload, context?: CompanyContext): DecisionInsights {
  return {
    decisionProfile: getDecisionProfile(signals, context),
    strengths: getStrengths(signals, context),
    risks: getRisks(signals, context),
    roleFitHint: getRoleFitHint(signals, context),
  };
}

/**
 * Tooltip descriptions for each signal dimension.
 * Written in plain language for HR/recruiters.
 */
export const signalTooltips: Record<string, string> = {
  framing: "How clearly the candidate identifies the real problem and key constraints before diving into solutions.",
  decision_quality: "How well trade-offs and choices are reasoned through, with clear logic connecting decision to outcome.",
  execution_bias: "The candidate's tendency to move from thinking to action, and comfort with making decisions under uncertainty.",
  impact_thinking: "How naturally the candidate connects their work to business results and measurable outcomes.",
  overall: "A combined view of decision-making capability across all dimensions.",
  confidence: "Our model's confidence in the assessment based on response quality and completeness.",
};

/**
 * Flag tooltips - explain what each behavioral flag means.
 */
export const flagTooltips: Record<string, string> = {
  clear_tradeoffs: "Explicitly named trade-offs in their approach",
  bias_to_action: "Used decisive, action-oriented language",
  uses_metrics: "Referenced specific numbers or measurements",
  weak_assumptions: "Assumptions section was brief or missing",
  vague_language: "Used hedging words like 'maybe' or 'possibly'",
  no_metrics: "Did not reference measurable outcomes",
  no_tradeoff: "Did not identify a primary trade-off",
  short_approach: "Approach description was quite brief",
  vague_actions: "First actions lacked specificity",
  no_actions: "Did not specify concrete next steps",
  confidence_mismatch: "Stated confidence level differs from demonstrated content quality",
};