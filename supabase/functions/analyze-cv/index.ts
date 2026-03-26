/**
 * XIMA CV Intelligence Engine v2.0
 *
 * Dual-layer analysis:
 *   Layer A (Identity) — psychometric tension between XIMAtar assessment and CV
 *   Layer B (Credentials) — exhaustive structured extraction for B2B matching
 *
 * Model: Claude claude-sonnet-4-20250514 (Anthropic direct API)
 * Prompt template: 2.0 | Scoring schema: 1.0
 */

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractJsonFromAiContent, generateCorrelationId, SCORING_SCHEMA_VERSION } from "../_shared/aiClient.ts";
import { validateCvAnalysis } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric, hashForAudit } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES, type XimatarPillars } from "../_shared/ximatarTaxonomy.ts";
import { checkAiBudget, recordAiCall, cacheAiResult } from "../_shared/aiBudget.ts";

// =====================================================
// Helper 1: Text extraction from file bytes
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

  // PDF — try regex first, then Claude vision fallback
  if (mimeType === "application/pdf") {
    // Attempt 1: regex-based extraction (works for uncompressed PDFs)
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
      if (inner.length > 3 && /[a-zA-ZÀ-ÿ\s]/.test(inner)) {
        textParts.push(inner);
      }
    }

    const regexText = textParts.join(" ").trim();
    if (regexText.length > 200) {
      console.log(`[extract] pdf-regex extracted ${regexText.length} chars`);
      return { text: regexText.substring(0, 15000), method: "pdf-regex" };
    }

    // Attempt 2: readable ASCII strings fallback
    const readable = rawText.match(/[\x20-\x7E\xC0-\xFF]{10,}/g) || [];
    const filtered = readable.filter(
      (s: string) => /[a-zA-ZÀ-ÿ]{3,}/.test(s) && !/^[%\/\[\]<>{}]+$/.test(s)
    );
    const fallbackText = filtered.join("\n").trim();
    if (fallbackText.length > 200) {
      console.log(`[extract] pdf-ascii-fallback extracted ${fallbackText.length} chars`);
      return { text: fallbackText.substring(0, 15000), method: "pdf-ascii-fallback" };
    }

    // Attempt 3: Claude vision — send PDF as base64 document for Claude to read
    console.log("[extract] Text extraction insufficient, using Claude vision to read PDF");
    try {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (ANTHROPIC_API_KEY) {
        // Convert to base64
        const binaryStr = Array.from(fileBytes).map(b => String.fromCharCode(b)).join("");
        const base64Pdf = btoa(binaryStr);

        const visionResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages: [{
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: base64Pdf,
                  },
                },
                {
                  type: "text",
                  text: "Extract all text from this PDF document. Return ONLY the raw text content, preserving section headings and structure. No commentary."
                }
              ]
            }],
          }),
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const visionText = visionData.content?.[0]?.text || "";
          if (visionText.length > 50) {
            console.log(`[extract] claude-vision-pdf extracted ${visionText.length} chars`);
            return { text: visionText.substring(0, 15000), method: "claude-vision-pdf" };
          }
        } else {
          console.warn(`[extract] Claude vision failed: ${visionResponse.status}`);
        }
      }
    } catch (visionErr) {
      console.warn("[extract] Claude vision fallback error:", visionErr instanceof Error ? visionErr.message : "unknown");
    }

    // Return whatever we have
    return { text: (fallbackText || regexText).substring(0, 15000), method: "pdf-regex-fallback" };
  }

  // DOC (legacy binary)
  const rawText = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
  const readable = rawText.match(/[\x20-\x7E\xC0-\xFF]{8,}/g) || [];
  const filtered = readable.filter((s: string) => /[a-zA-ZÀ-ÿ]{3,}/.test(s));
  return { text: filtered.join("\n").substring(0, 15000), method: "doc-strings" };
}

// =====================================================
// Helper 2: Language detection
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
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  return bestScore >= 2 ? bestLang : "en";
}

// =====================================================
// Helper 3: Anthropic API caller with audit envelope
// =====================================================

interface AnthropicCallOptions {
  system: string;
  userMessage: string;
  correlationId: string;
  functionName: string;
  inputSummary?: string;
  model?: string;
  maxTokens?: number;
}

interface AnthropicCallResult {
  content: string;
  model: string;
  latencyMs: number;
  requestId: string;
}

class AnalyzeCvAnthropicError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "AnalyzeCvAnthropicError";
  }
}

function parseAnalyzeCvAnthropicError(responseStatus: number, errorText: string) {
  let apiMessage = `Anthropic API error: ${responseStatus}`;

  try {
    const parsed = JSON.parse(errorText);
    const candidateMessage = parsed?.error?.message;
    if (typeof candidateMessage === "string" && candidateMessage.trim()) {
      apiMessage = candidateMessage.trim();
    }
  } catch {
    if (errorText.trim()) {
      apiMessage = errorText.trim().slice(0, 500);
    }
  }

  const normalizedMessage = apiMessage.toLowerCase();

  if (normalizedMessage.includes("credit balance is too low") || normalizedMessage.includes("purchase credits")) {
    return {
      statusCode: 402,
      errorCode: "INSUFFICIENT_CREDITS",
      message: "Anthropic credits are too low to process this request. Please add more credits in Plans & Billing and try again.",
    };
  }

  if (responseStatus === 429) {
    return {
      statusCode: 429,
      errorCode: "RATE_LIMITED",
      message: "Rate limited — please try again shortly",
    };
  }

  if (responseStatus === 400) {
    return {
      statusCode: 400,
      errorCode: "INVALID_REQUEST",
      message: apiMessage,
    };
  }

  return {
    statusCode: 502,
    errorCode: `ANTHROPIC_${responseStatus}`,
    message: apiMessage,
  };
}

async function callAnthropicApi(options: AnthropicCallOptions): Promise<AnthropicCallResult> {
  const {
    system,
    userMessage,
    correlationId,
    functionName,
    inputSummary,
    model = "claude-sonnet-4-20250514",
    maxTokens = 8192,
  } = options;

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const requestId = crypto.randomUUID();

  // Compute prompt hash for audit
  const canonical = `[system]\n${system}\n===\n[user]\n${userMessage}\n===\n[params] temperature=default max_tokens=${maxTokens}`;
  const hashData = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
  const promptHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const baseEnvelope = {
    request_id: requestId,
    correlation_id: correlationId,
    function_name: functionName,
    provider: "anthropic",
    model_name: model,
    model_version: "2025-05-14",
    temperature: null as number | null,
    max_tokens: maxTokens,
    prompt_hash: promptHash,
    prompt_template_version: "2.0",
    scoring_schema_version: SCORING_SCHEMA_VERSION,
    input_summary: inputSummary ?? null,
  };

  const persistEnvelope = async (extra: {
    output_summary: string | null;
    status: string;
    error_code: string | null;
    latency_ms: number;
  }) => {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceKey) return;
      const client = createClient(supabaseUrl, serviceKey);
      await client.from("ai_invocation_log").insert({ ...baseEnvelope, ...extra });
    } catch (e) {
      console.error("[ai_governance] Envelope error:", e instanceof Error ? e.message : e);
    }
  };

  const start = Date.now();
  const makeRequest = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

  let response: Response;
  let retried = false;
  try {
    response = await makeRequest();

    if ([429, 502, 503, 529].includes(response.status)) {
      console.log(
        JSON.stringify({ type: "anthropic_retry", correlation_id: correlationId, status: response.status })
      );
      await new Promise((r) => setTimeout(r, 2000));
      retried = true;
      response = await makeRequest();
    }
  } catch (fetchError) {
    const latencyMs = Date.now() - start;
    await persistEnvelope({ output_summary: null, status: "error", error_code: "NETWORK_ERROR", latency_ms: latencyMs });
    throw new AnalyzeCvAnthropicError(502, "NETWORK_ERROR", "Failed to reach Anthropic API");
  }

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`[analyze-cv] Anthropic error: ${response.status}`, errorText.substring(0, 300));
    const mappedError = parseAnalyzeCvAnthropicError(response.status, errorText);
    await persistEnvelope({
      output_summary: `error:${response.status}`,
      status: mappedError.statusCode === 429 ? "rate_limited" : "error",
      error_code: mappedError.errorCode,
      latency_ms: latencyMs,
    });
    throw new AnalyzeCvAnthropicError(mappedError.statusCode, mappedError.errorCode, mappedError.message);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    await persistEnvelope({ output_summary: "empty_response", status: "error", error_code: "EMPTY_RESPONSE", latency_ms: latencyMs });
    throw new Error("Empty response from Anthropic");
  }

  const redactedOutput = `len=${content.length},retried=${retried}`;
  persistEnvelope({ output_summary: redactedOutput, status: "success", error_code: null, latency_ms: latencyMs });

  console.log(
    JSON.stringify({
      type: "anthropic_success",
      correlation_id: correlationId,
      function_name: functionName,
      latency_ms: latencyMs,
      retried,
    })
  );

  return { content, model, latencyMs, requestId };
}

// =====================================================
// Helper 4: Claude prompt builder
// =====================================================

function buildSystemPrompt(
  ximatarId: string,
  ximatarName: string,
  ximatarTitle: string,
  assessmentScores: Record<string, number>,
  language: string
): string {
  const langNames: Record<string, string> = {
    it: "Italian", en: "English", pt: "Portuguese", es: "Spanish", de: "German", fr: "French",
  };
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
- PDF or DOC extraction may contain noise, broken spacing, or partial formatting artifacts. Clean and reconstruct meaning before scoring.
- Do NOT assign all five CV pillars as 0 unless the text is genuinely unreadable and no coherent education, experience, achievements, or skills can be recovered.
- If even partial evidence exists, assign conservative non-zero scores based on the recoverable signals.
- Treat extraction noise as a document-quality issue, not as proof that the candidate has no evidence.
- Reserve "corrupted", "unreadable", or "complete technical failure" language for cases where fewer than three coherent professional signals can be identified.

XIMA PHILOSOPHY — follow these principles:
- CVs are necessary but insufficient — they capture credentials, not identity
- Knowledge and credentials ARE important — XIMA does not dismiss them
- The tension between assessment and CV is a growth opportunity, not a failure
- Improvements help the person's CV tell their TRUE professional story
- The mentor session explores the real archetype and boosts growth, it does not judge

SCORING CALIBRATION for CV pillar scores:
- 0-20: No evidence or almost no recoverable evidence in the CV document
- 21-40: Minimal or indirect evidence
- 41-60: Moderate, typical for the role level
- 61-80: Strong evidence with concrete examples
- 81-100: Exceptional, clearly demonstrated

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
  cvText: string,
  ximatarId: string,
  ximatarName: string,
  ximatarTitle: string,
  assessmentScores: Record<string, number>
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
// Helper 5: Response validation
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
  const pillarFields = ["drive", "computational_power", "communication", "creativity", "knowledge"];
  for (const f of pillarFields) {
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
    if (!authHeader) {
      return unauthorizedResponse("Missing Authorization header");
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseAnonKey) {
      throw new Error("Missing Supabase publishable key in Edge Function environment");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return unauthorizedResponse("Authentication required. Please log in and try again.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return unauthorizedResponse("Authentication required. Please log in and try again.");
    }

    // ===== GDPR + XIMAtar fetch =====
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profiling_opt_out, ximatar_id, ximatar, ximatar_name, ximatar_storytelling, pillar_scores")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error(
        JSON.stringify({ type: "db_error", correlation_id: correlationId, function_name: "analyze-cv", error: "Profile fetch failed" })
      );
    }

    if (profile?.profiling_opt_out === true) {
      console.log(
        JSON.stringify({ type: "gdpr_block", correlation_id: correlationId, function_name: "analyze-cv", reason: "profiling_opt_out" })
      );
      return profilingOptOutResponse();
    }

    // ===== Check XIMAtar assessment exists =====
    // The `ximatar` column (enum) holds the taxonomy key like "owl"
    // The `ximatar_id` column (uuid) is a FK to the ximatars table
    const pillarScores = profile?.pillar_scores as Record<string, number> | null;
    let resolvedXimatarKey = (profile?.ximatar as string | null) || null;

    if (!resolvedXimatarKey && profile?.ximatar_id) {
      // Resolve UUID → taxonomy key via ximatars table
      const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: ximatarRecord } = await serviceClient
        .from("ximatars")
        .select("label")
        .eq("id", profile.ximatar_id as string)
        .maybeSingle();
      if (ximatarRecord?.label) {
        resolvedXimatarKey = ximatarRecord.label.toLowerCase();
      }
    }

    if (!resolvedXimatarKey || !pillarScores) {
      return errorResponse(
        400,
        "ASSESSMENT_REQUIRED",
        "Please complete the XIMA assessment before uploading your CV. Your XIMAtar identity is needed for CV analysis."
      );
    }

    // Look up XIMAtar profile from taxonomy
    const ximatarProfile = XIMATAR_PROFILES[resolvedXimatarKey];
    const ximatarName = (profile?.ximatar_name as string) || ximatarProfile?.name || resolvedXimatarKey;
    const ximatarTitle = ximatarProfile?.title || "";

    console.log(JSON.stringify({
      type: "ximatar_resolved",
      correlation_id: correlationId,
      ximatar_key: resolvedXimatarKey,
      ximatar_name: ximatarName,
    }));

    // ===== File validation =====
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse(400, "INVALID_INPUT", "File missing or invalid");
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(400, "FILE_TOO_LARGE", "File too large. Maximum 10MB allowed.");
    }

    const ALLOWED_TYPES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(400, "INVALID_FILE_TYPE", "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.");
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // Magic bytes validation
    if (file.type === "application/pdf") {
      const isPDF = fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46;
      if (!isPDF) {
        return errorResponse(400, "INVALID_FILE_CONTENT", "File claims to be PDF but content validation failed.");
      }
    }
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const isZip = fileBytes[0] === 0x50 && fileBytes[1] === 0x4b && fileBytes[2] === 0x03 && fileBytes[3] === 0x04;
      if (!isZip) {
        return errorResponse(400, "INVALID_FILE_CONTENT", "File claims to be DOCX but content validation failed.");
      }
    }
    if (file.type === "application/msword") {
      const isDoc = fileBytes[0] === 0xd0 && fileBytes[1] === 0xcf && fileBytes[2] === 0x11 && fileBytes[3] === 0xe0;
      if (!isDoc) {
        return errorResponse(400, "INVALID_FILE_CONTENT", "File claims to be DOC but content validation failed.");
      }
    }

    // ===== Upload to storage =====
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.\./g, "_").substring(0, 255);
    };
    const safeFilename = sanitizeFilename(file.name);
    const filename = `${Date.now()}_${safeFilename}`;
    const storagePath = `${user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage.from("cv-uploads").upload(storagePath, fileBytes, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) {
      return errorResponse(400, "UPLOAD_FAILED", `Upload failed: ${uploadError.message}`);
    }

    // ===== Extract text =====
    const { text: extractedText, method: extractionMethod } = await extractTextFromFile(fileBytes, file.type);

    if (extractedText.length < 100) {
      return errorResponse(400, "INSUFFICIENT_TEXT", "Could not extract sufficient text from the file. Please upload a text-based PDF or DOCX.");
    }

    const truncatedText = extractedText.substring(0, 12000);

    const ximatarId = resolvedXimatarKey;

    console.log(
      JSON.stringify({
        type: "request",
        correlation_id: correlationId,
        function_name: "analyze-cv",
        text_length: truncatedText.length,
        extraction_method: extractionMethod,
        ximatar_id: ximatarId,
      })
    );

    // ===== Detect language =====
    const detectedLanguage = detectLanguage(truncatedText);

    // ===== Build prompt & call Claude =====
    const systemPrompt = buildSystemPrompt(ximatarId, ximatarName, ximatarTitle, pillarScores, detectedLanguage);
    const userMessage = buildUserMessage(truncatedText, ximatarId, ximatarName, ximatarTitle, pillarScores);

    const ipHash = await hashForAudit(req.headers.get("x-forwarded-for") || "unknown");

    const aiResult = await callAnthropicApi({
      system: systemPrompt,
      userMessage,
      correlationId,
      functionName: "analyze-cv",
      inputSummary: `lang=${detectedLanguage},len=${truncatedText.length},ximatar=${ximatarId},method=${extractionMethod}`,
    });

    // ===== Parse & validate response =====
    const jsonStr = extractJsonFromAiContent(aiResult.content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_parseErr) {
      console.error(
        JSON.stringify({ type: "parse_error", correlation_id: correlationId, function_name: "analyze-cv", raw_length: aiResult.content.length })
      );
      return errorResponse(502, "AI_PARSE_FAILED", "AI analysis did not return valid JSON. Please try again.");
    }

    const validated = validateAnalyzeCvResponse(parsed);
    if (!validated) {
      console.error(
        JSON.stringify({ type: "validation_error", correlation_id: correlationId, function_name: "analyze-cv" })
      );
      return errorResponse(502, "AI_PARSE_FAILED", "AI analysis did not return valid results. Please try again.");
    }

    const { credentials, identity } = validated;

    // ===== Service role client for upserts =====
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ===== Store credentials (Layer B) =====
    const location = credentials.location || {};
    await serviceClient.from("cv_credentials").upsert(
      {
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
      },
      { onConflict: "user_id" }
    );

    // ===== Store identity analysis (Layer A) =====
    const archetype = identity.cv_archetype || {};
    const tension = identity.tension || {};
    const improvements = identity.improvements || {};
    const roleFit = identity.role_fit || {};
    const mentorHook = identity.mentor_hook || {};

    await serviceClient.from("cv_identity_analysis").upsert(
      {
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
      },
      { onConflict: "user_id" }
    );

    // ===== Update profiles (backward compat) =====
    const cvScores = {
      computational_power: identity.cv_pillar_scores.computational_power,
      communication: identity.cv_pillar_scores.communication,
      knowledge: identity.cv_pillar_scores.knowledge,
      creativity: identity.cv_pillar_scores.creativity,
      drive: identity.cv_pillar_scores.drive,
    };

    await serviceClient
      .from("profiles")
      .update({
        cv_scores: cvScores,
        cv_comments: tension.overall_narrative ? { summary: tension.overall_narrative } : null,
      })
      .eq("user_id", user.id);

    // ===== Upsert assessment_cv_analysis (backward compat) =====
    // Delete previous entries first, then insert fresh
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

    // ===== Audit event =====
    emitAuditEventWithMetric(
      {
        actorType: "candidate",
        actorId: user.id,
        action: "cv.analyzed",
        entityType: "cv_analysis",
        entityId: user.id,
        correlationId,
        metadata: {
          extraction_method: extractionMethod,
          detected_language: detectedLanguage,
          text_length: truncatedText.length,
          ximatar_id: ximatarId,
          cv_archetype: archetype.primary,
          alignment_score: tension.alignment_score,
          model: aiResult.model,
          latency_ms: aiResult.latencyMs,
        },
        ipHash,
      },
      "cv_analyses"
    );

    console.log(
      JSON.stringify({ type: "success", correlation_id: correlationId, function_name: "analyze-cv", ximatar: ximatarId, cv_archetype: archetype.primary })
    );

    // ===== Return response =====
    return jsonResponse({
      success: true,
      // Identity layer
      cv_archetype: identity.cv_archetype,
      cv_pillar_scores: identity.cv_pillar_scores,
      tension: identity.tension,
      improvements: identity.improvements,
      role_fit: identity.role_fit,
      mentor_hook: identity.mentor_hook,
      // Credential summary
      seniority_level: credentials.seniority_level,
      total_years_experience: credentials.total_years_experience,
      career_trajectory: credentials.career_trajectory,
      education_count: credentials.education?.length ?? 0,
      skills_count: credentials.hard_skills?.length ?? 0,
      // Meta
      detected_language: detectedLanguage,
      extraction_method: extractionMethod,
      assessment_ximatar: ximatarId,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        type: "unhandled_error",
        correlation_id: correlationId,
        function_name: "analyze-cv",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    );
    if (err instanceof AnalyzeCvAnthropicError) {
      return errorResponse(err.statusCode, err.errorCode, err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "An unexpected error occurred");
  }
});
