/**
 * XIMA Guest CV Analysis — anonymous variant of analyze-cv
 *
 * Anonymous endpoint (verify_jwt = false) used by guests during the
 * /ximatar-journey flow BEFORE registration. Performs a single Claude call
 * combining credential extraction + psychometric analysis, then returns the
 * JSON to the client. NO database persistence of CV content or analysis —
 * the client stores results in sessionStorage and claims them via
 * syncGuestCvToProfile() at register time.
 *
 * Hardening:
 *  - Mandatory `x-guest-consent: 1` header (explicit consent before processing).
 *  - 5 MB file cap + mime allowlist + magic-bytes validation.
 *  - DB-backed rate limit: 5 calls/hour per sha256(client IP), stored in
 *    public.guest_rate_limit. RLS restricts the table to service_role only,
 *    so this function MUST use SUPABASE_SERVICE_ROLE_KEY for the limit check.
 *    If the rate-limit upsert fails for any reason, the request is REJECTED
 *    (fail-closed) — we never silently bypass the limit.
 *  - Requires guest_pillar_scores + guest_ximatar in form-data (psychometric
 *    tension cannot be computed without the assessment baseline).
 */

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";

// =====================================================
// Constants
// =====================================================
const RATE_LIMIT_MAX = 5;          // max calls
const RATE_LIMIT_WINDOW_MIN = 60;  // per 60 minutes
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (stricter than auth variant)
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

// =====================================================
// Helpers
// =====================================================

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function extractClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Atomic-ish rate limit using ON CONFLICT increment. Returns:
 *   { allowed: true, count }  → request may proceed
 *   { allowed: false, count } → 429 must be returned
 * Throws on infrastructure failure (caller must treat as 503, NOT bypass).
 */
async function enforceRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  ipHash: string,
  correlationId: string,
): Promise<{ allowed: boolean; count: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0); // truncate to hour, matches table default

  // Try insert first row; if conflict, increment.
  const { data: inserted, error: insertErr } = await serviceClient
    .from("guest_rate_limit")
    .insert({ ip_hash: ipHash, window_start: windowStart.toISOString(), count: 1 })
    .select("count")
    .maybeSingle();

  if (!insertErr && inserted) {
    return { allowed: true, count: 1 };
  }

  // Conflict (or other error) — try to fetch & increment.
  const { data: existing, error: fetchErr } = await serviceClient
    .from("guest_rate_limit")
    .select("id, count")
    .eq("ip_hash", ipHash)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (fetchErr || !existing) {
    // Surface the underlying error so the caller can fail-closed.
    console.error(JSON.stringify({
      type: "rate_limit_infra_error",
      correlation_id: correlationId,
      insert_error: insertErr?.message,
      fetch_error: fetchErr?.message,
    }));
    throw new Error(`rate_limit_infra: ${insertErr?.message || fetchErr?.message || "unknown"}`);
  }

  const newCount = (existing.count as number) + 1;
  if (newCount > RATE_LIMIT_MAX) {
    return { allowed: false, count: existing.count as number };
  }

  const { error: updateErr } = await serviceClient
    .from("guest_rate_limit")
    .update({ count: newCount, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (updateErr) {
    console.error(JSON.stringify({
      type: "rate_limit_update_error",
      correlation_id: correlationId,
      error: updateErr.message,
    }));
    throw new Error(`rate_limit_update: ${updateErr.message}`);
  }

  return { allowed: true, count: newCount };
}

async function callClaude(system: string, userContent: any[] | string, maxTokens = 6000) {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (errText.toLowerCase().includes("credit balance is too low")) {
      throw Object.assign(new Error("AI credits exhausted"), { statusCode: 402 });
    }
    throw new Error(`Anthropic ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || "";
  if (!content) throw new Error("Empty AI response");
  return content as string;
}

function extractJsonRobust(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) t = fence[1].trim();
  if (!t.startsWith("{")) {
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first !== -1 && last > first) t = t.substring(first, last + 1);
  }
  return t;
}

function buildSystemPrompt(
  ximatarId: string,
  ximatarName: string,
  pillarScores: Record<string, number>,
): string {
  return `You are the XIMA CV Intelligence Engine — guest variant.

The candidate has completed the XIMA assessment but is NOT yet registered.
- XIMAtar archetype: ${ximatarId} — ${ximatarName}
- Assessment pillar scores: Drive ${pillarScores.drive ?? "N/A"}, Computational Power ${pillarScores.computational_power ?? "N/A"}, Communication ${pillarScores.communication ?? "N/A"}, Creativity ${pillarScores.creativity ?? "N/A"}, Knowledge ${pillarScores.knowledge ?? "N/A"}

Perform two tasks on the CV:
1. CREDENTIAL EXTRACTION — extract education, work_experience, hard_skills, certifications, languages, total_years_experience, seniority_level, industries_worked, career_trajectory. If a field is absent use null/[].
2. PSYCHOMETRIC IDENTITY ANALYSIS — score CV on the same 5 pillars (0-100), identify CV archetype, compute tension (per-pillar gaps + alignment_score 0-100), provide improvements (technical + identity_aligned) and role_fit (cv_qualified_roles, archetype_aligned_roles, growth_bridge_roles), plus mentor_hook.

Detect the CV language automatically and write narratives in that language. Keep JSON field names in English.

Return ONLY valid JSON with this exact shape:
{
  "credentials": {
    "full_name": null, "email": null, "phone": null,
    "location": { "city": null, "region": null, "country": null },
    "linkedin_url": null, "portfolio_url": null,
    "education": [], "work_experience": [], "hard_skills": [],
    "certifications": [], "languages": [],
    "total_years_experience": 0, "seniority_level": "junior",
    "industries_worked": [], "career_trajectory": "specialist"
  },
  "identity": {
    "cv_archetype": { "primary": "ximatar_id", "secondary": null, "explanation": "" },
    "cv_pillar_scores": { "drive": 0, "computational_power": 0, "communication": 0, "creativity": 0, "knowledge": 0 },
    "tension": { "alignment_score": 0, "primary_gaps": [], "overall_narrative": "" },
    "improvements": { "technical": [], "identity_aligned": [] },
    "role_fit": { "cv_qualified_roles": [], "archetype_aligned_roles": [], "growth_bridge_roles": [] },
    "mentor_hook": { "suggested_focus": "", "key_question": "" }
  }
}`;
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
    // ===== 1. Consent header (mandatory) =====
    if (req.headers.get("x-guest-consent") !== "1") {
      return errorResponse(403, "CONSENT_REQUIRED", "Guest CV processing requires explicit consent (x-guest-consent header).");
    }

    // ===== 2. Service-role client (required for rate-limit table) =====
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      console.error(JSON.stringify({ type: "config_error", correlation_id: correlationId, error: "missing SUPABASE_SERVICE_ROLE_KEY" }));
      return errorResponse(503, "SERVICE_UNAVAILABLE", "Server misconfigured.");
    }
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // ===== 3. Rate limit (fail-closed) =====
    const clientIp = extractClientIp(req);
    const ipHash = await sha256Hex(clientIp);

    let limitResult: { allowed: boolean; count: number };
    try {
      limitResult = await enforceRateLimit(serviceClient, ipHash, correlationId);
    } catch (e) {
      // Infrastructure failure — DO NOT bypass; reject with 503.
      return errorResponse(503, "RATE_LIMIT_UNAVAILABLE", "Rate limit check failed. Please retry.");
    }

    if (!limitResult.allowed) {
      console.log(JSON.stringify({
        type: "rate_limit_block",
        correlation_id: correlationId,
        function_name: "analyze-cv-guest",
        count: limitResult.count,
        limit: RATE_LIMIT_MAX,
      }));
      return errorResponse(429, "RATE_LIMIT_EXCEEDED", `Too many requests. Try again in ${RATE_LIMIT_WINDOW_MIN} minutes.`);
    }

    // ===== 4. Parse form =====
    const formData = await req.formData();
    const file = formData.get("file");
    const guestPillarRaw = formData.get("guest_pillar_scores");
    const guestXimatar = formData.get("guest_ximatar");
    const guestXimatarName = formData.get("guest_ximatar_name");

    if (!file || !(file instanceof File)) {
      return errorResponse(400, "INVALID_INPUT", "File missing or invalid.");
    }

    // Assessment context is OPTIONAL at guest upload time: in the /ximatar-journey
    // flow, CV upload (step 1) can happen before the XIMAtar assessment (step 2).
    // The client claim (syncGuestCvToProfile) overwrites assessment_ximatar and
    // assessment_pillar_scores at register time using the real assessment values.
    let pillarScores: Record<string, number> = {};
    if (typeof guestPillarRaw === "string" && guestPillarRaw.length > 0) {
      try {
        pillarScores = JSON.parse(guestPillarRaw);
      } catch {
        return errorResponse(400, "INVALID_PILLAR_SCORES", "guest_pillar_scores must be valid JSON.");
      }
    }

    const ximatarId = typeof guestXimatar === "string" && guestXimatar ? guestXimatar.toLowerCase() : "";
    const ximatarName = typeof guestXimatarName === "string" && guestXimatarName ? guestXimatarName : ximatarId;

    // ===== 5. File validation =====
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(400, "FILE_TOO_LARGE", "Maximum 5MB allowed for guest uploads.");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(400, "INVALID_FILE_TYPE", "Only PDF, DOC, DOCX, TXT allowed.");
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // Magic bytes
    if (file.type === "application/pdf") {
      const isPDF = fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46;
      if (!isPDF) return errorResponse(400, "INVALID_FILE_CONTENT", "PDF magic bytes mismatch.");
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const isZip = fileBytes[0] === 0x50 && fileBytes[1] === 0x4b && fileBytes[2] === 0x03 && fileBytes[3] === 0x04;
      if (!isZip) return errorResponse(400, "INVALID_FILE_CONTENT", "DOCX magic bytes mismatch.");
    } else if (file.type === "application/msword") {
      const isDoc = fileBytes[0] === 0xd0 && fileBytes[1] === 0xcf && fileBytes[2] === 0x11 && fileBytes[3] === 0xe0;
      if (!isDoc) return errorResponse(400, "INVALID_FILE_CONTENT", "DOC magic bytes mismatch.");
    }

    // ===== 6. Build Claude input =====
    const systemPrompt = buildSystemPrompt(ximatarId, ximatarName, pillarScores);

    let userContent: any[] | string;
    if (file.type === "application/pdf") {
      // Base64 in chunks
      let base64 = "";
      const CHUNK = 8192;
      for (let i = 0; i < fileBytes.length; i += CHUNK) {
        const chunk = fileBytes.subarray(i, Math.min(i + CHUNK, fileBytes.length));
        base64 += String.fromCharCode(...chunk);
      }
      base64 = btoa(base64);
      userContent = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: `Analyze this CV against XIMAtar ${ximatarId} (${ximatarName}). Return ONLY the JSON specified.` },
      ];
    } else {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes).substring(0, 12000);
      if (text.length < 100) {
        return errorResponse(400, "INSUFFICIENT_TEXT", "Could not extract sufficient text from the file.");
      }
      userContent = `Here is the candidate's CV text:\n\n---\n${text}\n---\n\nReturn ONLY the JSON object specified.`;
    }

    // ===== 7. Call Claude =====
    let aiContent: string;
    try {
      aiContent = await callClaude(systemPrompt, userContent);
    } catch (aiErr: any) {
      console.error(JSON.stringify({ type: "ai_error", correlation_id: correlationId, error: aiErr.message }));
      if (aiErr.statusCode === 402) return errorResponse(402, "INSUFFICIENT_CREDITS", "AI credits exhausted.");
      return errorResponse(502, "AI_CALL_FAILED", "AI analysis failed. Please try again.");
    }

    // ===== 8. Parse JSON =====
    let parsed: any;
    try {
      parsed = JSON.parse(extractJsonRobust(aiContent));
    } catch (e) {
      console.error(JSON.stringify({ type: "parse_error", correlation_id: correlationId, snippet: aiContent.substring(0, 200) }));
      return errorResponse(502, "AI_PARSE_FAILED", "AI did not return valid JSON.");
    }

    if (!parsed.credentials || !parsed.identity) {
      return errorResponse(502, "AI_PARSE_FAILED", "AI response missing credentials/identity sections.");
    }

    // Defensive defaults
    const ident = parsed.identity;
    if (!ident.cv_pillar_scores || typeof ident.cv_pillar_scores !== "object") {
      ident.cv_pillar_scores = { drive: 0, computational_power: 0, communication: 0, creativity: 0, knowledge: 0 };
    }
    for (const p of ["drive", "computational_power", "communication", "creativity", "knowledge"]) {
      const v = Number(ident.cv_pillar_scores[p]);
      ident.cv_pillar_scores[p] = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
    }
    if (!ident.cv_archetype) ident.cv_archetype = { primary: ximatarId, secondary: null, explanation: "" };
    if (!ident.tension) ident.tension = { alignment_score: 0, primary_gaps: [], overall_narrative: "" };
    if (!ident.improvements) ident.improvements = { technical: [], identity_aligned: [] };
    if (!ident.role_fit) ident.role_fit = { cv_qualified_roles: [], archetype_aligned_roles: [], growth_bridge_roles: [] };
    if (!ident.mentor_hook) ident.mentor_hook = { suggested_focus: "", key_question: "" };

    console.log(JSON.stringify({
      type: "success",
      correlation_id: correlationId,
      function_name: "analyze-cv-guest",
      rate_count: limitResult.count,
      cv_archetype: ident.cv_archetype?.primary,
      assessment_ximatar: ximatarId,
    }));

    // ===== 9. Return — NO DB persistence =====
    return jsonResponse({
      success: true,
      credentials: parsed.credentials,
      identity: ident,
      assessment_ximatar: ximatarId,
      assessment_pillar_scores: pillarScores,
      correlation_id: correlationId,
    });
  } catch (err) {
    console.error(JSON.stringify({
      type: "unexpected_error",
      correlation_id: correlationId,
      function_name: "analyze-cv-guest",
      error: err instanceof Error ? err.message : String(err),
    }));
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
});
