/**
 * Shared Anthropic Client — v2.0
 * 
 * Direct Anthropic API wrapper for Claude calls.
 * Provides: retry logic, audit envelope logging, structured error handling.
 * Coexists with aiClient.ts (which handles Lovable Gateway calls).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SCORING_SCHEMA_VERSION } from "./aiClient.ts";

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
    const errorCode = response.status === 429 ? "RATE_LIMITED" : `ANTHROPIC_${response.status}`;
    await persistEnvelope({ output_summary: `error:${response.status}`, status: response.status === 429 ? "rate_limited" : "error", error_code: errorCode, latency_ms: latencyMs });
    throw new AnthropicError(
      response.status === 429 ? 429 : 502,
      errorCode,
      response.status === 429 ? "Rate limited — please try again shortly" : "AI service error"
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
