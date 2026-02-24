/**
 * Correlation ID Utilities — v1.2 Enterprise
 *
 * Ensures consistent correlation ID propagation across:
 * frontend → edge functions → ai_invocation_log → evidence_ledger → audit_events
 */

/** Standard header name for correlation ID propagation */
export const CORRELATION_HEADER = "x-correlation-id";

/**
 * Extract or generate a correlation ID from an incoming request.
 * Checks the standard header first, falls back to crypto.randomUUID().
 */
export function extractCorrelationId(req: Request): string {
  return req.headers.get(CORRELATION_HEADER) || crypto.randomUUID();
}

/**
 * Generate a fresh correlation ID (UUID v4).
 */
export function newCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Attach a correlation ID to outgoing fetch headers.
 */
export function withCorrelationHeaders(
  correlationId: string,
  existing: Record<string, string> = {}
): Record<string, string> {
  return { ...existing, [CORRELATION_HEADER]: correlationId };
}
