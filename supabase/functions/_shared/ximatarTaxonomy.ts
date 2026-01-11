/**
 * Canonical XIMAtar Taxonomy for Edge Functions
 * 
 * This is a copy of src/lib/ximatarTaxonomy.ts for Deno edge functions.
 * Both files must stay in sync - update both when making changes.
 */

export interface XimatarPillars {
  drive: number;
  comp_power: number;
  communication: number;
  creativity: number;
  knowledge: number;
}

export interface XimatarProfile {
  id: string;
  name: string;
  title: string;
  pillars: XimatarPillars;
  tags: string[];
  skills: string[];
  industries: string[];
  keywords: string[];
  seniorityRange: { min: number; max: number };
  idealRoles: string[];
}

export const XIMATAR_PROFILES: Record<string, XimatarProfile> = {
  lion: {
    id: 'lion',
    name: 'Lion',
    title: 'The Executive Leader',
    pillars: { drive: 90, comp_power: 60, communication: 70, creativity: 55, knowledge: 55 },
    tags: ['leadership', 'executive', 'strategic', 'decisive', 'authoritative'],
    skills: ['strategic-planning', 'decision-making', 'team-leadership', 'vision-setting', 'stakeholder-management'],
    industries: ['consulting', 'finance', 'corporate', 'enterprise', 'startups'],
    keywords: ['CEO', 'director', 'executive', 'leadership', 'management', 'strategy', 'growth', 'vision', 'authority', 'command'],
    seniorityRange: { min: 4, max: 5 },
    idealRoles: ['CEO', 'Managing Director', 'Executive Director', 'General Manager', 'VP Operations']
  },
  owl: {
    id: 'owl',
    name: 'Owl',
    title: 'The Analytical Thinker',
    pillars: { drive: 55, comp_power: 85, communication: 60, creativity: 55, knowledge: 75 },
    tags: ['analytical', 'research', 'data-driven', 'methodical', 'insightful'],
    skills: ['data-analysis', 'research', 'pattern-recognition', 'critical-thinking', 'documentation'],
    industries: ['technology', 'research', 'finance', 'pharma', 'academia'],
    keywords: ['data', 'analysis', 'research', 'insight', 'metrics', 'KPI', 'intelligence', 'analytics', 'evidence', 'scientific'],
    seniorityRange: { min: 2, max: 4 },
    idealRoles: ['Data Scientist', 'Research Analyst', 'Business Analyst', 'Strategic Planner', 'Risk Analyst']
  },
  dolphin: {
    id: 'dolphin',
    name: 'Dolphin',
    title: 'The Team Facilitator',
    pillars: { drive: 60, comp_power: 55, communication: 85, creativity: 60, knowledge: 60 },
    tags: ['collaborative', 'empathetic', 'team-player', 'harmonious', 'supportive'],
    skills: ['team-building', 'conflict-resolution', 'facilitation', 'active-listening', 'emotional-intelligence'],
    industries: ['HR', 'education', 'healthcare', 'non-profit', 'hospitality'],
    keywords: ['team', 'collaboration', 'culture', 'people', 'wellness', 'support', 'harmony', 'community', 'relationships', 'empathy'],
    seniorityRange: { min: 2, max: 4 },
    idealRoles: ['HR Manager', 'Team Lead', 'Community Manager', 'Customer Success', 'Facilitator']
  },
  fox: {
    id: 'fox',
    name: 'Fox',
    title: 'The Strategic Opportunist',
    pillars: { drive: 65, comp_power: 60, communication: 75, creativity: 85, knowledge: 55 },
    tags: ['opportunistic', 'clever', 'adaptive', 'resourceful', 'persuasive'],
    skills: ['negotiation', 'opportunity-identification', 'networking', 'adaptability', 'creative-solutions'],
    industries: ['sales', 'business-development', 'marketing', 'startups', 'venture-capital'],
    keywords: ['opportunity', 'deal', 'growth', 'partnership', 'networking', 'pitch', 'close', 'revenue', 'client', 'acquisition'],
    seniorityRange: { min: 2, max: 4 },
    idealRoles: ['Business Development', 'Sales Manager', 'Account Executive', 'Partnerships Lead', 'Growth Manager']
  },
  bear: {
    id: 'bear',
    name: 'Bear',
    title: 'The Grounded Protector',
    pillars: { drive: 60, comp_power: 65, communication: 55, creativity: 50, knowledge: 85 },
    tags: ['reliable', 'protective', 'stable', 'patient', 'grounded'],
    skills: ['risk-management', 'compliance', 'quality-assurance', 'process-management', 'governance'],
    industries: ['finance', 'legal', 'insurance', 'government', 'manufacturing'],
    keywords: ['compliance', 'risk', 'security', 'governance', 'quality', 'safety', 'standards', 'protection', 'stability', 'reliability'],
    seniorityRange: { min: 3, max: 5 },
    idealRoles: ['Compliance Officer', 'Risk Manager', 'QA Lead', 'Operations Manager', 'Security Director']
  },
  bee: {
    id: 'bee',
    name: 'Bee',
    title: 'The Purposeful Contributor',
    pillars: { drive: 85, comp_power: 80, communication: 55, creativity: 50, knowledge: 60 },
    tags: ['diligent', 'structured', 'process-oriented', 'disciplined', 'team-contributor'],
    skills: ['process-optimization', 'task-management', 'coordination', 'attention-to-detail', 'consistency'],
    industries: ['operations', 'logistics', 'manufacturing', 'admin', 'customer-service'],
    keywords: ['process', 'efficiency', 'operations', 'execution', 'coordination', 'delivery', 'workflow', 'productivity', 'system', 'routine'],
    seniorityRange: { min: 1, max: 3 },
    idealRoles: ['Operations Coordinator', 'Project Coordinator', 'Administrative Lead', 'Process Manager', 'Customer Success']
  },
  wolf: {
    id: 'wolf',
    name: 'Wolf',
    title: 'The Pack Strategist',
    pillars: { drive: 80, comp_power: 60, communication: 70, creativity: 55, knowledge: 55 },
    tags: ['team-oriented', 'loyal', 'strategic', 'protective', 'driven'],
    skills: ['team-coordination', 'strategic-execution', 'mentoring', 'goal-alignment', 'cross-functional-leadership'],
    industries: ['sales', 'sports', 'military', 'consulting', 'startups'],
    keywords: ['team', 'pack', 'strategy', 'execution', 'loyalty', 'goals', 'performance', 'hunt', 'achieve', 'win'],
    seniorityRange: { min: 3, max: 5 },
    idealRoles: ['Team Lead', 'Sales Director', 'Project Manager', 'Department Head', 'Coach']
  },
  cat: {
    id: 'cat',
    name: 'Cat',
    title: 'The Independent Specialist',
    pillars: { drive: 55, comp_power: 85, communication: 55, creativity: 80, knowledge: 60 },
    tags: ['independent', 'precise', 'focused', 'specialist', 'autonomous'],
    skills: ['deep-expertise', 'independent-work', 'precision', 'technical-mastery', 'problem-solving'],
    industries: ['technology', 'engineering', 'design', 'research', 'consulting'],
    keywords: ['expert', 'specialist', 'independent', 'technical', 'precision', 'focus', 'craft', 'mastery', 'autonomous', 'deep-work'],
    seniorityRange: { min: 2, max: 4 },
    idealRoles: ['Senior Engineer', 'Technical Specialist', 'Architect', 'Independent Consultant', 'R&D Specialist']
  },
  parrot: {
    id: 'parrot',
    name: 'Parrot',
    title: 'The Charismatic Communicator',
    pillars: { drive: 60, comp_power: 55, communication: 90, creativity: 70, knowledge: 55 },
    tags: ['communicative', 'expressive', 'social', 'charismatic', 'storyteller'],
    skills: ['public-speaking', 'storytelling', 'brand-communication', 'content-creation', 'social-engagement'],
    industries: ['marketing', 'media', 'PR', 'entertainment', 'education'],
    keywords: ['communication', 'story', 'brand', 'message', 'audience', 'engagement', 'content', 'presentation', 'influence', 'voice'],
    seniorityRange: { min: 2, max: 4 },
    idealRoles: ['Marketing Manager', 'Communications Lead', 'Brand Manager', 'Content Director', 'Public Relations']
  },
  elephant: {
    id: 'elephant',
    name: 'Elephant',
    title: 'The Wise Mentor',
    pillars: { drive: 55, comp_power: 65, communication: 60, creativity: 55, knowledge: 90 },
    tags: ['wise', 'experienced', 'mentoring', 'institutional-memory', 'patient'],
    skills: ['mentoring', 'knowledge-transfer', 'institutional-knowledge', 'long-term-planning', 'wisdom-sharing'],
    industries: ['education', 'consulting', 'legal', 'government', 'healthcare'],
    keywords: ['experience', 'wisdom', 'mentor', 'knowledge', 'legacy', 'tradition', 'history', 'guidance', 'learning', 'teaching'],
    seniorityRange: { min: 4, max: 5 },
    idealRoles: ['Senior Advisor', 'Mentor', 'Principal', 'Senior Partner', 'Chief Knowledge Officer']
  },
  horse: {
    id: 'horse',
    name: 'Horse',
    title: 'The Relentless Performer',
    pillars: { drive: 80, comp_power: 65, communication: 60, creativity: 55, knowledge: 60 },
    tags: ['hardworking', 'reliable', 'enduring', 'consistent', 'performance-driven'],
    skills: ['sustained-performance', 'endurance', 'consistency', 'goal-achievement', 'work-ethic'],
    industries: ['sales', 'athletics', 'logistics', 'manufacturing', 'agriculture'],
    keywords: ['performance', 'work', 'endurance', 'consistent', 'reliable', 'achieve', 'effort', 'stamina', 'deliver', 'results'],
    seniorityRange: { min: 1, max: 4 },
    idealRoles: ['Sales Representative', 'Production Manager', 'Field Operations', 'Delivery Lead', 'Performance Coach']
  },
  chameleon: {
    id: 'chameleon',
    name: 'Chameleon',
    title: 'The Adaptive Generalist',
    pillars: { drive: 65, comp_power: 65, communication: 65, creativity: 65, knowledge: 65 },
    tags: ['adaptive', 'versatile', 'flexible', 'balanced', 'multi-skilled'],
    skills: ['adaptability', 'versatility', 'context-switching', 'learning-agility', 'cross-functional'],
    industries: ['startups', 'consulting', 'agencies', 'general-management', 'project-based'],
    keywords: ['flexible', 'adapt', 'versatile', 'change', 'agile', 'multi', 'generalist', 'dynamic', 'pivot', 'evolve'],
    seniorityRange: { min: 2, max: 4 },
    idealRoles: ['Product Manager', 'Chief of Staff', 'General Manager', 'Startup Founder', 'Consultant']
  }
};

export const XIMATAR_IDS = Object.keys(XIMATAR_PROFILES);

export const XIMATAR_PILLAR_VECTORS: Record<string, XimatarPillars> = Object.fromEntries(
  Object.entries(XIMATAR_PROFILES).map(([id, profile]) => [id, profile.pillars])
);

export function computePillarDistance(a: XimatarPillars, b: XimatarPillars): number {
  return Math.sqrt(
    (a.drive - b.drive) ** 2 +
    (a.comp_power - b.comp_power) ** 2 +
    (a.communication - b.communication) ** 2 +
    (a.creativity - b.creativity) ** 2 +
    (a.knowledge - b.knowledge) ** 2
  );
}

export const NEUTRAL_PILLARS: XimatarPillars = {
  drive: 50, comp_power: 50, communication: 50, creativity: 50, knowledge: 50
};

export function computePillarsFromText(text: string): XimatarPillars {
  const txt = text.toLowerCase();
  const score = (cond: boolean, base = 50, inc = 15) => 
    Math.max(0, Math.min(100, base + (cond ? inc : 0)));
  
  return {
    drive: score(/fast|ambitious|growth|performance|drive|execution|scale|agile|rapid/.test(txt), 55, 20),
    comp_power: score(/data|analysis|engineering|ai|software|ops|process|technical|algorithm|automation/.test(txt), 50, 20),
    communication: score(/communication|team|collaboration|marketing|brand|story|community|culture/.test(txt), 50, 20),
    creativity: score(/innovation|design|creative|explore|experiment|art|disrupt|novel|original/.test(txt), 50, 20),
    knowledge: score(/expertise|quality|research|learning|safety|compliance|standard|precision|accuracy/.test(txt), 55, 15),
  };
}

export function rankXimatarsByDistance(targetVector: XimatarPillars): Array<{
  id: string;
  distance: number;
  profile: XimatarProfile;
}> {
  return Object.entries(XIMATAR_PROFILES)
    .map(([id, profile]) => ({
      id,
      distance: computePillarDistance(targetVector, profile.pillars),
      profile
    }))
    .sort((a, b) => a.distance - b.distance);
}

export function getTopXimatars(targetVector: XimatarPillars, count = 3): string[] {
  return rankXimatarsByDistance(targetVector)
    .slice(0, count)
    .map(x => x.id);
}

export function computeKeywordBonus(
  ximatarId: string,
  contextKeywords: string[]
): { bonus: number; matchedKeywords: string[] } {
  const profile = XIMATAR_PROFILES[ximatarId];
  if (!profile) return { bonus: 0, matchedKeywords: [] };
  
  const normalizedContext = contextKeywords.map(k => k.toLowerCase().trim());
  const allProfileKeywords = [
    ...profile.keywords, ...profile.tags, ...profile.skills, ...profile.industries
  ].map(k => k.toLowerCase());
  
  const matchedKeywords = normalizedContext.filter(k => 
    allProfileKeywords.some(pk => pk.includes(k) || k.includes(pk))
  );
  
  const bonus = Math.min(30, matchedKeywords.length * 6);
  return { bonus, matchedKeywords };
}
