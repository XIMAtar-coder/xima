/**
 * generate-l3-interview — L3 Interview Architect
 *
 * Generates personalized video interview questions from the candidate's
 * full XIMA profile (XIMAtar, pillars, CV tension, L1/L2 signals, trajectory).
 *
 * AI designs the interview. Humans make the decision.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent } from "../_shared/aiClient.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  unauthorizedResponse,
  forbiddenResponse,
  profilingOptOutResponse,
} from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES } from "../_shared/ximatarTaxonomy.ts";
import { loadUserAiContext, buildContextBlock, updateUserAiContext } from "../_shared/aiContext.ts";

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

interface GenerateL3InterviewRequest {
  challenge_id: string;
  candidate_profile_id: string;
  hiring_goal_id?: string;
  locale?: string;
}

const VALID_QUESTION_TYPES = ["tension_probe", "strength_confirm", "culture_fit", "growth_trajectory"] as const;
const VALID_PILLARS = ["drive", "computational_power", "communication", "creativity", "knowledge"] as const;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function summariseSignals(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Not available";
  try {
    return JSON.stringify(payload).substring(0, 600);
  } catch {
    return "Not available";
  }
}

function summariseTrajectory(rows: Array<Record<string, unknown>> | null): string {
  if (!rows || rows.length === 0) return "No trajectory data";
  const summary = rows.slice(0, 10).map((r) => {
    const parts: string[] = [];
    for (const key of ["drive_delta", "computational_power_delta", "communication_delta", "creativity_delta", "knowledge_delta"]) {
      const v = r[key] as number;
      if (v && v !== 0) parts.push(`${key.replace("_delta", "")}:${v > 0 ? "+" : ""}${v}`);
    }
    return `${r.source_type}: ${parts.join(", ")}`;
  });
  return summary.join("\n");
}

function buildFallbackQuestions(scores: Record<string, number> | null): unknown {
  const pillars = VALID_PILLARS.slice();
  if (scores) {
    pillars.sort((a, b) => (scores[a] ?? 50) - (scores[b] ?? 50));
  }
  return {
    questions: pillars.slice(0, 4).map((p, i) => ({
      id: `q${i + 1}`,
      question_text: `Tell me about a professional experience where ${p.replace("_", " ")} was critical to the outcome.`,
      question_type: "tension_probe",
      target_pillar: p,
      target_tension: `Generic probe for ${p}`,
      what_to_watch_for: "Observe specificity of examples, confidence level, and emotional engagement when discussing this area.",
      time_limit_seconds: 180,
      follow_up_if_weak: `Can you give a more specific example of how you used ${p.replace("_", " ")} in your last role?`,
    })),
    interview_brief: {
      candidate_summary: "Candidate profile data was insufficient for full personalization. Generic diagnostic questions have been generated.",
      key_tensions_to_resolve: pillars.slice(0, 2),
      ideal_outcome: "Candidate provides specific, detailed examples demonstrating competence in their weaker pillars.",
      red_flags_to_watch: ["Vague or generic answers", "Inability to provide concrete examples"],
    },
    estimated_total_minutes: 12,
    locale: "en",
  };
}

function validate(parsed: Record<string, unknown>): boolean {
  const questions = parsed.questions;
  if (!Array.isArray(questions) || questions.length < 4 || questions.length > 6) return false;
  for (const q of questions) {
    if (typeof q !== "object" || !q) return false;
    const qq = q as Record<string, unknown>;
    if (!qq.id || typeof qq.question_text !== "string" || (qq.question_text as string).length < 10) return false;
    if (!VALID_QUESTION_TYPES.includes(qq.question_type as typeof VALID_QUESTION_TYPES[number])) return false;
    if (!VALID_PILLARS.includes(qq.target_pillar as typeof VALID_PILLARS[number])) return false;
    if (typeof qq.what_to_watch_for !== "string" || (qq.what_to_watch_for as string).length < 10) return false;
    const tl = qq.time_limit_seconds as number;
    if (typeof tl !== "number" || tl < 90 || tl > 300) return false;
  }
  const brief = parsed.interview_brief as Record<string, unknown> | undefined;
  if (!brief) return false;
  if (typeof brief.candidate_summary !== "string") return false;
  if (!Array.isArray(brief.key_tensions_to_resolve)) return false;
  if (typeof brief.ideal_outcome !== "string") return false;
  if (!Array.isArray(brief.red_flags_to_watch)) return false;
  return true;
}

// ---------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = extractCorrelationId(req);

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return unauthorizedResponse();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return unauthorizedResponse();

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check business/admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["business", "admin"])
      .limit(1)
      .maybeSingle();
    if (!roleRow) return forbiddenResponse("Business or admin role required");

    // ---- Parse body ----
    const body: GenerateL3InterviewRequest = await req.json();
    const { challenge_id, candidate_profile_id, locale = "en" } = body;
    const hiring_goal_id = body.hiring_goal_id;

    if (!challenge_id || !candidate_profile_id) {
      return errorResponse(400, "MISSING_FIELDS", "challenge_id and candidate_profile_id are required");
    }

    // ---- Verify ownership ----
    const { data: challenge, error: chErr } = await supabase
      .from("business_challenges")
      .select("title, description, config_json, business_id, hiring_goal_id")
      .eq("id", challenge_id)
      .single();
    if (chErr || !challenge) return errorResponse(404, "NOT_FOUND", "Challenge not found");

    // Verify the business user owns this challenge's business profile
    const { data: biz } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!biz || biz.id !== challenge.business_id) {
      // Also allow admin
      if (roleRow.role !== "admin") return forbiddenResponse("You do not own this challenge");
    }

    const effectiveHiringGoalId = hiring_goal_id || challenge.hiring_goal_id;

    // ---- GDPR check ----
    const { data: candidateProfile } = await supabase
      .from("profiles")
      .select("user_id, ximatar_name, ximatar, ximatar_id, ximatar_level, pillar_scores, profiling_opt_out")
      .eq("id", candidate_profile_id)
      .single();
    if (!candidateProfile) return errorResponse(404, "NOT_FOUND", "Candidate not found");
    if (candidateProfile.profiling_opt_out === true) return profilingOptOutResponse();

    // ---- Fetch candidate context (parallel) ----
    const [cvAnalysisRes, credentialsRes, l1Res, l2Res, trajectoryRes, companyProfileRes, businessProfileRes, goalRes] = await Promise.all([
      supabase
        .from("cv_identity_analysis")
        .select("cv_archetype_primary, cv_pillar_scores, tension_gaps, tension_narrative, alignment_score, cv_qualified_roles, archetype_aligned_roles")
        .eq("user_id", candidateProfile.user_id)
        .maybeSingle(),
      supabase
        .from("cv_credentials")
        .select("education, work_experience, hard_skills, total_years_experience, seniority_level, career_trajectory")
        .eq("user_id", candidateProfile.user_id)
        .maybeSingle(),
      effectiveHiringGoalId
        ? supabase
            .from("challenge_submissions")
            .select("submitted_payload, signals_payload, signals_version")
            .eq("candidate_profile_id", candidate_profile_id)
            .eq("hiring_goal_id", effectiveHiringGoalId)
            .not("signals_payload", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("challenge_submissions")
        .select("signals_payload, signals_version")
        .eq("candidate_profile_id", candidate_profile_id)
        .eq("signals_version", "v2_claude")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pillar_trajectory_log")
        .select("drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta, source_type, created_at")
        .eq("user_id", candidateProfile.user_id)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("company_profiles")
        .select("summary, operating_style, communication_style, pillar_vector, recommended_ximatars")
        .eq("company_id", challenge.business_id)
        .maybeSingle(),
      supabase
        .from("business_profiles")
        .select("company_name")
        .eq("id", challenge.business_id)
        .maybeSingle(),
      effectiveHiringGoalId
        ? supabase
            .from("hiring_goal_drafts")
            .select("role_title, task_description")
            .eq("id", effectiveHiringGoalId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const cvAnalysis = cvAnalysisRes.data;
    const credentials = credentialsRes.data;
    const l1Submission = l1Res.data;
    const l2Submission = l2Res.data;
    const trajectory = trajectoryRes.data;
    const companyProfile = companyProfileRes.data;
    const businessProfile = businessProfileRes.data;
    const goalData = goalRes.data;

    const archetype = (candidateProfile.ximatar_name || candidateProfile.ximatar || candidateProfile.ximatar_id || "unknown") as string;
    const archetypeProfile = XIMATAR_PROFILES[archetype.toLowerCase()];
    const scores = (candidateProfile.pillar_scores || {}) as Record<string, number>;
    const roleTitle = (goalData as Record<string, string> | null)?.role_title || challenge.title || "the role";
    const companyName = businessProfile?.company_name || "the company";

    // ---- Build Claude prompt ----
    const systemPrompt = `You are the XIMA L3 Interview Architect. You design personalized video interview questions that surface specific tensions in a candidate's profile.

XIMA'S L3 PHILOSOPHY:
- L3 is the final assessment stage before human hiring decision
- The video interview is a DIAGNOSTIC TOOL for the reviewer, not a test for the candidate
- Questions should reveal whether undersold pillars are real strengths or genuine gaps
- Each question targets a specific tension point from the candidate's XIMA profile
- Questions should feel natural and professional — not like a trap
- The candidate should feel they're having a meaningful conversation, not an interrogation

CANDIDATE PROFILE:
- XIMAtar: ${archetype} L${candidateProfile.ximatar_level || 1} (${archetypeProfile?.title || "Unknown"})
- Pillar scores: ${JSON.stringify(scores)}
- CV archetype (what CV communicates): ${cvAnalysis?.cv_archetype_primary || "not available"}
- Alignment score: ${cvAnalysis?.alignment_score ?? "not available"}/100
- Tension narrative: ${cvAnalysis?.tension_narrative || "not available"}
- Key tension gaps: ${cvAnalysis?.tension_gaps ? JSON.stringify(cvAnalysis.tension_gaps) : "none identified"}
- Career trajectory: ${credentials?.career_trajectory || "unknown"}
- Seniority: ${credentials?.seniority_level || "unknown"}
- Total experience: ${credentials?.total_years_experience ?? "unknown"} years

L1 PERFORMANCE (behavioral assessment):
${summariseSignals(l1Submission?.signals_payload)}

L2 SIGNALS (hard skills assessment):
${summariseSignals(l2Submission?.signals_payload)}

TRAJECTORY (last 90 days):
${summariseTrajectory(trajectory as Array<Record<string, unknown>> | null)}

JOB CONTEXT:
- Role: ${roleTitle}
- Company: ${companyName}
- Company style: ${companyProfile?.operating_style || "not available"}
- Company communication: ${companyProfile?.communication_style || "not available"}
- Ideal archetype for role: ${companyProfile?.recommended_ximatars ? JSON.stringify(companyProfile.recommended_ximatars) : "not specified"}

INTERVIEW DESIGN RULES:
1. Generate exactly 4-6 questions
2. Each question targets a SPECIFIC tension or growth edge from the profile
3. Each question has a "what_to_watch_for" guide — what the human reviewer should observe
4. Questions should alternate between:
   - Tension-probing: test whether an undersold pillar is real
   - Strength-confirming: validate the candidate's strongest signals
   - Culture-fit revealing: surface alignment with company operating style
   - Growth-trajectory: understand where the candidate is heading
5. Time estimate: each answer should be 2-3 minutes
6. Questions should be open-ended — no yes/no answers possible
7. DO NOT ask about demographics, personal life, or anything that could introduce bias

LANGUAGE: Generate all questions and viewing guides in ${locale}.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question_text": "The question as the candidate will see it on screen",
      "question_type": "tension_probe" | "strength_confirm" | "culture_fit" | "growth_trajectory",
      "target_pillar": "drive" | "computational_power" | "communication" | "creativity" | "knowledge",
      "target_tension": "Brief description of what tension this question probes",
      "what_to_watch_for": "2-3 sentences for the human reviewer",
      "time_limit_seconds": 180,
      "follow_up_if_weak": "A follow-up question if the answer is vague"
    }
  ],
  "interview_brief": {
    "candidate_summary": "2-3 sentence summary of who this candidate is",
    "key_tensions_to_resolve": ["tension 1", "tension 2"],
    "ideal_outcome": "What a strong L3 performance looks like for this candidate",
    "red_flags_to_watch": ["red flag 1", "red flag 2"]
  },
  "estimated_total_minutes": number,
  "locale": "${locale}"
}`;

    const userMessage = "Generate the L3 interview questions for this candidate. Return ONLY valid JSON.";

    // ---- Call Claude ----
    const result = await callAnthropicApi({
      system: systemPrompt,
      userMessage,
      correlationId,
      functionName: "generate-l3-interview",
      inputSummary: `candidate=${candidate_profile_id},ximatar=${archetype},role=${roleTitle},locale=${locale}`,
      maxTokens: 4096,
      temperature: 0.7,
      promptTemplateVersion: "1.0",
    });

    // ---- Parse and validate ----
    let validated: Record<string, unknown>;
    try {
      const jsonStr = extractJsonFromAiContent(result.content);
      const parsed = JSON.parse(jsonStr);
      if (validate(parsed)) {
        validated = parsed;
      } else {
        console.warn("[generate-l3-interview] Validation failed, using fallback");
        validated = buildFallbackQuestions(scores) as Record<string, unknown>;
      }
    } catch {
      console.warn("[generate-l3-interview] JSON parse failed, using fallback");
      validated = buildFallbackQuestions(scores) as Record<string, unknown>;
    }

    // ---- Store interview config ----
    const existingConfig = (challenge.config_json || {}) as Record<string, unknown>;
    await supabase
      .from("business_challenges")
      .update({
        config_json: { ...existingConfig, l3_interview: validated },
        generation_status: "ready",
        context_snapshot: {
          candidate_ximatar: archetype,
          candidate_level: candidateProfile.ximatar_level,
          candidate_scores: scores,
          has_cv_tension: !!cvAnalysis,
          alignment_score: cvAnalysis?.alignment_score ?? null,
          has_l1_data: !!l1Submission,
          has_l2_data: !!l2Submission,
          trajectory_events: trajectory?.length || 0,
          generated_at: new Date().toISOString(),
        },
      })
      .eq("id", challenge_id);

    // ---- Audit ----
    emitAuditEventWithMetric(
      {
        actorType: "business",
        actorId: user.id,
        action: "challenge.l3_interview_generated",
        entityType: "business_challenge",
        entityId: challenge_id,
        correlationId,
        metadata: {
          candidate_profile_id,
          candidate_ximatar: archetype,
          questions_count: (validated.questions as unknown[]).length,
          locale,
          has_tension_data: !!cvAnalysis,
        },
      },
      "l3_interviews_generated"
    );

    // Update AI context for L3
    await updateUserAiContext(candidateProfile.user_id, {
      l3_summary: {
        questions_count: (validated.questions as unknown[]).length,
        question_types: (validated.questions as any[]).map((q: any) => q.question_type),
        last_l3_at: new Date().toISOString(),
      },
      l3_updated_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      interview: validated,
      candidate_context: {
        ximatar: archetype,
        level: candidateProfile.ximatar_level,
        has_cv_tension: !!cvAnalysis,
        has_l1_data: !!l1Submission,
        has_l2_data: !!l2Submission,
      },
    });
  } catch (err) {
    console.error("[generate-l3-interview] Error:", err);
    if (err instanceof AnthropicError) {
      return errorResponse(err.statusCode, err.errorCode, err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", "Failed to generate L3 interview");
  }
});
