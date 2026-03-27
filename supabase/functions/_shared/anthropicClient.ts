/**
 * Shared Anthropic Client — v3.0
 * 
 * Direct Anthropic API wrapper for Claude calls.
 * Provides: smart model routing, retry logic, audit envelope logging,
 * cost estimation, structured error handling.
 * Coexists with aiClient.ts (which handles Lovable Gateway calls).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SCORING_SCHEMA_VERSION } from "./aiClient.ts";

/**
 * Model routing configuration.
 * Each function is assigned a model tier based on reasoning complexity.
 * 
 * SONNET: Complex psychometric reasoning, tension analysis, multi-layered output
 * HAIKU: Structured extraction, scoring, straightforward generation
 * 
 * Cost comparison (approximate per 1K tokens):
 * - Sonnet: $3 input / $15 output
 * - Haiku:  $0.25 input / $1.25 output
 */
const MODEL_ROUTING: Record<string, string> = {
  // SONNET — complex reasoning required
  "analyze-cv":                      "claude-sonnet-4-20250514",
  "generate-l3-interview":           "claude-sonnet-4-20250514",
  "analyze-l3-frames":               "claude-sonnet-4-20250514",
  "recommend-jobs":                  "claude-sonnet-4-20250514",
  "generate-company-profile":        "claude-sonnet-4-20250514",

  // HAIKU — structured tasks, cheaper model sufficient
  "generate-challenge":              "claude-haiku-4-5-20251001",
  "analyze-open-answer":             "claude-haiku-4-5-20251001",
  "generate-l2-challenge-from-job-post": "claude-haiku-4-5-20251001",
  "compute-level2-signals":          "claude-haiku-4-5-20251001",
  "recommend-mentors":               "claude-haiku-4-5-20251001",
  "generate-growth-path":            "claude-haiku-4-5-20251001",
  "generate-growth-test":            "claude-haiku-4-5-20251001",
  "evaluate-growth-test":            "claude-haiku-4-5-20251001",
  "send-challenge-invitation":       "claude-haiku-4-5-20251001",
  "contact-sales":                   "claude-haiku-4-5-20251001",
  "analyze-cv-pdf-extract":          "claude-haiku-4-5-20251001",
};

/**
 * Get the appropriate model for a function.
 * Falls back to Haiku if function is not in the routing table.
 */
export function getModelForFunction(functionName: string): string {
  return MODEL_ROUTING[functionName] || "claude-haiku-4-5-20251001";
}

// Approximate cost estimation per model (per 1K tokens)
const COST_PER_1K_INPUT: Record<string, number> = {
  "claude-sonnet-4-20250514": 0.003,
  "claude-haiku-4-5-20251001": 0.00025,
};
const COST_PER_1K_OUTPUT: Record<string, number> = {
  "claude-sonnet-4-20250514": 0.015,
  "claude-haiku-4-5-20251001": 0.00125,
};

export interface AnthropicCallOptions {
  system: string;
  userMessage: string;
  correlationId: string;
  functionName: string;
  inputSummary?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  promptTemplateVersion?: string;
}

export interface AnthropicCallResult {
  content: string;
  model: string;
  latencyMs: number;
  requestId: string;
}

export class AnthropicError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "AnthropicError";
  }
}

function parseAnthropicError(responseStatus: number, errorText: string) {
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

/**
 * Call Claude via the Anthropic API with retry and audit envelope logging.
 */
export async function callAnthropicApi(options: AnthropicCallOptions): Promise<AnthropicCallResult> {
  const {
    system, userMessage, correlationId, functionName,
    inputSummary, model = "claude-sonnet-4-20250514",
    maxTokens = 4096, temperature,
    promptTemplateVersion = "2.0",
  } = options;

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    throw new AnthropicError(500, "ANTHROPIC_NOT_CONFIGURED", "ANTHROPIC_API_KEY not set");
  }

  const requestId = crypto.randomUUID();

  // Compute prompt hash for audit
  const canonical = `[system]\n${system}\n===\n[user]\n${userMessage}\n===\n[params] temperature=${temperature ?? "default"} max_tokens=${maxTokens}`;
  const hashData = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
  const promptHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

  const baseEnvelope = {
    request_id: requestId,
    correlation_id: correlationId,
    function_name: functionName,
    provider: "anthropic",
    model_name: model,
    model_version: "2025-05-14",
    temperature: temperature ?? null,
    max_tokens: maxTokens,
    prompt_hash: promptHash,
    prompt_template_version: promptTemplateVersion,
    scoring_schema_version: SCORING_SCHEMA_VERSION,
    input_summary: inputSummary ?? null,
  };

  const persistEnvelope = async (extra: { output_summary: string | null; status: string; error_code: string | null; latency_ms: number }) => {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceKey) return;
      const client = createClient(supabaseUrl, serviceKey);
      await client.from("ai_invocation_log").insert({ ...baseEnvelope, ...extra });
    } catch (e) {
      console.error("[anthropic_audit] Envelope error:", e instanceof Error ? e.message : e);
    }
  };

  const makeRequest = () => fetch("https://api.anthropic.com/v1/messages", {
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
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  });

  const start = Date.now();
  let response: Response;
  let retried = false;

  try {
    response = await makeRequest();
    if ([429, 502, 503, 529].includes(response.status)) {
      console.log(JSON.stringify({ type: "anthropic_retry", correlation_id: correlationId, function_name: functionName, status: response.status }));
      await new Promise(r => setTimeout(r, 2000));
      response = await makeRequest();
      retried = true;
    }
  } catch (fetchError) {
    const latencyMs = Date.now() - start;
    await persistEnvelope({ output_summary: null, status: "error", error_code: "NETWORK_ERROR", latency_ms: latencyMs });
    throw new AnthropicError(502, "NETWORK_ERROR", "Failed to reach Anthropic API");
  }

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`[${functionName}] Anthropic error: ${response.status}`, errorText.substring(0, 300));
    const mappedError = parseAnthropicError(response.status, errorText);
    await persistEnvelope({ output_summary: `error:${response.status}`, status: mappedError.statusCode === 429 ? "rate_limited" : "error", error_code: mappedError.errorCode, latency_ms: latencyMs });
    throw new AnthropicError(
      mappedError.statusCode,
      mappedError.errorCode,
      mappedError.message,
    );
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    await persistEnvelope({ output_summary: "empty_response", status: "error", error_code: "EMPTY_RESPONSE", latency_ms: latencyMs });
    throw new AnthropicError(502, "EMPTY_RESPONSE", "Empty response from Claude");
  }

  // Fire-and-forget success envelope
  persistEnvelope({ output_summary: `len=${content.length},retried=${retried}`, status: "success", error_code: null, latency_ms: latencyMs });

  console.log(JSON.stringify({ type: "anthropic_success", correlation_id: correlationId, function_name: functionName, latency_ms: latencyMs, retried }));

  return { content, model, latencyMs, requestId };
}
