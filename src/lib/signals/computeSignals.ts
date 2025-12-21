/**
 * XIMA Signals MVP - Heuristic-based signal computation
 */

export interface SignalsPayload {
  framing: number;
  decision_quality: number;
  execution_bias: number;
  impact_thinking: number;
  overall: number;
  confidence: 'low' | 'medium' | 'high';
  flags: string[];
  summary: string;
}

interface SubmissionData {
  approach: string;
  assumptions: string;
  first_actions: string[];
  tradeoff_priority: string;
  confidence: string;
}

// Word count helpers
const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const hasNumbers = (text: string): boolean => /\d+/.test(text);
const hasMetrics = (text: string): boolean => /\d+\s*(%|percent|days?|weeks?|hours?|minutes?|€|\$|EUR|USD|units?|users?|customers?)/i.test(text);
const hasBulletPoints = (text: string): boolean => /^[-•*]|\d+\.|^\d+\)/m.test(text);
const hasNumberedSteps = (text: string): boolean => /^[1-9]\.|^\([1-9]\)|^step\s*[1-9]/im.test(text);

// Generic word patterns to penalize
const GENERIC_WORDS = ['maybe', 'possibly', 'might', 'could be', 'not sure', 'i think', 'perhaps', 'probably'];
const STRONG_ACTION_WORDS = ['will', 'must', 'need to', 'first', 'immediately', 'priority', 'focus on', 'ensure'];

export function computeSignals(submission: SubmissionData): SignalsPayload {
  const flags: string[] = [];
  
  const approach = submission.approach || '';
  const assumptions = submission.assumptions || '';
  const actions = (submission.first_actions || []).filter(a => a?.trim());
  const tradeoff = submission.tradeoff_priority || '';
  const candidateConfidence = submission.confidence || '';
  
  const allText = `${approach} ${assumptions} ${actions.join(' ')}`;
  
  // === FRAMING (0-100) ===
  // How well did the candidate frame the problem?
  let framing = 50;
  
  // Reward: explicit assumptions
  const assumptionWords = countWords(assumptions);
  if (assumptionWords > 30) framing += 15;
  else if (assumptionWords > 15) framing += 10;
  else if (assumptionWords > 5) framing += 5;
  else { framing -= 10; flags.push('weak_assumptions'); }
  
  // Reward: mentions constraints or limits
  if (/constraint|limit|budget|deadline|scope|risk/i.test(assumptions)) framing += 10;
  
  // Reward: structured assumptions
  if (hasBulletPoints(assumptions) || hasNumberedSteps(assumptions)) framing += 10;
  
  // Reward: clear tradeoff
  if (tradeoff) framing += 10;
  else { framing -= 10; flags.push('no_tradeoff'); }
  
  // === DECISION QUALITY (0-100) ===
  // Did the candidate articulate clear reasoning?
  let decision_quality = 50;
  
  const approachWords = countWords(approach);
  if (approachWords > 100) decision_quality += 20;
  else if (approachWords > 50) decision_quality += 15;
  else if (approachWords > 25) decision_quality += 10;
  else { decision_quality -= 15; flags.push('short_approach'); }
  
  // Reward: mentions because/why/reason
  if (/because|therefore|reason|since|given that|due to/i.test(approach)) decision_quality += 10;
  
  // Reward: mentions alternatives or comparisons
  if (/instead|rather than|alternative|option|compare|versus|vs\./i.test(approach)) decision_quality += 10;
  
  // Penalize generic wording
  const genericCount = GENERIC_WORDS.filter(w => allText.toLowerCase().includes(w)).length;
  if (genericCount > 2) { decision_quality -= 15; flags.push('vague_language'); }
  else if (genericCount > 0) decision_quality -= 5;
  
  // === EXECUTION BIAS (0-100) ===
  // Does the candidate show bias to action and concrete next steps?
  let execution_bias = 50;
  
  // Reward: 3 actions
  if (actions.length >= 3) execution_bias += 15;
  else if (actions.length >= 2) execution_bias += 10;
  else if (actions.length === 1) execution_bias += 5;
  else { execution_bias -= 20; flags.push('no_actions'); }
  
  // Reward: specific actions (not too short)
  const avgActionLength = actions.reduce((sum, a) => sum + countWords(a), 0) / Math.max(actions.length, 1);
  if (avgActionLength > 10) execution_bias += 15;
  else if (avgActionLength > 5) execution_bias += 10;
  else if (actions.length > 0) { execution_bias -= 5; flags.push('vague_actions'); }
  
  // Reward: strong action words
  const strongActionCount = STRONG_ACTION_WORDS.filter(w => allText.toLowerCase().includes(w)).length;
  if (strongActionCount >= 3) { execution_bias += 10; flags.push('bias_to_action'); }
  else if (strongActionCount >= 1) execution_bias += 5;
  
  // === IMPACT THINKING (0-100) ===
  // Does the candidate think about measurable outcomes?
  let impact_thinking = 50;
  
  // Reward: metrics/numbers
  if (hasMetrics(allText)) { impact_thinking += 20; flags.push('uses_metrics'); }
  else if (hasNumbers(allText)) impact_thinking += 10;
  else { impact_thinking -= 10; flags.push('no_metrics'); }
  
  // Reward: mentions outcomes/results/impact
  if (/outcome|result|impact|success|achieve|deliver|measure|kpi|goal|target/i.test(allText)) impact_thinking += 15;
  
  // Reward: mentions stakeholders/customers/team
  if (/stakeholder|customer|user|client|team|manager|ceo|leadership/i.test(allText)) impact_thinking += 10;
  
  // === CONFIDENCE DERIVATION ===
  // Based on candidate's stated confidence + content strength
  let confidenceScore = 0;
  if (candidateConfidence === 'high') confidenceScore += 40;
  else if (candidateConfidence === 'medium') confidenceScore += 25;
  else if (candidateConfidence === 'low') confidenceScore += 10;
  
  // Content strength bonus
  const contentStrength = (framing + decision_quality + execution_bias + impact_thinking) / 4;
  confidenceScore += Math.round(contentStrength * 0.6);
  
  let derivedConfidence: 'low' | 'medium' | 'high';
  if (confidenceScore >= 75) derivedConfidence = 'high';
  else if (confidenceScore >= 50) derivedConfidence = 'medium';
  else derivedConfidence = 'low';
  
  // If candidate says high but content is weak, or vice versa
  if (candidateConfidence === 'high' && contentStrength < 50) {
    flags.push('confidence_mismatch');
  }
  if (tradeoff) flags.push('clear_tradeoffs');
  
  // === CLAMP SCORES ===
  framing = Math.max(0, Math.min(100, framing));
  decision_quality = Math.max(0, Math.min(100, decision_quality));
  execution_bias = Math.max(0, Math.min(100, execution_bias));
  impact_thinking = Math.max(0, Math.min(100, impact_thinking));
  
  // === OVERALL ===
  const overall = Math.round(
    framing * 0.25 +
    decision_quality * 0.25 +
    execution_bias * 0.25 +
    impact_thinking * 0.25
  );
  
  // === SUMMARY ===
  const topStrength = 
    framing >= decision_quality && framing >= execution_bias && framing >= impact_thinking ? 'problem framing' :
    decision_quality >= execution_bias && decision_quality >= impact_thinking ? 'decision reasoning' :
    execution_bias >= impact_thinking ? 'execution planning' : 'impact orientation';
  
  const lowestScore = Math.min(framing, decision_quality, execution_bias, impact_thinking);
  const weakArea = 
    framing === lowestScore ? 'problem framing' :
    decision_quality === lowestScore ? 'decision clarity' :
    execution_bias === lowestScore ? 'action planning' : 'outcome thinking';
  
  let summary: string;
  if (overall >= 75) {
    summary = `Strong candidate with excellent ${topStrength}. Well-structured response with clear reasoning.`;
  } else if (overall >= 55) {
    summary = `Solid response demonstrating good ${topStrength}. Could improve on ${weakArea}.`;
  } else {
    summary = `Response shows potential but needs improvement in ${weakArea}. Consider follow-up questions.`;
  }
  
  return {
    framing,
    decision_quality,
    execution_bias,
    impact_thinking,
    overall,
    confidence: derivedConfidence,
    flags: [...new Set(flags)], // dedupe
    summary,
  };
}
