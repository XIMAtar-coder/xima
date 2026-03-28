/**
 * XIMA CV Intelligence Engine v2.1 — Stabilized
 *
 * Dual-layer analysis:
 *   Layer A (Identity) — psychometric tension between XIMAtar assessment and CV
 *   Layer B (Credentials) — exhaustive structured extraction for B2B matching
 *
 * All optional modules (budget, cache, context, audit, intelligence) are
 * imported defensively — if any fail, the core flow still works.
 */

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";

// =====================================================
// Optional imports — each wrapped so failures don't crash the function
// =====================================================

let extractJsonFromAiContent: any;
let generateCorrelationId: any;
let SCORING_SCHEMA_VERSION: string = "1.0";
let validateCvAnalysis: any;
let emitAuditEventWithMetric: any;
let hashForAudit: any;
let XIMATAR_PROFILES: any;
let checkAiBudget: any;
let recordAiCall: any;
let cacheAiResult: any;
let loadUserAiContext: any;
let buildContextBlock: any;
let updateUserAiContext: any;
let checkCvHash: any;
let computeFileHash: any;

try {
  const mod = await import("../_shared/aiClient.ts");
  extractJsonFromAiContent = mod.extractJsonFromAiContent;
  generateCorrelationId = mod.generateCorrelationId;
  if (mod.SCORING_SCHEMA_VERSION) SCORING_SCHEMA_VERSION = mod.SCORING_SCHEMA_VERSION;
} catch (e) {
  console.warn("[analyze-cv] aiClient import failed:", e.message);
}

try {
  const mod = await import("../_shared/aiSchema.ts");
  validateCvAnalysis = mod.validateCvAnalysis;
} catch (e) {
  console.warn("[analyze-cv] aiSchema import failed:", e.message);
}

try {
  const mod = await import("../_shared/auditEvents.ts");
  emitAuditEventWithMetric = mod.emitAuditEventWithMetric;
  hashForAudit = mod.hashForAudit;
} catch (e) {
  console.warn("[analyze-cv] auditEvents import failed:", e.message);
}

try {
  const mod = await import("../_shared/ximatarTaxonomy.ts");
  XIMATAR_PROFILES = mod.XIMATAR_PROFILES;
} catch (e) {
  console.warn("[analyze-cv] ximatarTaxonomy import failed:", e.message);
}

try {
  const mod = await import("../_shared/aiBudget.ts");
  checkAiBudget = mod.checkAiBudget;
  recordAiCall = mod.recordAiCall;
  cacheAiResult = mod.cacheAiResult;
} catch (e) {
  console.warn("[analyze-cv] aiBudget import failed:", e.message);
}

try {
  const mod = await import("../_shared/aiContext.ts");
  loadUserAiContext = mod.loadUserAiContext;
  buildContextBlock = mod.buildContextBlock;
  updateUserAiContext = mod.updateUserAiContext;
  checkCvHash = mod.checkCvHash;
  computeFileHash = mod.computeFileHash;
} catch (e) {
  console.warn("[analyze-cv] aiContext import failed:", e.message);
}

// =====================================================
// Helper: Direct Claude API call (fallback if shared module unavailable)
// =====================================================

async function callClaudeDirectly(system: string, userMessage: string, model = "claude-sonnet-4-20250514", maxTokens = 8192): Promise<{ content: string; model: string; latencyMs: number; requestId: string }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const requestId = crypto.randomUUID();
  const start = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userMessage }] }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    // Check for credit issues
    if (errText.toLowerCase().includes("credit balance is too low") || errText.toLowerCase().includes("purchase credits")) {
      throw Object.assign(new Error("Anthropic credits are too low. Please add more credits."), { statusCode: 402, errorCode: "INSUFFICIENT_CREDITS" });
    }
    if (response.status === 429) {
      // Retry once
      await new Promise(r => setTimeout(r, 2000));
      const retry = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userMessage }] }),
      });
      if (!retry.ok) throw new Error(`Anthropic API error ${retry.status}`);
      const data = await retry.json();
      return { content: data.content?.[0]?.text || "", model, latencyMs: Date.now() - start, requestId };
    }
    throw new Error(`Anthropic API error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "";
  if (!content) throw new Error("Empty response from Anthropic");
  return { content, model, latencyMs, requestId };
}

// =====================================================
// Helper: Robust JSON extraction (fallback if shared extractJsonFromAiContent unavailable)
// =====================================================

function extractJsonRobust(text: string): string {
  let t = text.trim();
  // Strip markdown code fences
  const fenceMatch = t.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) t = fenceMatch[1].trim();
  // Find JSON object
  if (!t.startsWith("{")) {
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first !== -1 && last > first) t = t.substring(first, last + 1);
  }
  return t;
}

// =====================================================
// Helper: Hash for audit (fallback)
// =====================================================

async function hashForAuditFallback(input: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
  } catch {
    return "unknown";
  }
}

// =====================================================
// Helper: Text extraction from file bytes
// =====================================================

async function extractTextFromFile(
  fileBytes: Uint8Array,
  mimeType: string
): Promise<{ text: string; method: string }> {
  // Plain text
  if (mimeType === "text/plain") {
    return { text: new TextDecoder("utf-8").decode(fileBytes), method: "plaintext" };
  }

  // DOCX
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
      const zip = await JSZip.loadAsync(fileBytes);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      if (documentXml) {
        const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        const text = textMatches
          .map((match: string) => match.replace(/<[^>]*>/g, ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 50) {
          return { text, method: "docx-xml" };
        }
      }
    } catch (_e) {
      console.warn("[extract] DOCX XML extraction failed, falling back");
    }
  }

  // PDF — use Claude vision API directly
  if (mimeType === "application/pdf") {
    console.log("[extract] PDF detected — using Claude vision for reliable text extraction");

    try {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) throw new Error("No API key for PDF extraction");

      let base64Pdf = "";
      const CHUNK_SIZE = 8192;
      for (let i = 0; i < fileBytes.length; i += CHUNK_SIZE) {
        const chunk = fileBytes.subarray(i, Math.min(i + CHUNK_SIZE, fileBytes.length));
        base64Pdf += String.fromCharCode(...chunk);
      }
      base64Pdf = btoa(base64Pdf);

      const visionResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
              { type: "text", text: "Extract ALL text content from this CV/resume PDF document. Return ONLY the raw text content exactly as it appears in the document. Preserve all section headings, job titles, company names, dates, education details, skills lists, and all other professional information. Do not add any commentary, analysis, or markdown formatting — just output the document's text content faithfully." },
            ],
          }],
        }),
      });

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const visionText = visionData.content?.[0]?.text || "";
        if (visionText.length > 50) {
          console.log(`[extract] Claude vision extracted ${visionText.length} chars from PDF`);
          return { text: visionText.substring(0, 15000), method: "claude-vision-pdf" };
        } else {
          console.warn(`[extract] Claude vision returned only ${visionText.length} chars`);
        }
      } else {
        const errText = await visionResponse.text().catch(() => "");
        console.error(`[extract] Claude vision HTTP ${visionResponse.status}:`, errText.substring(0, 300));
      }
    } catch (visionError) {
      console.error("[extract] Claude vision error:", visionError instanceof Error ? visionError.message : "unknown");
    }

    // Fallback: regex as last resort
    console.warn("[extract] Claude vision failed, trying regex fallback");
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
    const textParts: string[] = [];
    const parenMatches = rawText.match(/\(([^)]{2,})\)/g) || [];
    for (const match of parenMatches) {
      const inner = match
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\(\d{3})/g, (_: string, oct: string) => String.fromCharCode(parseInt(oct, 8)));
      if (inner.length > 10 && /[a-zA-ZÀ-ÿ]{4,}/.test(inner) && (inner.match(/\s/g) || []).length >= 2) {
        textParts.push(inner);
      }
    }

    const regexText = textParts.join(" ").trim();
    if (regexText.length > 200) {
      return { text: regexText.substring(0, 15000), method: "pdf-regex-strict" };
    }

    return { text: "", method: "pdf-extraction-failed" };
  }

  // DOC (legacy binary)
  const rawText = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
  const readable = rawText.match(/[\x20-\x7E\xC0-\xFF]{8,}/g) || [];
  const filtered = readable.filter((s: string) => /[a-zA-ZÀ-ÿ]{3,}/.test(s));
  return { text: filtered.join("\n").substring(0, 15000), method: "doc-strings" };
}

// =====================================================
// Helper: Language detection
// =====================================================

function detectLanguage(text: string): string {
  const sample = text.substring(0, 3000).toLowerCase();
  const langIndicators: Record<string, RegExp[]> = {
    it: [/esperienza/i, /istruzione/i, /competenze/i, /formazione/i, /laurea/i, /università/i, /lavoro/i, /azienda/i],
    en: [/experience/i, /education/i, /skills/i, /university/i, /employment/i, /responsibilities/i, /achievements/i],
    pt: [/experiência/i, /formação/i, /habilidades/i, /educação/i, /empresa/i, /universidade/i],
    es: [/experiencia/i, /educación/i, /habilidades/i, /empresa/i, /formación/i, /universidad/i],
    de: [/erfahrung/i, /ausbildung/i, /fähigkeiten/i, /kenntnisse/i, /berufserfahrung/i, /universität/i],
    fr: [/expérience/i, /formation/i, /compétences/i, /éducation/i, /entreprise/i, /université/i],
  };
  let bestLang = "en";
  let bestScore = 0;
  for (const [lang, patterns] of Object.entries(langIndicators)) {
    const score = patterns.filter((p) => p.test(sample)).length;
    if (score > bestScore) { bestScore = score; bestLang = lang; }
  }
  return bestScore >= 2 ? bestLang : "en";
}

// =====================================================
// Helper: Claude prompt builder
// =====================================================

function buildSystemPrompt(
  ximatarId: string, ximatarName: string, ximatarTitle: string,
  assessmentScores: Record<string, number>, language: string
): string {
  const langNames: Record<string, string> = { it: "Italian", en: "English", pt: "Portuguese", es: "Spanish", de: "German", fr: "French" };
  const langName = langNames[language] || "English";

  return `You are the XIMA CV Intelligence Engine — an expert psychometric analyst for the XIMA talent platform. You perform two tasks simultaneously on a candidate's CV.

TASK 1 — CREDENTIAL EXTRACTION (Layer B)
Extract every structured fact from the CV into precise JSON. Be exhaustive: every degree, every role, every skill, every certification, every language. Standardize where possible. Do not invent information not present in the CV. If a field cannot be determined, use null.

Degree types: "laurea_triennale", "laurea_magistrale", "master", "phd", "mba", "bachelor", "diploma", "certificate", "other"
Seniority levels: "junior" (0-2yr), "mid" (3-5yr), "senior" (6-10yr), "lead" (10-15yr), "executive" (15+yr)
Career trajectories: "specialist", "management", "entrepreneur", "academic", "lateral", "ascending"
Skill categories: "programming", "engineering_tools", "data_analysis", "finance", "design", "project_management", "languages_frameworks", "soft_tools", "other"
Proficiency levels: "expert", "advanced", "intermediate", "basic"
Language proficiency: "native", "fluent", "professional", "intermediate", "basic"

TASK 2 — PSYCHOMETRIC IDENTITY ANALYSIS (Layer A)
The candidate already completed the XIMA assessment. Their results:
- XIMAtar archetype: ${ximatarId} — ${ximatarName} (${ximatarTitle})
- Assessment pillar scores: Drive ${assessmentScores.drive ?? "N/A"}, Computational Power ${assessmentScores.comp_power ?? assessmentScores.computational_power ?? "N/A"}, Communication ${assessmentScores.communication ?? "N/A"}, Creativity ${assessmentScores.creativity ?? "N/A"}, Knowledge ${assessmentScores.knowledge ?? "N/A"}

Now analyze how this CV represents (or misrepresents) that identity:
- Score the CV on the same 5 pillars (what does the DOCUMENT communicate, not the person)
- Determine a CV archetype — the XIMAtar the CV reads as (may differ from assessment)
- Map the tension: per-pillar gaps between assessment scores and CV scores
- gap_direction: "undersold" = assessment score higher than CV score (person is better than CV shows), "oversold" = CV score higher than assessment (CV inflates something)
- Provide CV improvements in two categories:
  (a) technical: standard CV quality (formatting, quantification, keywords, structure)
  (b) identity_aligned: specific advice to make the CV represent the person's true XIMAtar better, with before/after examples where possible
- Compare roles: what the CV qualifies for vs. what the archetype is built for vs. growth bridge roles between them
- Provide a mentor hook: a suggested focus and key question for a free mentor session to explore the gap

IMPORTANT SCORING RULES:
- PDF/DOC extraction may contain noise. Reconstruct meaning before scoring.
- Do NOT assign all pillars as 0 unless text is genuinely unreadable (<3 coherent signals).
- Partial evidence → conservative non-zero scores.

CV PILLAR SCORING: 0-20=no evidence, 21-40=minimal, 41-60=moderate, 61-80=strong with examples, 81-100=exceptional.
PHILOSOPHY: CVs capture credentials not identity. Tension = growth opportunity. Improvements help CV tell the true story.

LANGUAGE: Write ALL narratives, recommendations, explanations, summaries, mentor_hook, and role names in ${langName}. Keep JSON field names in English.

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "credentials": {
    "full_name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": { "city": "string or null", "region": "string or null", "country": "string or null" },
    "nationality": "string or null",
    "date_of_birth": "string or null",
    "linkedin_url": "string or null",
    "portfolio_url": "string or null",
    "education": [{ "institution": "str", "degree_type": "str", "field_of_study": "str", "graduation_year": null, "grade": "str or null", "thesis_topic": "str or null", "institution_country": "str or null" }],
    "work_experience": [{ "job_title": "str", "company": "str", "industry": "str or null", "start_date": "str or null", "end_date": "str or null", "is_current": false, "location": "str or null", "description": "str", "achievements": ["str"], "management_scope": "str or null" }],
    "hard_skills": [{ "name": "str", "category": "str", "proficiency": "str or null" }],
    "certifications": [{ "name": "str", "issuing_body": "str or null", "year": null, "is_active": null }],
    "languages": [{ "language": "str", "proficiency": "str", "certification": "str or null" }],
    "total_years_experience": 0,
    "seniority_level": "str",
    "industries_worked": ["str"],
    "career_trajectory": "str",
    "publications": ["str"],
    "patents": ["str"],
    "awards": ["str"],
    "volunteer_work": ["str"],
    "professional_associations": ["str"]
  },
  "identity": {
    "cv_archetype": { "primary": "ximatar_id", "secondary": "ximatar_id", "explanation": "str" },
    "cv_pillar_scores": { "drive": 0, "computational_power": 0, "communication": 0, "creativity": 0, "knowledge": 0 },
    "tension": {
      "alignment_score": 0,
      "primary_gaps": [{ "pillar": "str", "ximatar_score": 0, "cv_score": 0, "gap_direction": "undersold|oversold", "narrative": "str" }],
      "overall_narrative": "str"
    },
    "improvements": {
      "technical": [{ "category": "str", "recommendation": "str", "priority": "high|medium|low" }],
      "identity_aligned": [{ "target_pillar": "str", "recommendation": "str", "example_before": "str or null", "example_after": "str or null" }]
    },
    "role_fit": {
      "cv_qualified_roles": ["str"],
      "archetype_aligned_roles": ["str"],
      "growth_bridge_roles": ["str"]
    },
    "mentor_hook": {
      "suggested_focus": "str",
      "key_question": "str"
    }
  }
}`;
}

function buildUserMessage(
  cvText: string, ximatarId: string, ximatarName: string,
  ximatarTitle: string, assessmentScores: Record<string, number>
): string {
  return `Here is the candidate's CV text:

---
${cvText}
---

The text may include PDF extraction noise, broken spacing, or formatting artifacts. Reconstruct the intended professional meaning before scoring.

Their XIMA assessment results:
- XIMAtar: ${ximatarId} — ${ximatarName} (${ximatarTitle})
- Pillar scores: Drive ${assessmentScores.drive ?? "N/A"}, Computational Power ${assessmentScores.comp_power ?? assessmentScores.computational_power ?? "N/A"}, Communication ${assessmentScores.communication ?? "N/A"}, Creativity ${assessmentScores.creativity ?? "N/A"}, Knowledge ${assessmentScores.knowledge ?? "N/A"}

Perform both credential extraction (Task 1) and psychometric identity analysis (Task 2). Return ONLY the JSON object.`;
}

// =====================================================
// Helper: Response validation
// =====================================================

function validateAnalyzeCvResponse(parsed: unknown): { credentials: any; identity: any } | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (!obj.credentials || typeof obj.credentials !== "object") return null;
  if (!obj.identity || typeof obj.identity !== "object") return null;

  const creds = obj.credentials as Record<string, unknown>;
  const ident = obj.identity as Record<string, unknown>;
  if (!Array.isArray(creds.education)) return null;
  if (!Array.isArray(creds.work_experience)) return null;
  if (!Array.isArray(creds.hard_skills)) return null;
  if (!ident.cv_archetype || typeof ident.cv_archetype !== "object") return null;
  if (!ident.cv_pillar_scores || typeof ident.cv_pillar_scores !== "object") return null;
  if (!ident.tension || typeof ident.tension !== "object") return null;

  const scores = ident.cv_pillar_scores as Record<string, unknown>;
  for (const f of ["drive", "computational_power", "communication", "creativity", "knowledge"]) {
    if (typeof scores[f] !== "number" || (scores[f] as number) < 0 || (scores[f] as number) > 100) return null;
  }
  return { credentials: obj.credentials, identity: obj.identity };
}

// =====================================================
// Main handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req);

  try {
    // ===== Auth =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Missing Authorization header");

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseAnonKey) throw new Error("Missing Supabase publishable key");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) return unauthorizedResponse("Authentication required. Please log in and try again.");

    // ===== GDPR + XIMAtar fetch =====
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profiling_opt_out, ximatar_id, ximatar, ximatar_name, ximatar_storytelling, pillar_scores")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error(JSON.stringify({ type: "db_error", correlation_id: correlationId, function_name: "analyze-cv", error: "Profile fetch failed" }));
    }

    if (profile?.profiling_opt_out === true) {
      return profilingOptOutResponse();
    }

    // ===== Check XIMAtar assessment exists =====
    const pillarScores = profile?.pillar_scores as Record<string, number> | null;
    let resolvedXimatarKey = (profile?.ximatar as string | null) || null;

    if (!resolvedXimatarKey && profile?.ximatar_id) {
      try {
        const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { data: ximatarRecord } = await serviceClient
          .from("ximatars")
          .select("label")
          .eq("id", profile.ximatar_id as string)
          .maybeSingle();
        if (ximatarRecord?.label) resolvedXimatarKey = ximatarRecord.label.toLowerCase();
      } catch (e) {
        console.warn("[analyze-cv] XIMAtar UUID resolution failed:", e instanceof Error ? e.message : e);
      }
    }

    if (!resolvedXimatarKey || !pillarScores) {
      return errorResponse(400, "ASSESSMENT_REQUIRED", "Please complete the XIMA assessment before uploading your CV.");
    }

    // Look up XIMAtar profile from taxonomy
    const ximatarProfile = XIMATAR_PROFILES?.[resolvedXimatarKey];
    const ximatarName = (profile?.ximatar_name as string) || ximatarProfile?.name || resolvedXimatarKey;
    const ximatarTitle = ximatarProfile?.title || "";

    console.log(JSON.stringify({ type: "ximatar_resolved", correlation_id: correlationId, ximatar_key: resolvedXimatarKey, ximatar_name: ximatarName }));

    // ===== AI Budget Check (optional) =====
    let budgetResult: any = { allowed: true, calls_used: 0, calls_limit: 999, tier: "unknown" };
    if (checkAiBudget) {
      try {
        budgetResult = await checkAiBudget(user.id, "analyze-cv");
        if (!budgetResult.allowed) {
          console.log(JSON.stringify({ type: "budget_exceeded", correlation_id: correlationId, function_name: "analyze-cv" }));
          if (budgetResult.cached_result) {
            return jsonResponse({ ...budgetResult.cached_result, _budget: { exceeded: true, calls_used: budgetResult.calls_used, calls_limit: budgetResult.calls_limit, tier: budgetResult.tier, cached: true } });
          }
          return errorResponse(429, "AI_BUDGET_EXCEEDED", budgetResult.budget_message || "Monthly AI analysis limit reached.");
        }
      } catch (budgetErr) {
        console.warn("[analyze-cv] Budget check failed, proceeding:", budgetErr instanceof Error ? budgetErr.message : budgetErr);
      }
    }

    // ===== File validation =====
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) return errorResponse(400, "INVALID_INPUT", "File missing or invalid");

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) return errorResponse(400, "FILE_TOO_LARGE", "File too large. Maximum 10MB allowed.");

    const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!ALLOWED_TYPES.includes(file.type)) return errorResponse(400, "INVALID_FILE_TYPE", "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.");

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // ===== CV file hash check (optional) =====
    if (checkCvHash) {
      try {
        const existingHash = await checkCvHash(user.id, fileBytes);
        if (existingHash && checkAiBudget) {
          const budgetCheckEarly = await checkAiBudget(user.id, "analyze-cv");
          if (budgetCheckEarly?.cached_result) {
            console.log("[analyze-cv] Same CV file detected, returning cached result");
            return jsonResponse({ ...budgetCheckEarly.cached_result, _cached: true, _message: "This CV has already been analyzed." });
          }
        }
      } catch (e) {
        console.warn("[analyze-cv] CV hash check failed:", e instanceof Error ? e.message : e);
      }
    }

    // Magic bytes validation
    if (file.type === "application/pdf") {
      const isPDF = fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46;
      if (!isPDF) return errorResponse(400, "INVALID_FILE_CONTENT", "File claims to be PDF but content validation failed.");
    }
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const isZip = fileBytes[0] === 0x50 && fileBytes[1] === 0x4b && fileBytes[2] === 0x03 && fileBytes[3] === 0x04;
      if (!isZip) return errorResponse(400, "INVALID_FILE_CONTENT", "File claims to be DOCX but content validation failed.");
    }
    if (file.type === "application/msword") {
      const isDoc = fileBytes[0] === 0xd0 && fileBytes[1] === 0xcf && fileBytes[2] === 0x11 && fileBytes[3] === 0xe0;
      if (!isDoc) return errorResponse(400, "INVALID_FILE_CONTENT", "File claims to be DOC but content validation failed.");
    }

    // ===== Upload to storage =====
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.\./g, "_").substring(0, 255);
    const safeFilename = sanitizeFilename(file.name);
    const filename = `${Date.now()}_${safeFilename}`;
    const storagePath = `${user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage.from("cv-uploads").upload(storagePath, fileBytes, { upsert: true, contentType: file.type });
    if (uploadError) return errorResponse(400, "UPLOAD_FAILED", `Upload failed: ${uploadError.message}`);

    // ===== Extract text =====
    const { text: extractedText, method: extractionMethod } = await extractTextFromFile(fileBytes, file.type);
    if (extractedText.length < 100) return errorResponse(400, "INSUFFICIENT_TEXT", "Could not extract sufficient text from the file. Please upload a text-based PDF or DOCX.");

    const truncatedText = extractedText.substring(0, 12000);
    const ximatarId = resolvedXimatarKey;

    console.log(JSON.stringify({ type: "request", correlation_id: correlationId, function_name: "analyze-cv", text_length: truncatedText.length, extraction_method: extractionMethod, ximatar_id: ximatarId }));

    // ===== Detect language =====
    const detectedLanguage = detectLanguage(truncatedText);

    // ===== Load AI context & build prompt =====
    let contextBlock = "";
    if (loadUserAiContext && buildContextBlock) {
      try {
        const userContext = await loadUserAiContext(user.id);
        contextBlock = buildContextBlock(userContext);
      } catch (e) {
        console.warn("[analyze-cv] AI context load failed:", e instanceof Error ? e.message : e);
      }
    }

    const systemPrompt = buildSystemPrompt(ximatarId, ximatarName, ximatarTitle, pillarScores, detectedLanguage) + contextBlock;
    const userMessage = buildUserMessage(truncatedText, ximatarId, ximatarName, ximatarTitle, pillarScores);

    const ipHash = hashForAudit ? await hashForAudit(req.headers.get("x-forwarded-for") || "unknown") : await hashForAuditFallback(req.headers.get("x-forwarded-for") || "unknown");

    // ===== Call Claude (with fallback) =====
    let aiResult: { content: string; model: string; latencyMs: number; requestId: string };
    try {
      aiResult = await callClaudeDirectly(systemPrompt, userMessage);
    } catch (aiErr: any) {
      console.error("[analyze-cv] AI call failed:", aiErr.message);
      if (aiErr.statusCode === 402) return errorResponse(402, "INSUFFICIENT_CREDITS", aiErr.message);
      return errorResponse(502, "AI_CALL_FAILED", "AI analysis failed. Please try again.");
    }

    // ===== Parse & validate response =====
    let jsonStr: string;
    if (extractJsonFromAiContent) {
      try { jsonStr = extractJsonFromAiContent(aiResult.content); } catch { jsonStr = extractJsonRobust(aiResult.content); }
    } else {
      jsonStr = extractJsonRobust(aiResult.content);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_parseErr) {
      console.error("[analyze-cv] JSON parse failed. Raw preview:", aiResult.content.substring(0, 500));
      return errorResponse(502, "AI_PARSE_FAILED", "AI analysis did not return valid JSON. Please try again.");
    }

    const validated = validateAnalyzeCvResponse(parsed);
    if (!validated) {
      console.error(JSON.stringify({ type: "validation_error", correlation_id: correlationId, function_name: "analyze-cv" }));
      return errorResponse(502, "AI_PARSE_FAILED", "AI analysis did not return valid results. Please try again.");
    }

    const { credentials, identity } = validated;

    // ===== Service role client for upserts =====
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ===== Store credentials (Layer B) =====
    const location = credentials.location || {};
    try {
      await serviceClient.from("cv_credentials").upsert({
        user_id: user.id,
        full_name: credentials.full_name || null,
        email: credentials.email || null,
        phone: credentials.phone || null,
        location_city: location.city || null,
        location_region: location.region || null,
        location_country: location.country || null,
        nationality: credentials.nationality || null,
        date_of_birth: credentials.date_of_birth || null,
        linkedin_url: credentials.linkedin_url || null,
        portfolio_url: credentials.portfolio_url || null,
        education: credentials.education || [],
        work_experience: credentials.work_experience || [],
        hard_skills: credentials.hard_skills || [],
        certifications: credentials.certifications || [],
        languages: credentials.languages || [],
        total_years_experience: credentials.total_years_experience ?? null,
        seniority_level: credentials.seniority_level || null,
        industries_worked: credentials.industries_worked || [],
        career_trajectory: credentials.career_trajectory || null,
        cv_language: detectedLanguage,
        publications: credentials.publications || [],
        patents: credentials.patents || [],
        awards: credentials.awards || [],
        volunteer_work: credentials.volunteer_work || [],
        professional_associations: credentials.professional_associations || [],
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    } catch (e) {
      console.warn("[analyze-cv] cv_credentials upsert failed:", e instanceof Error ? e.message : e);
    }

    // ===== Store identity analysis (Layer A) =====
    const archetype = identity.cv_archetype || {};
    const tension = identity.tension || {};
    const improvements = identity.improvements || {};
    const roleFit = identity.role_fit || {};
    const mentorHook = identity.mentor_hook || {};

    try {
      await serviceClient.from("cv_identity_analysis").upsert({
        user_id: user.id,
        cv_archetype_primary: archetype.primary || ximatarId,
        cv_archetype_secondary: archetype.secondary || null,
        cv_archetype_explanation: archetype.explanation || null,
        cv_pillar_scores: identity.cv_pillar_scores,
        assessment_ximatar: ximatarId,
        assessment_pillar_scores: pillarScores,
        alignment_score: tension.alignment_score ?? null,
        tension_gaps: tension.primary_gaps || null,
        tension_narrative: tension.overall_narrative || null,
        technical_improvements: improvements.technical || null,
        identity_improvements: improvements.identity_aligned || null,
        cv_qualified_roles: roleFit.cv_qualified_roles || [],
        archetype_aligned_roles: roleFit.archetype_aligned_roles || [],
        growth_bridge_roles: roleFit.growth_bridge_roles || [],
        mentor_suggested_focus: mentorHook.suggested_focus || null,
        mentor_key_question: mentorHook.key_question || null,
        cv_language: detectedLanguage,
        analysis_model: aiResult.model,
        correlation_id: correlationId,
      }, { onConflict: "user_id" });
    } catch (e) {
      console.warn("[analyze-cv] cv_identity_analysis upsert failed:", e instanceof Error ? e.message : e);
    }

    // ===== Update profiles (backward compat) =====
    const cvScores = {
      computational_power: identity.cv_pillar_scores.computational_power,
      communication: identity.cv_pillar_scores.communication,
      knowledge: identity.cv_pillar_scores.knowledge,
      creativity: identity.cv_pillar_scores.creativity,
      drive: identity.cv_pillar_scores.drive,
    };

    try {
      await serviceClient.from("profiles").update({
        cv_scores: cvScores,
        cv_comments: tension.overall_narrative ? { summary: tension.overall_narrative } : null,
      }).eq("user_id", user.id);
    } catch (e) {
      console.warn("[analyze-cv] profiles update failed:", e instanceof Error ? e.message : e);
    }

    // ===== Upsert assessment_cv_analysis (backward compat) =====
    try {
      await serviceClient.from("assessment_cv_analysis").delete().eq("user_id", user.id);
      await serviceClient.from("assessment_cv_analysis").insert({
        user_id: user.id,
        cv_text: truncatedText.substring(0, 2000),
        summary: tension.overall_narrative || archetype.explanation || "",
        strengths: credentials.hard_skills?.slice(0, 5)?.map((s: any) => s.name || String(s)) || [],
        soft_skills: [],
        pillar_vector: cvScores,
        ximatar_suggestions: [archetype.primary, archetype.secondary].filter(Boolean),
      });
    } catch (e) {
      console.warn("[analyze-cv] assessment_cv_analysis upsert failed:", e instanceof Error ? e.message : e);
    }

    // ===== Audit event (optional) =====
    if (emitAuditEventWithMetric) {
      try {
        emitAuditEventWithMetric({
          actorType: "candidate", actorId: user.id, action: "cv.analyzed",
          entityType: "cv_analysis", entityId: user.id, correlationId,
          metadata: { extraction_method: extractionMethod, detected_language: detectedLanguage, text_length: truncatedText.length, ximatar_id: ximatarId, cv_archetype: archetype.primary, alignment_score: tension.alignment_score, model: aiResult.model, latency_ms: aiResult.latencyMs },
          ipHash,
        }, "cv_analyses");
      } catch (e) {
        console.warn("[analyze-cv] audit event failed:", e instanceof Error ? e.message : e);
      }
    }

    console.log(JSON.stringify({ type: "success", correlation_id: correlationId, function_name: "analyze-cv", ximatar: ximatarId, cv_archetype: archetype.primary }));

    // ===== Record AI call and cache result (optional) =====
    const responsePayload = {
      success: true,
      cv_archetype: identity.cv_archetype,
      cv_pillar_scores: identity.cv_pillar_scores,
      tension: identity.tension,
      improvements: identity.improvements,
      role_fit: identity.role_fit,
      mentor_hook: identity.mentor_hook,
      seniority_level: credentials.seniority_level,
      total_years_experience: credentials.total_years_experience,
      career_trajectory: credentials.career_trajectory,
      education_count: credentials.education?.length ?? 0,
      skills_count: credentials.hard_skills?.length ?? 0,
      detected_language: detectedLanguage,
      extraction_method: extractionMethod,
      assessment_ximatar: ximatarId,
    };

    if (recordAiCall) {
      try { await recordAiCall(user.id, "analyze-cv"); } catch (e) { console.warn("[analyze-cv] recordAiCall failed:", e instanceof Error ? e.message : e); }
    }
    if (cacheAiResult) {
      try { await cacheAiResult(user.id, "analyze-cv", responsePayload); } catch (e) { console.warn("[analyze-cv] cacheAiResult failed:", e instanceof Error ? e.message : e); }
    }

    // ===== Update progressive AI context (optional) =====
    if (updateUserAiContext && computeFileHash) {
      try {
        const cvFileHash = await computeFileHash(fileBytes);
        await updateUserAiContext(user.id, {
          cv_credentials_summary: {
            full_name: credentials.full_name,
            total_years_experience: credentials.total_years_experience,
            seniority_level: credentials.seniority_level,
            top_skills: credentials.hard_skills?.slice(0, 8)?.map((s: any) => s.name || String(s)),
            education_summary: credentials.education?.[0] ? `${credentials.education[0].degree_type} ${credentials.education[0].field_of_study} @ ${credentials.education[0].institution}` : null,
            industries: credentials.industries_worked?.slice(0, 5),
            career_trajectory: credentials.career_trajectory,
          },
          cv_identity_summary: {
            cv_archetype: archetype.primary,
            alignment_score: tension.alignment_score,
            top_tensions: tension.primary_gaps?.slice(0, 3)?.map((g: any) => `${g.pillar} ${g.gap_direction} (CV ${g.cv_score} vs Assessment ${g.ximatar_score})`),
            narrative_snippet: tension.overall_narrative?.substring(0, 200),
          },
          cv_language: detectedLanguage,
          cv_analyzed_at: new Date().toISOString(),
          cv_extracted_text: truncatedText.substring(0, 3000),
          cv_extraction_method: extractionMethod,
          cv_file_hash: cvFileHash,
        });
      } catch (e) {
        console.warn("[analyze-cv] AI context update failed:", e instanceof Error ? e.message : e);
      }
    }

    return jsonResponse({
      ...responsePayload,
      _budget: {
        exceeded: false,
        calls_used: (budgetResult.calls_used ?? 0) + 1,
        calls_limit: budgetResult.calls_limit ?? 999,
        tier: budgetResult.tier ?? "unknown",
      },
    });
  } catch (err: any) {
    console.error(JSON.stringify({
      type: "unhandled_error", correlation_id: correlationId, function_name: "analyze-cv",
      error: err instanceof Error ? err.message : "Unknown error",
    }));
    if (err.statusCode && err.errorCode) return errorResponse(err.statusCode, err.errorCode, err.message);
    return errorResponse(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "An unexpected error occurred");
  }
});
