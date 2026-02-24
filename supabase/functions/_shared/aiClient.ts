/**
 * Shared AI Gateway Client — v1.2 Enterprise Edition (Hardened)
 * 
 * Unified wrapper for Lovable AI Gateway calls across all edge functions.
 * Provides structured logging, correlation IDs, error handling, response parsing,
 * and persistent AI Invocation Envelope logging for enterprise auditability.
 * 
 * GOVERNANCE: prompt_hash now covers system+user+temperature+max_tokens+hidden_instructions
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================================================
// AI GOVERNANCE CONSTANTS (v1.2 — Hardened)
// =====================================================
export const AI_PROVIDER = "lovable_gateway";
export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-2.5-flash";
export const DEFAULT_MODEL_VERSION = "2025-04-17";  // pinned provider snapshot
export const DEFAULT_TEMPERATURE = undefined; // provider default
export const PROMPT_TEMPLATE_VERSION = "1.0";
export const SCORING_SCHEMA_VERSION = "1.0";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiRequestOptions {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
  correlationId: string;
  functionName: string;
  /** Redacted input summary for audit log (no PII). E.g. "field=science_tech,lang=en,len=342" */
  inputSummary?: string;
  /** Override prompt template version (defaults to PROMPT_TEMPLATE_VERSION) */
  promptTemplateVersion?: string;
  /** Override scoring schema version (defaults to SCORING_SCHEMA_VERSION) */
  scoringSchemaVersion?: string;
}

export interface AiResponse {
  content: string;
  model: string;
  latencyMs: number;
  /** The request_id persisted to ai_invocation_log (if logging succeeded) */
  requestId: string;
}

export interface AiCallLog {
  correlation_id: string;
  function_name: string;
  model: string;
  latency_ms: number;
  status: "success" | "error" | "rate_limited" | "payment_required";
  error_code?: string;
  used_fallback?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate a correlation ID (UUID v4 compatible)
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Log a structured AI call entry to console (no PII)
 */
export function logAiCall(entry: AiCallLog): void {
  console.log(JSON.stringify({ type: "ai_call", ...entry }));
}

/**
 * Compute SHA-256 hash of the FULL invocation fingerprint for drift detection.
 * Includes: all message roles+content, temperature, max_tokens.
 * No raw prompt stored — only the hash.
 */
async function computePromptHash(
  messages: AiMessage[],
  temperature: number | undefined,
  maxTokens: number | undefined
): Promise<string> {
  // Build a deterministic canonical string covering all prompt inputs
  const parts: string[] = [];
  for (const m of messages) {
    parts.push(`[${m.role}]\n${m.content}`);
  }
  parts.push(`[params] temperature=${temperature ?? "default"} max_tokens=${maxTokens ?? "default"}`);
  const canonical = parts.join("\n===\n");
  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Persist AI invocation envelope to ai_invocation_log table.
 * Uses service_role key — bypasses RLS.
 * Fire-and-forget: errors are logged but never block the caller.
 */
async function persistInvocationEnvelope(envelope: {
  request_id: string;
  correlation_id: string;
  function_name: string;
  provider: string;
  model_name: string;
  model_version: string;
  temperature: number | null;
  max_tokens: number | null;
  prompt_hash: string;
  prompt_template_version: string;
  scoring_schema_version: string;
  input_summary: string | null;
  output_summary: string | null;
  status: string;
  error_code: string | null;
  latency_ms: number;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.warn("[ai_governance] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping envelope persistence");
      return;
    }
    const client = createClient(supabaseUrl, serviceKey);
    const { error } = await client.from("ai_invocation_log").insert(envelope);
    if (error) {
      console.error("[ai_governance] Failed to persist invocation envelope:", error.message);
    }
  } catch (e) {
    console.error("[ai_governance] Envelope persistence error:", e instanceof Error ? e.message : e);
  }
}

/**
 * Create a standard error response with CORS headers
 */
export function aiErrorResponse(
  statusCode: number,
  errorCode: string,
  message: string
): Response {
  return new Response(
    JSON.stringify({ error: message, error_code: errorCode }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Call the Lovable AI Gateway with structured logging + persistent envelope.
 * Returns parsed content string or throws.
 */
export async function callAiGateway(
  options: AiRequestOptions
): Promise<AiResponse> {
  const {
    messages, model, temperature, max_tokens, response_format,
    correlationId, functionName, inputSummary,
    promptTemplateVersion, scoringSchemaVersion,
  } = options;
  const selectedModel = model || DEFAULT_MODEL;
  const requestId = crypto.randomUUID();
  const ptv = promptTemplateVersion || PROMPT_TEMPLATE_VERSION;
  const ssv = scoringSchemaVersion || SCORING_SCHEMA_VERSION;

  // Compute prompt hash covering ALL inputs (system, user, params)
  const promptHash = await computePromptHash(messages, temperature, max_tokens);

  const baseEnvelope = {
    request_id: requestId,
    correlation_id: correlationId,
    function_name: functionName,
    provider: AI_PROVIDER,
    model_name: selectedModel,
    model_version: DEFAULT_MODEL_VERSION,
    temperature: temperature ?? null,
    max_tokens: max_tokens ?? null,
    prompt_hash: promptHash,
    prompt_template_version: ptv,
    scoring_schema_version: ssv,
    input_summary: inputSummary ?? null,
  };

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    logAiCall({
      correlation_id: correlationId,
      function_name: functionName,
      model: selectedModel,
      latency_ms: 0,
      status: "error",
      error_code: "MISSING_API_KEY",
    });
    await persistInvocationEnvelope({
      ...baseEnvelope,
      output_summary: null,
      status: "error",
      error_code: "MISSING_API_KEY",
      latency_ms: 0,
    });
    throw new AiGatewayError(500, "AI_NOT_CONFIGURED", "AI service not configured");
  }

  const body: Record<string, unknown> = {
    model: selectedModel,
    messages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (response_format) body.response_format = response_format;

  const start = Date.now();

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const status = response.status;
    let errorCode = "AI_GATEWAY_ERROR";
    let logStatus: AiCallLog["status"] = "error";

    if (status === 429) {
      errorCode = "RATE_LIMITED";
      logStatus = "rate_limited";
    } else if (status === 402) {
      errorCode = "PAYMENT_REQUIRED";
      logStatus = "payment_required";
    }

    logAiCall({
      correlation_id: correlationId,
      function_name: functionName,
      model: selectedModel,
      latency_ms: latencyMs,
      status: logStatus,
      error_code: errorCode,
    });

    const errorText = await response.text().catch(() => "");
    console.error(`[${functionName}] AI gateway error: ${status}`, errorText.substring(0, 200));

    await persistInvocationEnvelope({
      ...baseEnvelope,
      output_summary: `error:${errorCode}`,
      status: logStatus,
      error_code: errorCode,
      latency_ms: latencyMs,
    });

    throw new AiGatewayError(
      status === 429 ? 429 : status === 402 ? 402 : 502,
      errorCode,
      status === 429
        ? "Rate limit exceeded. Please try again later."
        : status === 402
        ? "AI credits exhausted. Please add credits."
        : "AI service error"
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    logAiCall({
      correlation_id: correlationId,
      function_name: functionName,
      model: selectedModel,
      latency_ms: latencyMs,
      status: "error",
      error_code: "EMPTY_RESPONSE",
    });

    await persistInvocationEnvelope({
      ...baseEnvelope,
      output_summary: "empty_response",
      status: "error",
      error_code: "EMPTY_RESPONSE",
      latency_ms: latencyMs,
    });

    throw new AiGatewayError(502, "AI_EMPTY_RESPONSE", "Empty response from AI");
  }

  logAiCall({
    correlation_id: correlationId,
    function_name: functionName,
    model: selectedModel,
    latency_ms: latencyMs,
    status: "success",
  });

  // Persist success envelope (fire-and-forget, redacted output only)
  const outputLen = content.length;
  const redactedOutput = `len=${outputLen},truncated=${content.substring(0, 60).replace(/[^a-zA-Z0-9_:={},\s]/g, '.')}`;

  persistInvocationEnvelope({
    ...baseEnvelope,
    output_summary: redactedOutput,
    status: "success",
    error_code: null,
    latency_ms: latencyMs,
  }); // intentionally not awaited on success path for latency

  return { content, model: selectedModel, latencyMs, requestId };
}

/**
 * Extract JSON from AI response content (handles markdown code blocks)
 */
export function extractJsonFromAiContent(content: string): string {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : content.trim();
}

/**
 * Custom error for AI gateway failures
 */
export class AiGatewayError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "AiGatewayError";
  }

  toResponse(): Response {
    return aiErrorResponse(this.statusCode, this.errorCode, this.message);
  }
}
