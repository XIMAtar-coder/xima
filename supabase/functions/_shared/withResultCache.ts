/**
 * withResultCache — Shared AI result cache wrapper for edge functions.
 *
 * Uses public.ai_shared_cache via the SECURITY DEFINER RPCs
 *   ai_shared_cache_get / ai_shared_cache_put
 * to atomically read (incrementing hits) or write (ON CONFLICT on the
 * expression unique index ux_ai_shared_cache_key).
 *
 * Two scopes:
 *   - "global": shared across all users (translations, public benchmarks, …)
 *   - "user":   per-user, keyed by versionTag (e.g. profile/pillar fingerprint)
 *               so any underlying change automatically invalidates the entry.
 *
 * Logs structured hit/miss for observability. NEVER blocks the caller on
 * cache errors — always falls back to compute().
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GLOBAL_USER_SENTINEL = "00000000-0000-0000-0000-000000000000";

export interface WithResultCacheOptions<T> {
  /** Logical function name (e.g. "recommend-jobs"). */
  functionName: string;
  /** "global" = shared across users, "user" = scoped to userId. */
  scope: "global" | "user";
  /** Required for scope="user"; ignored for scope="global". */
  userId?: string | null;
  /** Input object (will be canonicalized + hashed). */
  inputObject: unknown;
  /** Version tag — included in the hash. For "user" scope use a fingerprint
   *  of the underlying data (e.g. profiles.updated_at + pillar_scores ids)
   *  so the entry is auto-invalidated when the user state changes. */
  versionTag: string;
  /** TTL in seconds (e.g. 24h = 86400). */
  ttlSeconds: number;
  /** Compute function — only invoked on cache miss. */
  compute: () => Promise<T>;
  /** Optional correlation id for logs. */
  correlationId?: string;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function withResultCache<T>(opts: WithResultCacheOptions<T>): Promise<T> {
  const {
    functionName, scope, userId, inputObject, versionTag, ttlSeconds, compute,
    correlationId,
  } = opts;

  const effectiveUserId = scope === "user" ? (userId ?? null) : null;
  const keyUserId = effectiveUserId ?? GLOBAL_USER_SENTINEL;

  const inputHash = await sha256Hex(
    `${functionName}\n${versionTag}\n${canonicalJson(inputObject)}`
  );

  const client = getServiceClient();
  if (!client) {
    // No service role — bypass cache silently.
    return await compute();
  }

  // ---- Try cache GET (best-effort) ----
  try {
    const { data, error } = await client.rpc("ai_shared_cache_get", {
      _function_name: functionName,
      _scope: scope,
      _user_id: scope === "user" ? effectiveUserId : null,
      _input_hash: inputHash,
    });
    if (!error && data !== null && data !== undefined) {
      console.log(JSON.stringify({
        type: "cache_hit",
        function_name: functionName,
        scope,
        correlation_id: correlationId ?? null,
      }));
      return data as T;
    }
  } catch (e) {
    console.warn(`[withResultCache] GET failed for ${functionName}:`, e instanceof Error ? e.message : e);
  }

  console.log(JSON.stringify({
    type: "cache_miss",
    function_name: functionName,
    scope,
    correlation_id: correlationId ?? null,
  }));

  // ---- Compute ----
  const result = await compute();

  // ---- PUT (fire-and-forget; never block on failure) ----
  try {
    const serialized = JSON.parse(JSON.stringify(result));
    const { error } = await client.rpc("ai_shared_cache_put", {
      _function_name: functionName,
      _scope: scope,
      _user_id: scope === "user" ? effectiveUserId : null,
      _input_hash: inputHash,
      _version_tag: versionTag,
      _result_data: serialized,
      _ttl_seconds: ttlSeconds,
    });
    if (error) {
      console.warn(`[withResultCache] PUT error for ${functionName}:`, error.message);
    }
  } catch (e) {
    console.warn(`[withResultCache] PUT failed for ${functionName}:`, e instanceof Error ? e.message : e);
  }

  return result;
}

/**
 * Build a versioned tag for a per-user cache from the user's profile
 * timestamp and latest pillar snapshot. Any state change → new tag → cache miss.
 *
 * Returns a short string suitable to be included in the cache key.
 */
export async function buildUserVersionTag(userId: string): Promise<string> {
  const client = getServiceClient();
  if (!client) return "noversion";
  try {
    const [profileRes, pillarRes] = await Promise.all([
      client.from("profiles").select("updated_at").eq("user_id", userId).maybeSingle(),
      client.from("pillar_scores")
        .select("id, computed_at")
        .eq("user_id", userId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const profileTs = profileRes.data?.updated_at ?? "none";
    const pillarId = pillarRes.data?.id ?? "none";
    const pillarTs = pillarRes.data?.computed_at ?? "none";
    return `${profileTs}:${pillarId}:${pillarTs}`;
  } catch {
    return "fallback";
  }
}
