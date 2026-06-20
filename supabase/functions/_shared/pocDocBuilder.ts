// Builds the anonymous "candidate profile" document used as source_text
// for PoC RAG embeddings. Sources only populated tables; scrubs PII before
// concatenation. Never reads user_ai_context.cv_extracted_text (raw PII).

const PII_KEYS = new Set([
  "name", "full_name", "first_name", "last_name",
  "email", "email_address", "mail",
  "phone", "telephone", "mobile", "phone_number",
  "address", "street", "postal_code", "zip", "zipcode",
  "linkedin", "github", "url", "website", "homepage",
  "dob", "date_of_birth", "birthdate", "birth_date",
  "fiscal_code", "tax_id", "ssn", "national_id",
]);
// Note: ximatar_name is intentionally NOT scrubbed (pseudonym, not PII).

export function scrubPII<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(scrubPII) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) continue;
      out[k] = scrubPII(v as unknown);
    }
    return out as unknown as T;
  }
  return value;
}

function compactJson(value: unknown): string {
  try {
    return JSON.stringify(scrubPII(value));
  } catch {
    return "";
  }
}

function pushSection(parts: string[], header: string, body: string | null | undefined) {
  if (!body) return;
  const trimmed = body.trim();
  if (!trimmed || trimmed === "{}" || trimmed === "[]" || trimmed === "null") return;
  parts.push(`## ${header}\n${trimmed}`);
}

// ─── Pillars helpers ─────────────────────────────────────────────────────
const PILLAR_ABBR: Record<string, string> = {
  knowledge: "K",
  communication: "C",
  computational_power: "Comp",
  comp_power: "Comp",
  computation: "Comp",
  creativity: "Cr",
  drive: "D",
};

export function formatPillars(scores: Record<string, unknown> | null | undefined): string | null {
  if (!scores || typeof scores !== "object") return null;
  const entries: [string, number][] = [];
  for (const [k, v] of Object.entries(scores)) {
    const abbr = PILLAR_ABBR[k.toLowerCase()];
    const num = typeof v === "number" ? v : Number(v);
    if (abbr && Number.isFinite(num)) entries.push([abbr, num]);
  }
  if (entries.length === 0) return null;
  // Stable order
  const order = ["K", "C", "Comp", "Cr", "D"];
  entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  return `Pillars: ${entries.map(([k, v]) => `${k}=${Math.round(v)}`).join(" ")}`;
}

// ─── Candidate document ──────────────────────────────────────────────────
export interface CandidateDocInputs {
  profile: any | null;
  user_ai_context: any | null;
  latest_assessment_result: any | null;
  pillar_scores_fallback?: Record<string, number> | null;
  cv_analysis?: any | null;
  identity_analysis?: any | null;
  open_responses?: Array<{ answer?: string | null }> | null;
}

export function buildCandidateDoc(inp: CandidateDocInputs): string {
  const parts: string[] = ["### Candidate profile (anonymous)"];
  const p = inp.profile || {};

  // 1. Identity (pseudonym)
  const idBits: string[] = [];
  if (p.ximatar_name) idBits.push(`pseudonym=${p.ximatar_name}`);
  if (p.ximatar_level) idBits.push(`level=${p.ximatar_level}`);
  if (idBits.length) pushSection(parts, "Identity", idBits.join(" "));

  // 2. Preferences
  const prefBits: string[] = [];
  if (Array.isArray(p.industry_preferences) && p.industry_preferences.length) {
    prefBits.push(`industries=${p.industry_preferences.join(", ")}`);
  }
  if (p.work_preference) prefBits.push(`work=${p.work_preference}`);
  if (Array.isArray(p.desired_locations) && p.desired_locations.length) {
    prefBits.push(`locations=${compactJson(p.desired_locations)}`);
  }
  if (prefBits.length) pushSection(parts, "Preferences", prefBits.join(" | "));

  // 3. Pillars
  const pillarLine = formatPillars(p.pillar_scores) ||
    formatPillars(p.pillars) ||
    formatPillars(inp.pillar_scores_fallback ?? null);
  if (pillarLine) pushSection(parts, "Pillars", pillarLine);

  // 4. Assessment (latest)
  if (inp.latest_assessment_result) {
    const a = inp.latest_assessment_result;
    const aBits: string[] = [];
    if (a.total_score != null) aBits.push(`total=${a.total_score}`);
    if (a.sentiment != null) aBits.push(`sentiment=${a.sentiment}`);
    if (a.pillars) aBits.push(`pillars=${compactJson(a.pillars)}`);
    if (a.top3) aBits.push(`top3=${compactJson(a.top3)}`);
    if (a.rationale) aBits.push(`rationale=${compactJson(a.rationale)}`);
    if (aBits.length) pushSection(parts, "Assessment", aBits.join("\n"));
  }

  // 5–11. user_ai_context summaries (scrubbed)
  const ctx = inp.user_ai_context || {};
  pushSection(parts, "Credentials", ctx.cv_credentials_summary ? compactJson(ctx.cv_credentials_summary) : null);
  pushSection(parts, "Identity narrative", ctx.cv_identity_summary ? compactJson(ctx.cv_identity_summary) : null);
  pushSection(parts, "Assessment summary", ctx.assessment_summary ? compactJson(ctx.assessment_summary) : null);
  pushSection(parts, "Challenges history", ctx.challenge_history_summary ? compactJson(ctx.challenge_history_summary) : null);
  pushSection(parts, "Growth", ctx.growth_summary ? compactJson(ctx.growth_summary) : null);
  pushSection(parts, "Matching preferences", ctx.matching_preferences ? compactJson(ctx.matching_preferences) : null);
  pushSection(parts, "L3", ctx.l3_summary ? compactJson(ctx.l3_summary) : null);

  // 12. CV analysis
  if (inp.cv_analysis) {
    const c = inp.cv_analysis;
    const bits: string[] = [];
    if (c.summary) bits.push(`summary=${typeof c.summary === "string" ? c.summary : compactJson(c.summary)}`);
    if (c.strengths) bits.push(`strengths=${compactJson(c.strengths)}`);
    if (c.soft_skills) bits.push(`soft_skills=${compactJson(c.soft_skills)}`);
    if (c.ximatar_suggestions) bits.push(`ximatar_suggestions=${compactJson(c.ximatar_suggestions)}`);
    if (bits.length) pushSection(parts, "CV analysis", bits.join("\n"));
  }

  // 13. Identity analysis
  if (inp.identity_analysis) {
    const i = inp.identity_analysis;
    const bits: string[] = [];
    if (i.cv_archetype_primary) bits.push(`archetype_primary=${i.cv_archetype_primary}`);
    if (i.cv_archetype_secondary) bits.push(`archetype_secondary=${i.cv_archetype_secondary}`);
    if (i.cv_archetype_explanation) bits.push(`archetype_explanation=${i.cv_archetype_explanation}`);
    if (i.tension_narrative) bits.push(`tension=${i.tension_narrative}`);
    if (i.cv_qualified_roles) bits.push(`qualified_roles=${compactJson(i.cv_qualified_roles)}`);
    if (i.archetype_aligned_roles) bits.push(`aligned_roles=${compactJson(i.archetype_aligned_roles)}`);
    if (i.growth_bridge_roles) bits.push(`bridge_roles=${compactJson(i.growth_bridge_roles)}`);
    if (bits.length) pushSection(parts, "Identity analysis", bits.join("\n"));
  }

  // 14. Open answers (last 3)
  if (Array.isArray(inp.open_responses) && inp.open_responses.length) {
    const answers = inp.open_responses
      .slice(0, 3)
      .map((r) => (typeof r?.answer === "string" ? r.answer.trim() : ""))
      .filter(Boolean)
      .map((a) => (a.length > 600 ? a.slice(0, 600) + "…" : a));
    if (answers.length) pushSection(parts, "Open answers", answers.join("\n---\n"));
  }

  return parts.join("\n\n");
}

// ─── Goal document ───────────────────────────────────────────────────────
export interface GoalDocInputs {
  goal: any;
  requirements?: any | null;
  challenges?: any[] | null;
  job_posts?: any[] | null;
  business_profile?: any | null;
  company_profile?: any | null;
}

export function buildGoalDoc(inp: GoalDocInputs): string {
  const parts: string[] = ["### Hiring goal"];
  const g = inp.goal || {};

  const roleBits: string[] = [];
  if (g.role_title) roleBits.push(`role=${g.role_title}`);
  if (g.function_area) roleBits.push(`function=${g.function_area}`);
  if (g.experience_level) roleBits.push(`level=${g.experience_level}`);
  if (g.work_model) roleBits.push(`work=${g.work_model}`);
  if (g.country || g.city_region) roleBits.push(`location=${[g.city_region, g.country].filter(Boolean).join(", ")}`);
  if (roleBits.length) pushSection(parts, "Role", roleBits.join(" | "));

  if (g.task_description) pushSection(parts, "Task description", String(g.task_description));

  if (inp.requirements) {
    pushSection(parts, "Requirements", compactJson(inp.requirements));
  }

  if (Array.isArray(inp.challenges) && inp.challenges.length) {
    const bits = inp.challenges.map((c) => {
      const o: any = {};
      if (c.title) o.title = c.title;
      if (c.description) o.description = c.description;
      if (c.target_skills) o.target_skills = c.target_skills;
      if (c.success_criteria) o.success_criteria = c.success_criteria;
      return o;
    });
    pushSection(parts, "Linked challenges", compactJson(bits));
  }

  if (Array.isArray(inp.job_posts) && inp.job_posts.length) {
    const bits = inp.job_posts.map((j) => {
      const o: any = {};
      if (j.description) o.description = j.description;
      if (j.responsibilities) o.responsibilities = j.responsibilities;
      if (j.requirements_must) o.must = j.requirements_must;
      if (j.requirements_nice) o.nice = j.requirements_nice;
      if (j.seniority) o.seniority = j.seniority;
      if (j.department) o.department = j.department;
      return o;
    });
    pushSection(parts, "Linked job posts", compactJson(bits));
  }

  if (inp.business_profile) {
    const b = inp.business_profile;
    const o: any = {};
    if (b.team_culture) o.team_culture = b.team_culture;
    if (b.hiring_approach) o.hiring_approach = b.hiring_approach;
    if (b.manual_industry || b.snapshot_industry) o.industry = b.manual_industry || b.snapshot_industry;
    pushSection(parts, "Business context", compactJson(o));
  }

  if (inp.company_profile) {
    const c = inp.company_profile;
    const o: any = {};
    if (c.values) o.values = c.values;
    if (c.ideal_traits) o.ideal_traits = c.ideal_traits;
    if (c.recommended_ximatars) o.recommended_ximatars = c.recommended_ximatars;
    pushSection(parts, "Company DNA", compactJson(o));
  }

  return parts.join("\n\n");
}
