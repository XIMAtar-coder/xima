/**
 * Shared Error Utilities for Edge Functions
 * 
 * Consistent error response format across all functions.
 */

/**
 * The wildcard origin is deliberate, not an oversight — it gets flagged in every
 * audit, so the reasoning lives here.
 *
 * Auth is a bearer token held in localStorage, never a cookie. Browsers do not
 * attach Authorization headers to cross-origin requests on their own, and a
 * hostile page cannot read another origin's localStorage, so "*" does not expose
 * a session the way it would under cookie auth. There is no CSRF surface to
 * close here, because there is no ambient credential to ride.
 *
 * Against that, an allowlist has to cover the production domain, every rotating
 * Lovable preview domain, and the Capacitor origins the native build runs under
 * (capacitor://localhost and friends, since the app bundles its assets rather
 * than pointing at a server.url). Missing one fails as an opaque CORS error in
 * the mobile app, which is a poor trade for no gain in credential safety.
 *
 * What "*" does allow is anyone calling the public, unauthenticated endpoints
 * from anywhere. That is an abuse-and-quota question, and the answer to it is
 * rate limiting and per-user budget caps — enforceAiBudget already does this —
 * not an origin header.
 *
 * Revisit if auth ever moves to cookies. Then this must become an allowlist.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-guest-consent, x-correlation-id",
};

/**
 * Origin-aware CORS for endpoints that accept unauthenticated calls.
 *
 * The shared `corsHeaders` above answers `*`, which is defensible where a
 * bearer token is required: the token, not the origin, is the credential. A
 * handful of functions take no token at all (guest CV analysis, salary
 * benchmark, field averages, translation, invitation and email-token
 * verification). For those, `*` let any site on the web call XIMA from a
 * visitor's browser. This reflects the caller's origin only when it is one of
 * ours; otherwise no Allow-Origin header is sent and the browser refuses.
 * Non-browser callers are unaffected either way.
 *
 * ALLOWED_ORIGINS (comma-separated) extends the list without a redeploy.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://ximatar.com",
  "https://www.ximatar.com",
  "capacitor://localhost",
  "ionic://localhost",
];
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((o) => o.trim()).filter(Boolean);
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin) || extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const base = { ...corsHeaders };
  if (isAllowedOrigin(origin)) {
    return { ...base, "Access-Control-Allow-Origin": origin!, "Vary": "Origin" };
  }
  const { "Access-Control-Allow-Origin": _drop, ...withoutOrigin } = base;
  return { ...withoutOrigin, "Vary": "Origin" };
}

export interface ErrorResponse {
  error: string;
  error_code: string;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  status: number,
  errorCode: string,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ error: message, error_code: errorCode, ...extra }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Standard CORS headers
 */
export { corsHeaders };

/**
 * Create a success JSON response
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Profiling opt-out error
 */
export function profilingOptOutResponse(): Response {
  return errorResponse(403, "PROFILING_OPT_OUT", 
    "Automated profiling is disabled for this account. The user can enable it in Settings.");
}

/**
 * Auth required response
 */
export function unauthorizedResponse(message = "Authentication required"): Response {
  return errorResponse(401, "UNAUTHORIZED", message);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message = "Insufficient permissions"): Response {
  return errorResponse(403, "FORBIDDEN", message);
}
