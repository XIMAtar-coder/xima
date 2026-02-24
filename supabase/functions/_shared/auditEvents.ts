/**
 * Shared Audit Event Emitter — v1.2 Enterprise
 *
 * Fire-and-forget helper for edge functions to emit audit_events rows.
 * Uses service_role — bypasses RLS. Errors are logged but never block callers.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ActorType = "candidate" | "business" | "mentor" | "system";

export interface AuditEventInput {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  correlationId?: string | null;
  attemptId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  userAgentHash?: string | null;
}

/**
 * Emit an audit event to the audit_events table (fire-and-forget).
 */
export async function emitAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.warn("[audit] Missing credentials — skipping");
      return;
    }
    const client = createClient(supabaseUrl, serviceKey);
    const { error } = await client.from("audit_events").insert({
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      correlation_id: input.correlationId ?? null,
      attempt_id: input.attemptId ?? null,
      metadata: input.metadata ?? {},
      ip_hash: input.ipHash ?? null,
      user_agent_hash: input.userAgentHash ?? null,
    });
    if (error) {
      console.error("[audit] Insert failed:", error.message);
    }
  } catch (e) {
    console.error("[audit] Error:", e instanceof Error ? e.message : e);
  }
}

/**
 * Emit an audit event AND increment a daily metric in one call.
 */
export async function emitAuditEventWithMetric(
  input: AuditEventInput,
  metricName: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;
    const client = createClient(supabaseUrl, serviceKey);

    // Fire both in parallel
    await Promise.allSettled([
      client.from("audit_events").insert({
        actor_type: input.actorType,
        actor_id: input.actorId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        correlation_id: input.correlationId ?? null,
        attempt_id: input.attemptId ?? null,
        metadata: input.metadata ?? {},
        ip_hash: input.ipHash ?? null,
        user_agent_hash: input.userAgentHash ?? null,
      }),
      client.rpc("increment_daily_metric", {
        p_metric_name: metricName,
        p_increment: 1,
        p_date: new Date().toISOString().split("T")[0],
        p_metadata: {},
      }),
    ]);
  } catch (e) {
    console.error("[audit+metric] Error:", e instanceof Error ? e.message : e);
  }
}

/**
 * Compute a SHA-256 hash of an IP address or user-agent for audit logging without PII.
 */
export async function hashForAudit(value: string): Promise<string> {
  const data = new TextEncoder().encode(value + "_xima_audit_salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}
