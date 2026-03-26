/**
 * Shared Error Utilities for Edge Functions
 * 
 * Consistent error response format across all functions.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
