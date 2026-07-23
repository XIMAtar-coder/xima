/**
 * Thin wrapper around aiBudget.ts that returns a 429 Response when a user
 * has exceeded their monthly per-tier AI call cap.
 *
 * Usage in an edge function (AFTER resolving the authenticated user):
 *   const gate = await enforceAiBudget(userId, "my-function", corsHeaders);
 *   if (gate) return gate;
 *   // ... call the model ...
 *   await recordAiCallSafe(userId, "my-function");
 */

import { checkAiBudget, recordAiCall } from "./aiBudget.ts";
import { corsHeaders as defaultCorsHeaders } from "./errors.ts";

export async function enforceAiBudget(
  userId: string,
  functionName: string,
  corsHeaders: Record<string, string> = defaultCorsHeaders,
): Promise<Response | null> {
  try {
    const result = await checkAiBudget(userId, functionName);
    if (result.allowed) return null;

    return new Response(
      JSON.stringify({
        error: "AI_BUDGET_EXCEEDED",
        message: result.budget_message,
        calls_used: result.calls_used,
        calls_limit: result.calls_limit,
        tier: result.tier,
        month_key: result.month_key,
        cached_result: result.cached_result ?? null,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "3600",
        },
      },
    );
  } catch (e) {
    // Fail-open on infrastructure errors so a broken budget table can't
    // take down the whole platform, but log loudly.
    console.error(`[enforceAiBudget] failed for ${functionName}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function recordAiCallSafe(userId: string, functionName: string): Promise<void> {
  try {
    await recordAiCall(userId, functionName);
  } catch (e) {
    console.warn(`[recordAiCallSafe] failed for ${functionName}:`, e instanceof Error ? e.message : e);
  }
}
