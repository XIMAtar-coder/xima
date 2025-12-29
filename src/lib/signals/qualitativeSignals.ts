/**
 * XIMA Qualitative Signals - Human-readable signal interpretation
 * Descriptive, not evaluative. Patterns, not scores.
 */

import type { SignalsPayload } from './computeSignals';

export interface QualitativeSignal {
  id: string;
  label: string;
  interpretation: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface QualitativeSignalsPayload {
  signals: QualitativeSignal[];
  contextualSummary: string;
  observedTradeoffs: string[];
}

/**
 * Determine confidence level based on answer richness
 */
function deriveSignalConfidence(score: number, flags: string[]): 'low' | 'medium' | 'high' {
  // Check for weak content flags
  const weakFlags = ['weak_assumptions', 'short_approach', 'vague_actions', 'no_actions', 'vague_language'];
  const weakCount = weakFlags.filter(f => flags.includes(f)).length;
  
  if (weakCount >= 2 || score < 40) return 'low';
  if (weakCount >= 1 || score < 60) return 'medium';
  return 'high';
}

/**
 * Get interpretation for Decision Framing signal
 */
function getDecisionFramingInterpretation(score: number, flags: string[]): string {
  if (score >= 70) {
    return "Structures problems with clear constraints and assumptions before diving into solutions.";
  }
  if (score >= 50) {
    return "Identifies key elements of the problem space, though some assumptions remain implicit.";
  }
  return "Tends to move toward solutions quickly, with less emphasis on upfront structuring.";
}

/**
 * Get interpretation for Agency & Ownership signal
 */
function getAgencyInterpretation(score: number, flags: string[]): string {
  if (flags.includes('bias_to_action') || score >= 70) {
    return "Demonstrates a strong sense of initiative and personal accountability in responses.";
  }
  if (score >= 50) {
    return "Shows willingness to take ownership, with measured approach to commitments.";
  }
  return "May prefer collaborative or delegated ownership structures.";
}

/**
 * Get interpretation for Ambiguity Handling signal
 */
function getAmbiguityInterpretation(score: number, flags: string[]): string {
  if (flags.includes('clear_tradeoffs') && score >= 60) {
    return "Comfortable navigating uncertainty; builds hypotheses when information is incomplete.";
  }
  if (score >= 50) {
    return "Can work with ambiguity but may seek additional context before acting.";
  }
  if (flags.includes('vague_language')) {
    return "Shows some hesitation when faced with incomplete information.";
  }
  return "May benefit from clearer guidance in ambiguous situations.";
}

/**
 * Get interpretation for Impact Orientation signal
 */
function getImpactInterpretation(score: number, flags: string[]): string {
  if (flags.includes('uses_metrics') && score >= 70) {
    return "Naturally grounds work in measurable outcomes and business results.";
  }
  if (score >= 55) {
    return "Connects decisions to outcomes, though quantification may be implicit.";
  }
  if (flags.includes('no_metrics')) {
    return "Focuses on tasks and activities; outcome framing could be strengthened.";
  }
  return "Task-oriented approach; may benefit from explicit outcome framing.";
}

/**
 * Get interpretation for Communication Clarity signal
 */
function getCommunicationInterpretation(score: number, flags: string[]): string {
  const avgScore = score; // Using decision_quality as proxy for clarity
  
  if (avgScore >= 70) {
    return "Communicates with clear structure and logical flow in written responses.";
  }
  if (avgScore >= 50) {
    return "Ideas are understandable, though structure could be more explicit.";
  }
  if (flags.includes('short_approach')) {
    return "Responses are concise; additional context might improve clarity.";
  }
  return "Communication style tends toward brevity over elaboration.";
}

/**
 * Generate contextual summary paragraph
 */
function generateContextualSummary(signals: SignalsPayload): string {
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // Identify dominant pattern
  const patterns: string[] = [];
  
  if (framing >= 65 && execution_bias >= 65) {
    patterns.push("balances structured thinking with practical momentum");
  } else if (framing >= 70) {
    patterns.push("invests time in understanding problems before acting");
  } else if (execution_bias >= 70) {
    patterns.push("leans toward decisive action over extended deliberation");
  }
  
  if (impact_thinking >= 65) {
    patterns.push("naturally connects work to outcomes");
  }
  
  if (decision_quality >= 70) {
    patterns.push("reasons carefully through trade-offs");
  }
  
  if (patterns.length === 0) {
    if (signals.overall >= 55) {
      return "Based on this response, the candidate demonstrates a pragmatic approach to problem-solving with room for growth in specific areas.";
    }
    return "Based on this response, the candidate shows developing decision-making patterns. Additional context may help clarify their approach.";
  }
  
  return `Based on this response, the candidate tends to ${patterns.join(' and ')}.`;
}

/**
 * Extract observed tradeoffs from the response
 */
function extractObservedTradeoffs(signals: SignalsPayload): string[] {
  const tradeoffs: string[] = [];
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  // Speed vs. thoroughness
  if (execution_bias > framing + 15) {
    tradeoffs.push("Prioritized speed over extensive deliberation");
  } else if (framing > execution_bias + 15) {
    tradeoffs.push("Prioritized thorough framing over rapid action");
  }
  
  // Structure vs. flexibility
  if (flags.includes('clear_tradeoffs') && framing >= 60) {
    tradeoffs.push("Favored structured reasoning with explicit constraints");
  }
  
  // Action vs. certainty
  if (flags.includes('bias_to_action') && signals.confidence === 'high') {
    tradeoffs.push("Willing to act with incomplete information");
  }
  
  // Impact vs. process
  if (impact_thinking > decision_quality + 10) {
    tradeoffs.push("Focused on outcomes over detailed process steps");
  }
  
  // If no tradeoffs detected
  if (tradeoffs.length === 0 && signals.overall >= 50) {
    tradeoffs.push("Demonstrated balanced consideration across dimensions");
  }
  
  return tradeoffs.slice(0, 3);
}

/**
 * Main function to compute qualitative signals from raw signals
 */
export function computeQualitativeSignals(signals: SignalsPayload): QualitativeSignalsPayload {
  const { framing, execution_bias, impact_thinking, decision_quality, flags } = signals;
  
  const qualitativeSignals: QualitativeSignal[] = [
    {
      id: 'decision_framing',
      label: 'signals.decision_framing',
      interpretation: getDecisionFramingInterpretation(framing, flags),
      confidence: deriveSignalConfidence(framing, flags),
    },
    {
      id: 'agency_ownership',
      label: 'signals.agency_ownership',
      interpretation: getAgencyInterpretation(execution_bias, flags),
      confidence: deriveSignalConfidence(execution_bias, flags),
    },
    {
      id: 'ambiguity_handling',
      label: 'signals.ambiguity_handling',
      interpretation: getAmbiguityInterpretation((framing + decision_quality) / 2, flags),
      confidence: deriveSignalConfidence((framing + decision_quality) / 2, flags),
    },
    {
      id: 'impact_orientation',
      label: 'signals.impact_orientation',
      interpretation: getImpactInterpretation(impact_thinking, flags),
      confidence: deriveSignalConfidence(impact_thinking, flags),
    },
    {
      id: 'communication_clarity',
      label: 'signals.communication_clarity',
      interpretation: getCommunicationInterpretation(decision_quality, flags),
      confidence: deriveSignalConfidence(decision_quality, flags),
    },
  ];
  
  return {
    signals: qualitativeSignals,
    contextualSummary: generateContextualSummary(signals),
    observedTradeoffs: extractObservedTradeoffs(signals),
  };
}

/**
 * Get candidate-facing interpretation (reframed for self-reflection)
 */
export function getCandidateReflectionSignals(signals: SignalsPayload): QualitativeSignalsPayload {
  const base = computeQualitativeSignals(signals);
  
  // Reframe for candidate perspective
  const candidateSignals: QualitativeSignal[] = base.signals.map(signal => ({
    ...signal,
    interpretation: reframeToCandidatePerspective(signal.id, signal.interpretation),
  }));
  
  return {
    ...base,
    signals: candidateSignals,
    contextualSummary: reframeSummaryForCandidate(base.contextualSummary),
  };
}

function reframeToCandidatePerspective(signalId: string, interpretation: string): string {
  // Slight reframing to be more reflective/personal
  const reframings: Record<string, (text: string) => string> = {
    decision_framing: (text) => text.replace('Structures problems', 'Your response shows you tend to structure problems'),
    agency_ownership: (text) => text.replace('Demonstrates', 'Your approach demonstrates'),
    ambiguity_handling: (text) => text.replace('Comfortable navigating', 'You seem comfortable navigating'),
    impact_orientation: (text) => text.replace('Naturally grounds', 'You naturally ground'),
    communication_clarity: (text) => text.replace('Communicates with', 'Your response shows'),
  };
  
  const reframe = reframings[signalId];
  return reframe ? reframe(interpretation) : interpretation;
}

function reframeSummaryForCandidate(summary: string): string {
  return summary
    .replace('the candidate tends to', 'your response suggests you tend to')
    .replace('the candidate demonstrates', 'this reveals that you')
    .replace('the candidate shows', 'your approach shows');
}
