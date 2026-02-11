/**
 * Shared AI Gateway Client
 * 
 * Unified wrapper for Lovable AI Gateway calls across all edge functions.
 * Provides structured logging, correlation IDs, error handling, and response parsing.
 */

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

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
}

export interface AiResponse {
  content: string;
  model: string;
  latencyMs: number;
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
 * Log a structured AI call entry (no PII)
 */
export function logAiCall(entry: AiCallLog): void {
  console.log(JSON.stringify({ type: "ai_call", ...entry }));
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
 * Call the Lovable AI Gateway with structured logging
 * Returns parsed content string or throws
 */
export async function callAiGateway(
  options: AiRequestOptions
): Promise<AiResponse> {
  const { messages, model, temperature, max_tokens, response_format, correlationId, functionName } =
    options;
  const selectedModel = model || DEFAULT_MODEL;

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
    throw new AiGatewayError(502, "AI_EMPTY_RESPONSE", "Empty response from AI");
  }

  logAiCall({
    correlation_id: correlationId,
    function_name: functionName,
    model: selectedModel,
    latency_ms: latencyMs,
    status: "success",
  });

  return { content, model: selectedModel, latencyMs };
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
