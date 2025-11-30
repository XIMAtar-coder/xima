// lib/scoring/openResponse.ts
export type FieldKey = 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';

export type Rubric = {
  length: number;       // 0–20
  relevance: number;    // 0–25
  structure: number;    // 0–20
  specificity: number;  // 0–20
  action: number;       // 0–15
  total: number;        // 0–100
  steveJobsExplanation?: string;  // Steve Jobs-style feedback
  improvementSuggestions?: string[];  // Concrete improvement tips
};

const FIELD_KEYWORDS: Record<FieldKey, string[]> = {
  science_tech: [
    'data', 'experiment', 'model', 'hypothesis', 'metrics', 'algorithm', 'prototype', 'deploy',
    'analysis', 'evidence', 'test', 'validate', 'iterate', 'dataset', 'performance'
  ],
  business_leadership: [
    'strategy', 'stakeholder', 'kpi', 'roadmap', 'alignment', 'negotiation', 'budget', 'forecast',
    'team', 'milestone', 'risk', 'impact', 'go-to-market', 'positioning', 'pipeline'
  ],
  arts_creative: [
    'concept', 'narrative', 'composition', 'iteration', 'prototype', 'brief', 'audience', 'story',
    'moodboard', 'style', 'aesthetic', 'sketch', 'layout', 'tone', 'visual'
  ],
  service_ops: [
    'process', 'sop', 'handoff', 'quality', 'throughput', 'schedule', 'compliance', 'incident',
    'backlog', 'sla', 'retention', 'onboarding', 'checklist', 'workflow', 'accessibility'
  ]
};

// Simple language-aware split (IT/EN/ES agnostic)
function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function containsAny(text: string, words: string[]) {
  const t = ' ' + text.toLowerCase() + ' ';
  return words.some(w => t.includes(' ' + w + ' '));
}

export function scoreOpenResponse(params: {
  text: string;
  field: FieldKey;
  language: 'it' | 'en' | 'es';
  openKey: 'open1' | 'open2';
}): Rubric {
  const { text, field } = params;
  const trimmed = (text || '').trim();
  const tokens = tokenize(trimmed);
  const wordCount = tokens.length;

  // 1) Length (0–20): reward 80–250 words, taper outside that
  let lengthScore = 0;
  if (wordCount >= 50) {
    const idealMin = 80, idealMax = 250;
    if (wordCount >= idealMin && wordCount <= idealMax) lengthScore = 20;
    else {
      const diff = Math.min(Math.abs(wordCount - (wordCount < idealMin ? idealMin : idealMax)), 200);
      lengthScore = Math.max(8, 20 - diff * 0.06);
    }
  }

  // 2) Relevance (0–25): keyword overlap with field vocabulary
  const fieldTerms = FIELD_KEYWORDS[field];
  const fieldHits = tokens.filter(t => fieldTerms.includes(t)).length;
  const relevanceScore = Math.min(25, fieldHits * 2.5); // ~10 hits caps

  // 3) Structure (0–20): sentences, transitions, conclusion markers
  const sentences = trimmed.split(/[.!?…]+/).map(s => s.trim()).filter(Boolean);
  const hasIntro = sentences[0]?.length > 15;
  const hasConclusion = containsAny(trimmed, [
    'therefore', 'so', 'in conclusion', 'quindi', 'pertanto', 'in sintesi',
    'por lo tanto', 'en conclusión', 'en síntesis', 'perciò'
  ]);
  const transitions = ['because', 'therefore', 'however', 'ma', 'quindi', 'tuttavia', 'pero', 'sin embargo', 'por lo tanto'];
  const transitionHits = transitions.filter(tr => containsAny(trimmed, [tr])).length;
  let structureScore = 0;
  if (sentences.length >= 3) {
    structureScore = 10 + Math.min(5, transitionHits * 2) + (hasIntro ? 3 : 0) + (hasConclusion ? 2 : 0);
    structureScore = Math.min(20, structureScore);
  } else if (sentences.length >= 2) {
    structureScore = 8 + Math.min(4, transitionHits * 2) + (hasConclusion ? 2 : 0);
  } else {
    structureScore = Math.min(6, transitionHits * 2);
  }

  // 4) Specificity (0–20): presence of numbers, dates, examples, proper nouns-like tokens
  const hasNumbers = /\d/.test(trimmed) ? 1 : 0;
  const exampleMarkers = ['e.g.', 'for example', 'ad esempio', 'por ejemplo'];
  const hasExample = containsAny(trimmed, exampleMarkers);
  const longWords = tokens.filter(w => w.length >= 8).length; // proxy for specificity
  let specificityScore = Math.min(20, hasNumbers * 5 + (hasExample ? 5 : 0) + Math.min(10, longWords * 0.7));

  // 5) Action (0–15): verbs of action/plan/impact
  const actionVerbs = [
    'implemented', 'designed', 'measured', 'tested', 'delivered', 'aligned', 'negotiated', 'optimized', 
    'iterated', 'deployed', 'scalato', 'progettato', 'misurato', 'testato', 'consegnato', 'allineato', 
    'ottimizzato', 'iterato', 'implementado', 'diseñado', 'medido', 'probado', 'entregado', 'alineado', 
    'optimizado', 'iterado'
  ];
  const actionHits = tokens.filter(t => actionVerbs.includes(t)).length;
  const actionScore = Math.min(15, actionHits * 3);

  const total = Math.max(0, Math.min(100, lengthScore + relevanceScore + structureScore + specificityScore + actionScore));

  return {
    length: Math.round(lengthScore),
    relevance: Math.round(relevanceScore),
    structure: Math.round(structureScore),
    specificity: Math.round(specificityScore),
    action: Math.round(actionScore),
    total: Math.round(total)
  };
}

export function blendOpenIntoPillars(
  basePillars: Record<string, number>, 
  open1Score: number, 
  open2Score: number
): Record<string, number> {
  // base: pillar scores 0–100 from MC questions
  const openCreativity = open1Score * 0.60;
  const openCommunication = open1Score * 0.40;
  const openDrive = open2Score * 0.60;
  const openKnowledge = open2Score * 0.40;
  const OPEN_WEIGHT = 0.10; // 10% influence overall

  const additions: Record<string, number> = {
    creativity: openCreativity,
    communication: openCommunication,
    drive: openDrive,
    knowledge: openKnowledge
    // computational_power stays MC-only (transparent choice)
  };

  const blended: Record<string, number> = { ...basePillars };
  
  Object.keys(additions).forEach(pillarKey => {
    const baseValue = basePillars[pillarKey] || 0;
    const blendedValue = baseValue * (1 - OPEN_WEIGHT) + additions[pillarKey] * OPEN_WEIGHT;
    blended[pillarKey] = Math.max(0, Math.min(100, Math.round(blendedValue)));
  });

  return blended;
}
