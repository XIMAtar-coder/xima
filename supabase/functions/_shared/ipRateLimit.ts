/**
 * DB-backed per-IP rate limiter, reusing the same guest_rate_limit table
 * and windowing approach as analyze-cv-guest. Fail-CLOSED on infrastructure
 * errors — never silently bypasses the limit.
 *
 * Storage: public.guest_rate_limit (ip_hash, window_start, count)
 * Window: aligned to the top of the hour (matches table default).
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface IpRateLimitOptions {
  key: string;               // logical namespace, e.g. "contact-sales" or "ximai-chat:<userId>"
  max: number;               // max calls per window
  windowMinutes?: number;    // window size (default 60 = per hour, aligned)
  correlationId?: string;
}

export interface IpRateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function extractClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Enforce a per-IP rate limit. Throws on infra failure (caller MUST reject
 * the request, never bypass the limit).
 */
export async function enforceIpRateLimit(
  req: Request,
  opts: IpRateLimitOptions,
): Promise<IpRateLimitResult> {
  const service = getServiceClient();
  const ip = extractClientIp(req);
  const ipHash = await sha256Hex(`${opts.key}:${ip}`);

  const windowMs = (opts.windowMinutes ?? 60) * 60 * 1000;
  const windowStart = new Date();
  if ((opts.windowMinutes ?? 60) === 60) {
    windowStart.setMinutes(0, 0, 0);
  } else {
    // align to window boundary
    const t = Math.floor(windowStart.getTime() / windowMs) * windowMs;
    windowStart.setTime(t);
  }

  const { data: inserted, error: insertErr } = await service
    .from("guest_rate_limit")
    .insert({ ip_hash: ipHash, window_start: windowStart.toISOString(), count: 1 })
    .select("count")
    .maybeSingle();

  if (!insertErr && inserted) {
    return { allowed: true, count: 1, limit: opts.max, retryAfterSeconds: 0 };
  }

  const { data: existing, error: fetchErr } = await service
    .from("guest_rate_limit")
    .select("id, count")
    .eq("ip_hash", ipHash)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error(JSON.stringify({
      type: "ip_rate_limit_infra_error",
      key: opts.key,
      correlation_id: opts.correlationId,
      insert_error: insertErr?.message,
      fetch_error: fetchErr?.message,
    }));
    throw new Error(`ip_rate_limit_infra: ${insertErr?.message || fetchErr?.message || "unknown"}`);
  }

  const currentCount = existing.count as number;
  if (currentCount >= opts.max) {
    const retryAfter = Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000);
    return { allowed: false, count: currentCount, limit: opts.max, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  const newCount = currentCount + 1;
  const { error: updateErr } = await service
    .from("guest_rate_limit")
    .update({ count: newCount, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (updateErr) {
    console.error(JSON.stringify({
      type: "ip_rate_limit_update_error",
      key: opts.key,
      correlation_id: opts.correlationId,
      error: updateErr.message,
    }));
    throw new Error(`ip_rate_limit_update: ${updateErr.message}`);
  }

  return { allowed: true, count: newCount, limit: opts.max, retryAfterSeconds: 0 };
}

/**
 * Convenience: returns a 429 Response when the limit is exceeded, throws
 * on infrastructure failure (caller returns 503). Null when allowed.
 */
export async function enforceIpRateLimitOrResponse(
  req: Request,
  opts: IpRateLimitOptions,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const result = await enforceIpRateLimit(req, opts);
  if (result.allowed) return null;
  return new Response(
    JSON.stringify({
      error: "RATE_LIMITED",
      message: `Too many requests. Please retry in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
      limit: result.limit,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
