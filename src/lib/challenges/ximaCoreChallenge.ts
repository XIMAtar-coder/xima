/**
 * XIMA Core Challenge - Level 1 Default Template
 * 
 * Structure and questions are identical for all companies.
 * Only the scenario is AI-generated based on company context.
 */

export const XIMA_CORE_CHALLENGE = {
  title: 'XIMA Core Challenge',
  level: 1,
  timeEstimateMinutes: 40,
  
  intro: `This challenge explores how you approach decisions in complex, ambiguous situations. There are no right or wrong answers. We care about your reasoning.`,
  
  scenarioTemplate: `You join a team working on an important initiative. The goal is clear, but progress is slow. Stakeholders have different expectations, priorities conflict, and no one fully owns the outcome. You have no formal authority, but the deadline is approaching.`,
  
  questions: [
    {
      id: 'decision_making',
      label: 'Decision Making',
      prompt: 'What is the very first concrete action you would take in this situation? Why?',
      required: true,
    },
    {
      id: 'agency_ownership',
      label: 'Agency & Ownership',
      prompt: 'Even without formal ownership, what do you consider your responsibility here? Where do you draw the line?',
      required: true,
    },
    {
      id: 'ambiguity_structure',
      label: 'Ambiguity & Structure',
      prompt: 'What information would you try to clarify first? What would you explicitly not try to solve immediately?',
      required: true,
    },
    {
      id: 'impact_priorities',
      label: 'Impact & Priorities',
      prompt: 'If you could improve only one thing in the next two weeks, what would it be? How would you evaluate success?',
      required: true,
    },
    {
      id: 'collaboration_communication',
      label: 'Collaboration & Communication',
      prompt: 'How would you communicate your approach to the team? What reactions would you expect, and how would you handle them?',
      required: true,
    },
  ],
  
  rubric: {
    criteria: {
      framing: 1,
      decision_quality: 1,
      execution_bias: 1,
      impact_thinking: 1,
    },
  },
} as const;

export interface XimaCoreScenarioContext {
  // Company context (from company_profiles or business_profiles)
  companyIndustry?: string;
  companySize?: string;
  companyMaturity?: string;
  decisionStyle?: string;
  
  // Hiring goal context
  roleTitle?: string;
  functionArea?: string;
  experienceLevel?: string;
  taskDescription?: string;
}

export function buildScenarioPrompt(context: XimaCoreScenarioContext): string {
  const contextParts: string[] = [];
  
  if (context.companyIndustry) {
    contextParts.push(`Industry: ${context.companyIndustry}`);
  }
  if (context.companySize) {
    contextParts.push(`Company size: ${context.companySize}`);
  }
  if (context.companyMaturity) {
    contextParts.push(`Organizational maturity: ${context.companyMaturity}`);
  }
  if (context.decisionStyle) {
    contextParts.push(`Decision-making style: ${context.decisionStyle}`);
  }
  if (context.roleTitle) {
    contextParts.push(`Role being hired: ${context.roleTitle}`);
  }
  if (context.functionArea) {
    contextParts.push(`Function area: ${context.functionArea}`);
  }
  if (context.experienceLevel) {
    contextParts.push(`Experience level: ${context.experienceLevel}`);
  }
  
  return contextParts.join('\n');
}

export type XimaCoreQuestion = typeof XIMA_CORE_CHALLENGE.questions[number];
