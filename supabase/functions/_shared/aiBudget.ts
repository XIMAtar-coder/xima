/**
 * AI Budget System — controls monthly AI call limits per user tier.
 *
 * Tier limits (monthly AI calls):
 *   freemium: 3, basic: 15, premium: 50, pro: 500, enterprise: unlimited
 *
 * Usage:
 *   1. checkAiBudget(userId, functionName) — BEFORE an Anthropic call
 *   2. recordAiCall(userId, functionName) — AFTER a successful call
 *   3. cacheAiResult(userId, functionName, data) — cache result for budget-exceeded fallback
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIER_LIMITS: Record<string, number> = {
  freemium: 3,
  basic: 15,
  premium: 50,
  pro: 500,
  enterprise: 999999,
};

const EXEMPT_FUNCTIONS = [
  "process-email-outbox",
  "contact-sales",
  "generate-company-profile",
  "send-challenge-invitation",
  "ai-invocation-replay",
];

export interface BudgetCheckResult {
  allowed: boolean;
  calls_used: number;
  calls_limit: number;
  tier: string;
  month_key: string;
  cached_result?: any;
  budget_message?: string;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function resolveUserTier(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const { data: membership } = await serviceClient
    .from("profiles")
    .select("membership_tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (membership?.membership_tier) {
    return (membership.membership_tier as string).toLowerCase();
  }
  return "freemium";
}

export async function checkAiBudget(
  userId: string,
  functionName: string
): Promise<BudgetCheckResult> {
  if (EXEMPT_FUNCTIONS.includes(functionName)) {
    return { allowed: true, calls_used: 0, calls_limit: 999999, tier: "system", month_key: getCurrentMonthKey() };
  }

  const serviceClient = getServiceClient();
  const monthKey = getCurrentMonthKey();
  const tier = await resolveUserTier(serviceClient, userId);
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.freemium;

  const { data: usage } = await serviceClient
    .from("ai_usage_budget")
    .select("calls_used")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  const callsUsed = usage?.calls_used || 0;

  if (callsUsed >= limit) {
    const { data: cached } = await serviceClient
      .from("ai_result_cache")
      .select("result_data, updated_at")
      .eq("user_id", userId)
      .eq("function_name", functionName)
      .maybeSingle();

    return {
      allowed: false,
      calls_used: callsUsed,
      calls_limit: limit,
      tier,
      month_key: monthKey,
      cached_result: cached?.result_data || null,
      budget_message: `You've used all ${limit} AI analyses this month (${tier} plan). ${
        cached?.result_data ? "Showing your most recent results." : "Upgrade your plan for more analyses."
      }`,
    };
  }

  return { allowed: true, calls_used: callsUsed, calls_limit: limit, tier, month_key: monthKey };
}

export async function recordAiCall(
  userId: string,
  functionName: string
): Promise<void> {
  if (EXEMPT_FUNCTIONS.includes(functionName)) return;

  const serviceClient = getServiceClient();
  const monthKey = getCurrentMonthKey();
  const tier = await resolveUserTier(serviceClient, userId);
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.freemium;

  const { data: existing } = await serviceClient
    .from("ai_usage_budget")
    .select("id, calls_used")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (existing) {
    await serviceClient
      .from("ai_usage_budget")
      .update({
        calls_used: existing.calls_used + 1,
        calls_limit: limit,
        tier,
        last_function_called: functionName,
        last_call_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await serviceClient
      .from("ai_usage_budget")
      .insert({
        user_id: userId,
        month_key: monthKey,
        calls_used: 1,
        calls_limit: limit,
        tier,
        last_function_called: functionName,
        last_call_at: new Date().toISOString(),
      });
  }
}

export async function cacheAiResult(
  userId: string,
  functionName: string,
  resultData: any,
  inputHash?: string
): Promise<void> {
  const serviceClient = getServiceClient();

  await serviceClient
    .from("ai_result_cache")
    .upsert(
      {
        user_id: userId,
        function_name: functionName,
        result_data: resultData,
        input_hash: inputHash || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,function_name" }
    );
}
