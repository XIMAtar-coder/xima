/**
 * Shared AI Response Schema Validation
 * 
 * Strict validation for all AI/LLM response schemas.
 * Uses manual validation (no Zod in Deno) with clear error messages.
 */

// =====================================================
// Level 2 Signals Schema
// =====================================================

const L2_SIGNAL_VALUES = ["clear", "partial", "fragmented"] as const;
const L2_READINESS_VALUES = ["ready", "needs_clarification", "insufficient"] as const;

export interface Level2SignalsPayload {
  hardSkillClarity: "clear" | "partial" | "fragmented";
  hardSkillExplanation: string;
  toolMethodMaturity: "clear" | "partial" | "fragmented";
  toolMethodExplanation: string;
  decisionQualityUnderConstraints: "clear" | "partial" | "fragmented";
  decisionExplanation: string;
  riskAwareness: "clear" | "partial" | "fragmented";
  riskExplanation: string;
  executionRealism: "clear" | "partial" | "fragmented";
  executionExplanation: string;
  overallReadiness: "ready" | "needs_clarification" | "insufficient";
  summary: string;
  flags: string[];
  generatedAt: string;
  generatedLocale: string;
}

export function validateLevel2Signals(parsed: unknown): Level2SignalsPayload | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const signalFields = [
    ["hardSkillClarity", L2_SIGNAL_VALUES],
    ["toolMethodMaturity", L2_SIGNAL_VALUES],
    ["decisionQualityUnderConstraints", L2_SIGNAL_VALUES],
    ["riskAwareness", L2_SIGNAL_VALUES],
    ["executionRealism", L2_SIGNAL_VALUES],
  ] as const;

  for (const [field, allowed] of signalFields) {
    if (!allowed.includes(obj[field] as any)) return null;
  }

  if (!L2_READINESS_VALUES.includes(obj.overallReadiness as any)) return null;

  const explanationFields = [
    "hardSkillExplanation", "toolMethodExplanation",
    "decisionExplanation", "riskExplanation", "executionExplanation", "summary"
  ];
  for (const f of explanationFields) {
    if (typeof obj[f] !== "string" || (obj[f] as string).length === 0) return null;
  }

  if (!Array.isArray(obj.flags)) return null;

  return {
    hardSkillClarity: obj.hardSkillClarity as any,
    hardSkillExplanation: String(obj.hardSkillExplanation),
    toolMethodMaturity: obj.toolMethodMaturity as any,
    toolMethodExplanation: String(obj.toolMethodExplanation),
    decisionQualityUnderConstraints: obj.decisionQualityUnderConstraints as any,
    decisionExplanation: String(obj.decisionExplanation),
    riskAwareness: obj.riskAwareness as any,
    riskExplanation: String(obj.riskExplanation),
    executionRealism: obj.executionRealism as any,
    executionExplanation: String(obj.executionExplanation),
    overallReadiness: obj.overallReadiness as any,
    summary: String(obj.summary),
    flags: (obj.flags as unknown[]).map(String),
    generatedAt: new Date().toISOString(),
    generatedLocale: "",
  };
}

// =====================================================
// CV Analysis Schema
// =====================================================

export interface CvAnalysisResult {
  computational_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
  summary: string;
  strengths: string[];
  soft_skills: string[];
  comments: Record<string, string>;
}

export function validateCvAnalysis(parsed: unknown): CvAnalysisResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const pillarFields = ["computational_power", "communication", "knowledge", "creativity", "drive"];
  for (const field of pillarFields) {
    const val = obj[field];
    if (typeof val !== "number" || val < 0 || val > 100) return null;
  }

  if (typeof obj.summary !== "string" || obj.summary.length === 0) return null;
  if (!Array.isArray(obj.strengths)) return null;
  if (!Array.isArray(obj.soft_skills)) return null;

  return {
    computational_power: Math.round(obj.computational_power as number),
    communication: Math.round(obj.communication as number),
    knowledge: Math.round(obj.knowledge as number),
    creativity: Math.round(obj.creativity as number),
    drive: Math.round(obj.drive as number),
    summary: String(obj.summary),
    strengths: (obj.strengths as unknown[]).map(String).slice(0, 10),
    soft_skills: (obj.soft_skills as unknown[]).map(String).slice(0, 10),
    comments: typeof obj.comments === "object" && obj.comments !== null
      ? Object.fromEntries(
          Object.entries(obj.comments as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        )
      : {},
  };
}

// =====================================================
// Open Answer Scoring Schema
// =====================================================

export interface OpenAnswerScoringResult {
  score: number;
  quality_label: "poor" | "fair" | "good" | "excellent";
  reasons: string[];
  improvement_tips: string[];
  detected_red_flags: string[];
}

const QUALITY_LABELS = ["poor", "fair", "good", "excellent"] as const;

export function validateOpenAnswerScoring(parsed: unknown): OpenAnswerScoringResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.score !== "number" || obj.score < 0 || obj.score > 100) return null;
  if (!QUALITY_LABELS.includes(obj.quality_label as any)) return null;
  if (!Array.isArray(obj.reasons)) return null;
  if (!Array.isArray(obj.improvement_tips)) return null;
  if (!Array.isArray(obj.detected_red_flags)) return null;

  return {
    score: Math.round(obj.score),
    quality_label: obj.quality_label as any,
    reasons: (obj.reasons as unknown[]).map(String),
    improvement_tips: (obj.improvement_tips as unknown[]).map(String),
    detected_red_flags: (obj.detected_red_flags as unknown[]).map(String),
  };
}

// =====================================================
// Company Profile Analysis Schema
// =====================================================

export interface CompanyAnalysisResult {
  summary: string;
  values: string[];
  operating_style: string;
  communication_style: string;
  ideal_traits: string[];
  risk_areas: string[];
}

export function validateCompanyAnalysis(parsed: unknown): CompanyAnalysisResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.length === 0) return null;
  if (typeof obj.operating_style !== "string") return null;
  if (typeof obj.communication_style !== "string") return null;

  return {
    summary: String(obj.summary),
    values: Array.isArray(obj.values) ? (obj.values as unknown[]).map(String) : [],
    operating_style: String(obj.operating_style),
    communication_style: String(obj.communication_style),
    ideal_traits: Array.isArray(obj.ideal_traits) ? (obj.ideal_traits as unknown[]).map(String) : [],
    risk_areas: Array.isArray(obj.risk_areas) ? (obj.risk_areas as unknown[]).map(String) : [],
  };
}

// =====================================================
// Challenge Generation Schema
// =====================================================

export interface GeneratedChallengeResult {
  title_suggestion: string;
  candidate_facing_description: string;
  success_criteria: string[];
  time_estimate_minutes: number;
}

export function validateGeneratedChallenge(parsed: unknown): GeneratedChallengeResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.title_suggestion !== "string" || obj.title_suggestion.length === 0) return null;
  if (typeof obj.candidate_facing_description !== "string") return null;
  if (!Array.isArray(obj.success_criteria) || obj.success_criteria.length === 0) return null;
  if (typeof obj.time_estimate_minutes !== "number") return null;

  return {
    title_suggestion: String(obj.title_suggestion),
    candidate_facing_description: String(obj.candidate_facing_description),
    success_criteria: (obj.success_criteria as unknown[]).map(String).slice(0, 5),
    time_estimate_minutes: Math.round(obj.time_estimate_minutes as number),
  };
}

// =====================================================
// XIMA Core Scenario Schema
// =====================================================

export interface XimaCoreScenarioResult {
  scenario: string;
  business_type: string;
}

export function validateXimaCoreScenario(parsed: unknown): XimaCoreScenarioResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.scenario !== "string" || obj.scenario.length < 20) return null;

  return {
    scenario: String(obj.scenario),
    business_type: typeof obj.business_type === "string" ? String(obj.business_type) : "General business",
  };
}

// =====================================================
// L2 Challenge Config Schema
// =====================================================

export interface L2ChallengeConfig {
  overview: string;
  steps: Array<{
    type: string;
    items: Array<{ id: string; text: string; required?: boolean }>;
  }>;
  scoring_rubric: Array<{
    criterion: string;
    weight: number;
    description: string;
  }>;
  estimated_time_minutes: number;
  language: string;
}

export function validateL2ChallengeConfig(parsed: unknown): L2ChallengeConfig | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.overview !== "string" || obj.overview.length === 0) return null;
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) return null;
  if (!Array.isArray(obj.scoring_rubric)) return null;

  // Validate each step has required fields
  for (const step of obj.steps as any[]) {
    if (!step || typeof step.type !== "string") return null;
    if (!Array.isArray(step.items)) return null;
    for (const item of step.items) {
      if (!item || typeof item.id !== "string" || typeof item.text !== "string") return null;
    }
  }

  return {
    overview: String(obj.overview),
    steps: obj.steps as any,
    scoring_rubric: Array.isArray(obj.scoring_rubric) ? obj.scoring_rubric as any : [],
    estimated_time_minutes: typeof obj.estimated_time_minutes === "number"
      ? Math.round(obj.estimated_time_minutes as number)
      : 45,
    language: typeof obj.language === "string" ? String(obj.language) : "en",
  };
}
