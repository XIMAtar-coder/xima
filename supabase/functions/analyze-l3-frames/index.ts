/**
 * analyze-l3-frames — L3 Video Frame Analysis + Viewing Guide
 *
 * Extracts observational signals from candidate video frames and generates
 * a structured viewing guide for the human reviewer.
 *
 * The AI does NOT evaluate. It observes. Humans decide.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AnthropicError } from "../_shared/anthropicClient.ts";
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
import { persistTrajectoryEvent, type PillarDeltas } from "../_shared/pillarTrajectory.ts";

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

interface FrameInput {
  question_id: string;
  frame_images: string[];   // base64 JPEG
  frame_timestamps: number[];
}

interface AnalyzeL3FramesRequest {
  submission_id: string;
  frames?: FrameInput[];
  locale?: string;
}

interface QuestionObs {
  question_id: string;
  posture_notes: string;
  energy_level: string;
  engagement_shift: string;
  notable_signals: string;
  congruence_with_profile: string;
}

interface ViewingGuide {
  strongest_engagement_questions: string[];
  potential_discomfort_questions: string[];
  energy_arc: string;
  congruence_summary: string;
  recommended_focus_areas: string[];
  reviewer_notes: string;
}

interface L3Analysis {
  per_question_observations: QuestionObs[];
  viewing_guide: ViewingGuide;
  visual_analysis_available: boolean;
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function computeL3Deltas(analysis: L3Analysis): PillarDeltas {
  const deltas: PillarDeltas = { drive: 0, computational_power: 0, communication: 0, creativity: 0, knowledge: 0 };
  if (!analysis.visual_analysis_available) return deltas;

  let highEngagementCount = 0;
  for (const obs of analysis.per_question_observations) {
    if (obs.energy_level === "high") highEngagementCount++;
    if (obs.engagement_shift === "increasing") highEngagementCount++;
  }

  // Strong energy arc → Drive
  if (highEngagementCount >= 2) deltas.drive = 2;
  else if (highEngagementCount >= 1) deltas.drive = 1;

  // Congruence → Communication (presence/articulation)
  const congruence = analysis.viewing_guide.congruence_summary?.toLowerCase() || "";
  if (congruence.includes("align") || congruence.includes("consistent") || congruence.includes("congru")) {
    deltas.communication = 2;
  }

  // Per-question high engagement on tension probes → small knowledge/creativity boost
  const strongQs = analysis.viewing_guide.strongest_engagement_questions?.length || 0;
  if (strongQs >= 3) {
    deltas.knowledge = 1;
    deltas.creativity = 1;
  }

  return deltas;
}

function validateAnalysis(parsed: Record<string, unknown>): parsed is L3Analysis {
  const obs = parsed.per_question_observations;
  if (!Array.isArray(obs)) return false;
  for (const o of obs) {
    if (typeof o !== "object" || !o) return false;
    const oo = o as Record<string, unknown>;
    if (!oo.question_id || typeof oo.posture_notes !== "string") return false;
  }
  const guide = parsed.viewing_guide as Record<string, unknown> | undefined;
  if (!guide) return false;
  if (typeof guide.energy_arc !== "string") return false;
  if (typeof guide.reviewer_notes !== "string") return false;
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
    const body: AnalyzeL3FramesRequest = await req.json();
    const { submission_id, frames, locale = "en" } = body;
    if (!submission_id) return errorResponse(400, "MISSING_FIELDS", "submission_id is required");

    // ---- Fetch submission ----
    const { data: submission, error: subErr } = await supabase
      .from("challenge_submissions")
      .select("id, challenge_id, candidate_profile_id, hiring_goal_id, business_id, signals_payload, signals_version")
      .eq("id", submission_id)
      .single();
    if (subErr || !submission) return errorResponse(404, "NOT_FOUND", "Submission not found");

    // Ownership check
    const { data: biz } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!biz || biz.id !== submission.business_id) {
      if (roleRow.role !== "admin") return forbiddenResponse("You do not own this submission");
    }

    // ---- GDPR check ----
    const { data: candidateProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", submission.candidate_profile_id)
      .single();
    if (candidateProfile?.profiling_opt_out === true) return profilingOptOutResponse();

    // ---- Fetch interview config ----
    const { data: challenge } = await supabase
      .from("business_challenges")
      .select("config_json")
      .eq("id", submission.challenge_id)
      .single();

    const configJson = (challenge?.config_json || {}) as Record<string, unknown>;
    const l3Interview = configJson.l3_interview as Record<string, unknown> | undefined;
    const interviewQuestions = (l3Interview?.questions || []) as Array<Record<string, unknown>>;
    const interviewBrief = (l3Interview?.interview_brief || {}) as Record<string, unknown>;

    const archetype = (candidateProfile?.ximatar_name || candidateProfile?.ximatar || candidateProfile?.ximatar_archetype || candidateProfile?.ximatar_id || "unknown") as string;
    const level = (candidateProfile?.ximatar_level || 1) as number;

    // ---- Fallback: no frames ----
    if (!frames || frames.length === 0) {
      const fallbackAnalysis: L3Analysis = {
        per_question_observations: interviewQuestions.map((q) => ({
          question_id: q.id as string || "unknown",
          posture_notes: "Video frames not available — review video directly",
          energy_level: "unknown",
          engagement_shift: "unknown",
          notable_signals: `This question probes ${q.target_tension || "a key tension"}. Watch for ${q.what_to_watch_for || "behavioral signals"}.`,
          congruence_with_profile: "unknown",
        })),
        viewing_guide: {
          strongest_engagement_questions: [],
          potential_discomfort_questions: [],
          energy_arc: "Video frame analysis not available. Review the full video using the per-question watching guides.",
          congruence_summary: "Unable to assess visual congruence without video frames.",
          recommended_focus_areas: (interviewBrief.key_tensions_to_resolve || []) as string[],
          reviewer_notes: `${interviewBrief.candidate_summary || ""} ${interviewBrief.ideal_outcome || ""}`.trim(),
        },
        visual_analysis_available: false,
      };

      // Save
      const existingSignals = (submission.signals_payload || {}) as Record<string, unknown>;
      await supabase
        .from("challenge_submissions")
        .update({
          signals_payload: { ...existingSignals, l3_analysis: fallbackAnalysis },
          signals_version: "v2_claude_l3",
        })
        .eq("id", submission_id);

      emitAuditEventWithMetric(
        {
          actorType: "business",
          actorId: user.id,
          action: "challenge.l3_frames_analyzed",
          entityType: "challenge_submission",
          entityId: submission_id,
          correlationId,
          metadata: {
            candidate_profile_id: submission.candidate_profile_id,
            questions_analyzed: fallbackAnalysis.per_question_observations.length,
            frames_provided: 0,
            visual_analysis: false,
            locale,
          },
        },
        "l3_frames_analyzed"
      );

      return jsonResponse({
        success: true,
        analysis: fallbackAnalysis,
        submission_id,
        visual_analysis_available: false,
      });
    }

    // ---- Build Claude vision request ----
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return errorResponse(500, "AI_NOT_CONFIGURED", "ANTHROPIC_API_KEY not set");

    const tensionsToResolve = (interviewBrief.key_tensions_to_resolve || []) as string[];

    const systemContext = `You are the XIMA L3 Video Review Assistant. You analyze video frames from a candidate's L3 interview and generate observational signals for a human reviewer.

CRITICAL RULES:
- You are NOT evaluating the candidate. You are providing OBSERVATIONS.
- You CANNOT identify or name the person in the video. Focus only on behavioral signals.
- Never make a hiring recommendation. The human decides.
- Report what you observe: posture, energy level, engagement, confidence indicators, eye contact patterns, gesture frequency, emotional shifts between questions.
- Be factual, not judgmental. "Candidate appears relaxed with open posture" not "Candidate is confident."

INTERVIEW CONTEXT:
- Candidate XIMAtar: ${archetype} L${level}
- Key tensions being probed: ${JSON.stringify(tensionsToResolve)}
- Interview brief: ${JSON.stringify(interviewBrief)}

For each question, analyze the frames and note:
1. Posture and body language signals
2. Energy/engagement level compared to other questions
3. Any notable shifts
4. Congruence: does their visual presence match what their profile predicts?

Then generate an overall viewing guide.

LANGUAGE: ${locale}

Return ONLY valid JSON:
{
  "per_question_observations": [
    {
      "question_id": "q1",
      "posture_notes": "string",
      "energy_level": "high" | "moderate" | "low",
      "engagement_shift": "increasing" | "stable" | "decreasing",
      "notable_signals": "string",
      "congruence_with_profile": "aligned" | "neutral" | "divergent"
    }
  ],
  "viewing_guide": {
    "strongest_engagement_questions": ["q2", "q4"],
    "potential_discomfort_questions": ["q3"],
    "energy_arc": "string",
    "congruence_summary": "string",
    "recommended_focus_areas": ["area 1"],
    "reviewer_notes": "2-3 sentence executive summary"
  },
  "visual_analysis_available": true
}`;

    // Build content array with images
    const contentParts: Array<Record<string, unknown>> = [
      { type: "text", text: systemContext },
    ];

    // Map question IDs to their text for context
    const questionMap: Record<string, string> = {};
    for (const q of interviewQuestions) {
      questionMap[q.id as string] = q.question_text as string;
    }

    for (const f of frames) {
      contentParts.push({
        type: "text",
        text: `\n--- Question ${f.question_id}: "${questionMap[f.question_id] || "Unknown question"}" ---\nFrames from the candidate's video response (at ${f.frame_timestamps.map((t) => Math.round(t) + "s").join(", ")}):`,
      });
      for (const img of f.frame_images.slice(0, 3)) {
        contentParts.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: img },
        });
      }
    }

    contentParts.push({
      type: "text",
      text: "\nAnalyze the visual signals across all questions and generate the viewing guide. Return ONLY valid JSON.",
    });

    // ---- Call Claude Vision ----
    const requestId = crypto.randomUUID();
    const start = Date.now();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: contentParts }],
        temperature: 0.5,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[analyze-l3-frames] Claude error:", response.status, errText.substring(0, 300));
      return errorResponse(502, "AI_ERROR", "AI service error during frame analysis");
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) return errorResponse(502, "EMPTY_RESPONSE", "Empty response from Claude");

    // ---- Persist audit envelope (fire-and-forget) ----
    const auditClient = createClient(supabaseUrl, serviceKey);
    auditClient.from("ai_invocation_log").insert({
      request_id: requestId,
      correlation_id: correlationId,
      function_name: "analyze-l3-frames",
      provider: "anthropic",
      model_name: "claude-sonnet-4-20250514",
      model_version: "2025-05-14",
      temperature: 0.5,
      max_tokens: 4096,
      prompt_hash: "vision_frames",
      prompt_template_version: "1.0",
      scoring_schema_version: "1.0",
      input_summary: `submission=${submission_id},frames=${frames.length}`,
      output_summary: `len=${content.length}`,
      status: "success",
      error_code: null,
      latency_ms: latencyMs,
    }).then(() => {}).catch((e: unknown) => console.error("[audit] error:", e));

    // ---- Parse and validate ----
    let validated: L3Analysis;
    try {
      const jsonStr = extractJsonFromAiContent(content);
      const parsed = JSON.parse(jsonStr);
      if (validateAnalysis(parsed)) {
        validated = parsed as L3Analysis;
        validated.visual_analysis_available = true;
      } else {
        console.warn("[analyze-l3-frames] Validation failed, partial result");
        validated = {
          per_question_observations: frames.map((f) => ({
            question_id: f.question_id,
            posture_notes: "Analysis could not be fully validated",
            energy_level: "unknown",
            engagement_shift: "unknown",
            notable_signals: "Review video directly",
            congruence_with_profile: "unknown",
          })),
          viewing_guide: {
            strongest_engagement_questions: [],
            potential_discomfort_questions: [],
            energy_arc: "Analysis validation failed. Review video directly.",
            congruence_summary: "Could not determine congruence.",
            recommended_focus_areas: tensionsToResolve,
            reviewer_notes: (interviewBrief.candidate_summary as string) || "Review all questions carefully.",
          },
          visual_analysis_available: false,
        };
      }
    } catch {
      console.warn("[analyze-l3-frames] JSON parse failed");
      validated = {
        per_question_observations: [],
        viewing_guide: {
          strongest_engagement_questions: [],
          potential_discomfort_questions: [],
          energy_arc: "Frame analysis failed. Review video directly.",
          congruence_summary: "Unable to assess.",
          recommended_focus_areas: tensionsToResolve,
          reviewer_notes: "AI analysis encountered an error. Please review the video manually.",
        },
        visual_analysis_available: false,
      };
    }

    // ---- Save analysis ----
    const existingSignals = (submission.signals_payload || {}) as Record<string, unknown>;
    await supabase
      .from("challenge_submissions")
      .update({
        signals_payload: { ...existingSignals, l3_analysis: validated },
        signals_version: "v2_claude_l3",
      })
      .eq("id", submission_id);

    // ---- Pillar trajectory ----
    if (candidateProfile?.user_id && validated.visual_analysis_available) {
      const deltas = computeL3Deltas(validated);
      const hasDeltas = Object.values(deltas).some((d) => d !== 0);
      if (hasDeltas) {
        persistTrajectoryEvent({
          user_id: candidateProfile.user_id,
          source_function: "analyze-l3-frames",
          source_type: "l3_challenge",
          source_entity_id: submission_id,
          correlation_id: correlationId,
          deltas,
          reasoning: validated.viewing_guide.congruence_summary,
        });
      }
    }

    // ---- Audit ----
    emitAuditEventWithMetric(
      {
        actorType: "business",
        actorId: user.id,
        action: "challenge.l3_frames_analyzed",
        entityType: "challenge_submission",
        entityId: submission_id,
        correlationId,
        metadata: {
          candidate_profile_id: submission.candidate_profile_id,
          questions_analyzed: validated.per_question_observations.length,
          frames_provided: frames.length,
          visual_analysis: validated.visual_analysis_available,
          locale,
        },
      },
      "l3_frames_analyzed"
    );

    return jsonResponse({
      success: true,
      analysis: validated,
      submission_id,
      visual_analysis_available: validated.visual_analysis_available,
    });
  } catch (err) {
    console.error("[analyze-l3-frames] Error:", err);
    if (err instanceof AnthropicError) {
      return errorResponse(err.statusCode, err.errorCode, err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", "Failed to analyze L3 frames");
  }
});
