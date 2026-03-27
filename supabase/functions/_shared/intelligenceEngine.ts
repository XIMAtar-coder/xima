/**
 * XIMA Intelligence Engine — Phase A
 * 
 * Database-native intelligence layer. Checks structured data before
 * calling LLMs. Every LLM output deposits structured data back.
 * The database gets smarter with every interaction.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ============================================================
// VECTOR MATCHING (Layer 1 — Zero cost)
// ============================================================

export interface VectorMatchResult {
  id: string;
  name: string;
  similarity: number;
  data: any;
}

/**
 * Match jobs using vector similarity instead of LLM.
 * Returns scored matches instantly at zero API cost.
 */
export async function matchJobsByVector(userId: string, limit = 10): Promise<VectorMatchResult[]> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("match_jobs_by_vector", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error || !data) {
    console.warn("[intelligence] Vector job matching failed:", error?.message);
    return [];
  }

  return data.map((row: any) => ({
    id: row.job_id,
    name: row.role_title,
    similarity: row.similarity_score,
    data: { ...row.job_data, company_name: row.company_name },
  }));
}

/**
 * Match mentors using gap analysis instead of LLM.
 */
export async function matchMentorsByGap(userId: string, limit = 5): Promise<VectorMatchResult[]> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("match_mentors_by_gap", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error || !data) {
    console.warn("[intelligence] Vector mentor matching failed:", error?.message);
    return [];
  }

  return data.map((row: any) => ({
    id: row.mentor_id,
    name: row.mentor_name,
    similarity: row.gap_fill_score,
    data: row.mentor_data,
  }));
}

// ============================================================
// PATTERN MATCHING (Layer 2 — Zero cost, template-based)
// ============================================================

export interface PatternMatch {
  found: boolean;
  pattern_id: string | null;
  pattern_data: any;
  confidence: number;
}

/**
 * Check if a pattern exists that can answer this request
 * without calling the LLM.
 */
export async function findPattern(
  patternType: string,
  archetype?: string,
  targetPillar?: string,
  minConfidence = 0.7
): Promise<PatternMatch> {
  const client = getServiceClient();
  const { data, error } = await client.rpc("find_matching_patterns", {
    p_pattern_type: patternType,
    p_archetype: archetype || null,
    p_target_pillar: targetPillar || null,
    p_min_confidence: minConfidence,
    p_limit: 1,
  });

  if (error || !data || data.length === 0) {
    return { found: false, pattern_id: null, pattern_data: null, confidence: 0 };
  }

  // Record usage
  await client
    .from("intelligence_patterns")
    .update({ usage_count: data[0].usage_count + 1, last_used_at: new Date().toISOString() })
    .eq("id", data[0].pattern_id);

  return {
    found: true,
    pattern_id: data[0].pattern_id,
    pattern_data: data[0].pattern_data,
    confidence: data[0].confidence,
  };
}

// ============================================================
// INFERENCE DEPOSITS (every AI call enriches the database)
// ============================================================

/**
 * Deposit structured output from an LLM call into the intelligence layer.
 * This is the core IAD mechanism — every inference trains the database.
 */
export async function depositInference(
  userId: string,
  functionName: string,
  depositData: any,
  metadata?: {
    archetype?: string;
    targetPillar?: string;
    patternType?: string;
  }
): Promise<void> {
  const client = getServiceClient();

  try {
    // 1. Store the raw deposit
    await client.from("intelligence_deposits").insert({
      user_id: userId,
      function_name: functionName,
      deposit_type: "full_output",
      deposit_data: depositData,
    });

    // 2. Check if this deposit can strengthen an existing pattern
    if (metadata?.patternType) {
      const existing = await findPattern(
        metadata.patternType,
        metadata.archetype,
        metadata.targetPillar,
        0.0  // Find any pattern, even low confidence
      );

      if (existing.found && existing.pattern_id) {
        // Strengthen existing pattern
        const currentCount = existing.pattern_data?.source_count || 1;
        const newConfidence = Math.min(0.95, 0.5 + (currentCount * 0.05));

        await client
          .from("intelligence_patterns")
          .update({
            source_count: currentCount + 1,
            confidence: newConfidence,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.pattern_id);
      } else {
        // Create a new pattern from this deposit
        await client.from("intelligence_patterns").insert({
          pattern_type: metadata.patternType,
          archetype: metadata.archetype || null,
          target_pillar: metadata.targetPillar || null,
          pattern_data: depositData,
          source_count: 1,
          confidence: 0.5,
        });
      }
    }

    console.log(`[intelligence] Deposit: ${functionName} → ${metadata?.patternType || "raw"} (user: ${userId.substring(0, 8)}...)`);
  } catch (err) {
    // Non-critical — don't fail the main function
    console.warn(`[intelligence] Deposit failed for ${functionName}:`, err instanceof Error ? err.message : String(err));
  }
}

// ============================================================
// DECISION ROUTER (check DB first, LLM only if needed)
// ============================================================

export interface DecisionResult {
  source: "database" | "llm_required";
  data: any;
  confidence: number;
  cost: number;
}

/**
 * The core IAD decision function.
 * Checks all database intelligence layers before recommending an LLM call.
 */
export async function checkDatabaseFirst(
  patternType: string,
  archetype?: string,
  targetPillar?: string
): Promise<DecisionResult> {
  // Check pattern library
  const pattern = await findPattern(patternType, archetype, targetPillar, 0.7);
  if (pattern.found) {
    console.log(`[intelligence] Pattern hit: ${patternType} (confidence: ${pattern.confidence})`);
    return {
      source: "database",
      data: pattern.pattern_data,
      confidence: pattern.confidence,
      cost: 0,
    };
  }

  // No database intelligence available — LLM required
  return {
    source: "llm_required",
    data: null,
    confidence: 0,
    cost: 0.01,
  };
}
