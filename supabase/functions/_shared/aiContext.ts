import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface UserAiContext {
  cv_credentials_summary?: any;
  cv_identity_summary?: any;
  cv_language?: string;
  cv_analyzed_at?: string;
  cv_extracted_text?: string;
  cv_extraction_method?: string;
  cv_file_hash?: string;
  assessment_summary?: any;
  challenge_history_summary?: any;
  growth_summary?: any;
  matching_preferences?: any;
  l3_summary?: any;
  total_ai_calls?: number;
  total_tokens_saved?: number;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/**
 * Load existing AI context for a user.
 */
export async function loadUserAiContext(userId: string): Promise<UserAiContext> {
  try {
    const client = getServiceClient();
    const { data, error } = await client
      .from("user_ai_context")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return {};
    return data;
  } catch (e) {
    console.warn("[aiContext] Failed to load context:", e instanceof Error ? e.message : "unknown");
    return {};
  }
}

/**
 * Build a context string for Claude prompts.
 * Only includes sections that have data.
 */
export function buildContextBlock(context: UserAiContext): string {
  const sections: string[] = [];

  if (context.assessment_summary) {
    const a = context.assessment_summary;
    sections.push(
      `KNOWN — ASSESSMENT: XIMAtar ${a.ximatar || "unknown"} L${a.level || 1}. Edge: ${a.edge || "unknown"}. Friction: ${a.friction || "unknown"}. Scores: Drive ${a.scores?.drive ?? "?"}, CompPower ${a.scores?.computational_power ?? "?"}, Comm ${a.scores?.communication ?? "?"}, Creativity ${a.scores?.creativity ?? "?"}, Knowledge ${a.scores?.knowledge ?? "?"}. Trajectory: ${a.trajectory_direction || "unknown"}.`
    );
  }

  if (context.cv_identity_summary) {
    const cv = context.cv_identity_summary;
    sections.push(
      `KNOWN — CV ANALYSIS: CV archetype ${cv.cv_archetype || "unknown"}. Alignment ${cv.alignment_score ?? "?"}%. Top tensions: ${cv.top_tensions?.join(", ") || "none identified"}. Narrative: ${cv.narrative_snippet || "none"}.`
    );
  }

  if (context.cv_credentials_summary) {
    const cred = context.cv_credentials_summary;
    sections.push(
      `KNOWN — CREDENTIALS: ${cred.full_name || "Name unknown"}. ${cred.total_years_experience || "?"} years experience. Seniority: ${cred.seniority_level || "unknown"}. Top skills: ${cred.top_skills?.join(", ") || "unknown"}. Education: ${cred.education_summary || "unknown"}. Industries: ${cred.industries?.join(", ") || "unknown"}.`
    );
  }

  if (context.challenge_history_summary) {
    const ch = context.challenge_history_summary;
    sections.push(
      `KNOWN — CHALLENGES: ${ch.l1_completed || 0} L1 completed (avg score: ${ch.l1_avg_score || "?"}), ${ch.l2_completed || 0} L2 completed (avg: ${ch.l2_avg_score || "?"}). Strongest area: ${ch.strongest_area || "unknown"}. Weakest area: ${ch.weakest_area || "unknown"}.`
    );
  }

  if (context.growth_summary) {
    const g = context.growth_summary;
    sections.push(
      `KNOWN — GROWTH HUB: ${g.courses_completed || 0} courses, ${g.books_completed || 0} books, ${g.podcasts_completed || 0} podcasts completed. Tests passed: ${g.tests_passed || 0}/${g.tests_taken || 0}. Total pillar deltas earned: Drive +${g.total_deltas?.drive || 0}, CompPower +${g.total_deltas?.computational_power || 0}, Comm +${g.total_deltas?.communication || 0}, Creativity +${g.total_deltas?.creativity || 0}, Knowledge +${g.total_deltas?.knowledge || 0}. Preferred resource type: ${g.preferred_type || "unknown"}.`
    );
  }

  if (context.matching_preferences) {
    const m = context.matching_preferences;
    sections.push(
      `KNOWN — MATCHING: Interested industries: ${m.industries?.join(", ") || "unknown"}. Roles explored: ${m.roles_explored?.join(", ") || "none"}. Jobs saved: ${m.jobs_saved || 0}.`
    );
  }

  if (sections.length === 0) return "";

  return `\n\nPRE-EXISTING INTELLIGENCE (from previous XIMA AI interactions — do NOT re-analyze what is already known, use this as baseline and focus on NEW insights or updates):\n${sections.join("\n")}\n`;
}

/**
 * Update a specific section of the user's AI context.
 */
export async function updateUserAiContext(
  userId: string,
  updates: Partial<Record<string, any>>
): Promise<void> {
  try {
    const client = getServiceClient();

    const enrichedUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await client
      .from("user_ai_context")
      .select("total_ai_calls")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await client
        .from("user_ai_context")
        .update({
          ...enrichedUpdates,
          total_ai_calls: (existing.total_ai_calls || 0) + 1,
        })
        .eq("user_id", userId);
    } else {
      await client
        .from("user_ai_context")
        .insert({
          user_id: userId,
          ...enrichedUpdates,
          total_ai_calls: 1,
        });
    }
    console.log("[aiContext] Updated context for user:", userId.substring(0, 8));
  } catch (e) {
    console.warn("[aiContext] Failed to update context:", e instanceof Error ? e.message : "unknown");
  }
}

/**
 * Check if a CV has already been analyzed by comparing file hash.
 */
export async function checkCvHash(userId: string, fileBytes: Uint8Array): Promise<string | null> {
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBytes);
    const fileHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const client = getServiceClient();
    const { data } = await client
      .from("user_ai_context")
      .select("cv_file_hash")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.cv_file_hash === fileHash) {
      return fileHash;
    }
    return null;
  } catch (e) {
    console.warn("[aiContext] Failed to check CV hash:", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

/**
 * Compute SHA-256 hash of file bytes.
 */
export async function computeFileHash(fileBytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", fileBytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
