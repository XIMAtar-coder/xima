/**
 * evaluate-growth-test — XIMA Growth Hub v1.0
 * 
 * Evaluates user test answers, computes pillar trajectory deltas (only on pass),
 * and provides immediate feedback. Only passed tests produce pillar growth.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { persistTrajectoryEvent } from "../_shared/pillarTrajectory.ts";
import { loadUserAiContext, buildContextBlock, updateUserAiContext } from "../_shared/aiContext.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const correlationId = extractCorrelationId(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return unauthorizedResponse();

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const { progress_id, answers } = body;
    const locale = body.locale || "en";

    if (!progress_id || !answers || !Array.isArray(answers)) {
      return errorResponse(400, "MISSING_FIELD", "progress_id and answers array are required");
    }

    // Fetch data in parallel
    const [optResult, progressResult, profileResult] = await Promise.all([
      supabase.from("profiles").select("profiling_opt_out").eq("user_id", user.id).single(),
      supabase.from("growth_hub_progress")
        .select("resource_title, resource_type, primary_pillar, test_config, path_id, status")
        .eq("id", progress_id).eq("user_id", user.id).single(),
      supabase.from("profiles")
        .select("ximatar_archetype, ximatar, ximatar_id, ximatar_level, assessment_scores, pillar_scores")
        .eq("user_id", user.id).single(),
    ]);

    if (optResult.data?.profiling_opt_out === true) {
      return errorResponse(403, "PROFILING_OPT_OUT", "Automated profiling is disabled for this account.");
    }

    const progress = progressResult.data;
    if (progressResult.error || !progress) {
      return errorResponse(404, "PROGRESS_NOT_FOUND", "Progress record not found");
    }

    if (!progress.test_config) {
      return errorResponse(400, "NO_TEST", "No test has been generated for this resource yet");
    }

    if (progress.status !== "test_ready" && progress.status !== "test_failed") {
      return errorResponse(400, "INVALID_STATUS", `Cannot evaluate test in status: ${progress.status}`);
    }

    const profile = profileResult.data;
    if (!profile) {
      return errorResponse(404, "PROFILE_NOT_FOUND", "User profile not found");
    }

    // Resolve fields
    const _ximatarArchetype = (profile.ximatar_archetype || profile.ximatar || profile.ximatar_id || "unknown") as string;
    const _ximatarLevel = (profile.ximatar_level || 1) as number;
    const _assessmentScores = (profile.assessment_scores || profile.pillar_scores) as Record<string, number> || {};

    const scores = _assessmentScores;
    const pillarScore = scores[progress.primary_pillar] ?? 50;
    const testConfig = progress.test_config as any;

    // Build Q&A context for Claude
    const qaContext = testConfig.questions.map((q: any) => {
      const userAnswer = answers.find((a: any) => a.question_id === q.id);
      return `Question (${q.question_type}): ${q.question_text}
Evaluation criteria:
- Excellent: ${q.evaluation_criteria.excellent}
- Good: ${q.evaluation_criteria.good}
- Poor: ${q.evaluation_criteria.poor}
User's answer: ${userAnswer?.answer_text || "(no answer provided)"}`;
    }).join("\n\n");

    // Load AI context
    const userContext = await loadUserAiContext(user.id);
    const contextBlock = buildContextBlock(userContext);

    const systemPrompt = `You are the XIMA Growth Test Evaluator. Score test answers and determine pillar trajectory impact.

USER: ${_ximatarArchetype} L${_ximatarLevel}, strengthening ${progress.primary_pillar} (score: ${pillarScore})
Resource completed: "${progress.resource_title}" (${progress.resource_type})

SCORING RULES:
- Each question scored 0-20 (5 questions = max 100)
- Provide specific, constructive feedback per question in ${locale}
- Be honest but encouraging — growth mindset framing

PILLAR DELTA RULES (Growth Hub gradient: ±1 to ±3 max):
- Score 90-100 → primary pillar +3, secondary +1
- Score 75-89 → primary pillar +2, secondary +1
- Score 60-74 → primary pillar +1
- Score below 60 → no positive deltas (learning attempt not punished, score 0)
- NEVER apply negative deltas for Growth Hub tests — failed tests = no change, not regression

PASS THRESHOLD: 60/100

QUESTIONS, CRITERIA, AND USER ANSWERS:
${qaContext}

LANGUAGE: ${locale}
${contextBlock}
Return ONLY valid JSON:
{
  "results": {
    "total_score": number,
    "passed": boolean,
    "per_question": [
      {
        "question_id": "tq1",
        "score": number,
        "feedback": "Specific feedback"
      }
    ],
    "pillar_deltas": {
      "drive": number,
      "computational_power": number,
      "communication": number,
      "creativity": number,
      "knowledge": number
    },
    "delta_reasoning": "1 sentence explaining why these deltas",
    "overall_feedback": "2-3 sentence growth feedback",
    "next_recommendation": "What to study or do next"
  }
}`;

    const result = await callAnthropicApi({
      system: systemPrompt,
      userMessage: "Evaluate the test answers and return the results. Return ONLY valid JSON.",
      correlationId,
      functionName: "evaluate-growth-test",
      maxTokens: 2048,
      temperature: 0.3,
    });

    const parsed = extractJsonFromAiContent(result.content);
    if (!parsed?.results) {
      return errorResponse(500, "AI_PARSE_ERROR", "Failed to parse AI evaluation response");
    }

    const v = parsed.results;

    // Validate scores
    if (typeof v.total_score !== "number" || v.total_score < 0 || v.total_score > 100) {
      return errorResponse(500, "VALIDATION_ERROR", "Invalid total score");
    }

    // Ensure no negative deltas for Growth Hub
    const cleanDeltas: Record<string, number> = {};
    for (const p of ["drive", "computational_power", "communication", "creativity", "knowledge"]) {
      const d = v.pillar_deltas?.[p] || 0;
      cleanDeltas[p] = Math.max(0, Math.min(3, d)); // Clamp 0-3, no negatives
    }
    if (!v.passed) {
      for (const p of Object.keys(cleanDeltas)) cleanDeltas[p] = 0;
    }
    v.pillar_deltas = cleanDeltas;

    // 1. Update progress record
    await supabase
      .from("growth_hub_progress")
      .update({
        status: v.passed ? "test_passed" : "test_failed",
        test_score: v.total_score,
        test_passed: v.passed,
        test_answers: answers,
        pillar_deltas: v.passed ? v.pillar_deltas : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress_id);

    // 2. Persist trajectory (ONLY if passed)
    if (v.passed) {
      await persistTrajectoryEvent({
        user_id: user.id,
        source_function: "evaluate-growth-test",
        source_type: "growth_hub_test",
        source_entity_id: progress_id,
        correlation_id: correlationId,
        deltas: v.pillar_deltas,
        reasoning: v.delta_reasoning,
      });
    }

    // 3. Check if entire growth path is now complete
    let pathCompleted = false;
    if (progress.path_id) {
      const { data: allProgress } = await supabase
        .from("growth_hub_progress")
        .select("status")
        .eq("path_id", progress.path_id)
        .eq("user_id", user.id);

      pathCompleted = allProgress?.every(p => p.status === "test_passed") || false;

      if (pathCompleted) {
        await supabase
          .from("growth_paths")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", progress.path_id);
      }
    }

    // Audit
    emitAuditEventWithMetric({
      actorType: "candidate",
      actorId: user.id,
      action: "growth.test_evaluated",
      entityType: "growth_test",
      entityId: progress_id,
      correlationId,
      metadata: {
        resource_title: progress.resource_title,
        resource_type: progress.resource_type,
        target_pillar: progress.primary_pillar,
        score: v.total_score,
        passed: v.passed,
        ximatar: _ximatarArchetype,
        path_completed: pathCompleted,
      },
    }, "growth_tests_completed");

    // Update progressive AI context
    const existingGrowth = userContext.growth_summary || {
      courses_completed: 0, books_completed: 0, podcasts_completed: 0,
      tests_taken: 0, tests_passed: 0,
      total_deltas: { drive: 0, computational_power: 0, communication: 0, creativity: 0, knowledge: 0 },
    };
    const resourceType = progress.resource_type || "course";
    const typeKey = `${resourceType}s_completed`;

    await updateUserAiContext(user.id, {
      growth_summary: {
        ...existingGrowth,
        [typeKey]: (existingGrowth[typeKey] || 0) + 1,
        tests_taken: (existingGrowth.tests_taken || 0) + 1,
        tests_passed: (existingGrowth.tests_passed || 0) + (v.passed ? 1 : 0),
        total_deltas: v.passed ? {
          drive: (existingGrowth.total_deltas?.drive || 0) + (cleanDeltas.drive || 0),
          computational_power: (existingGrowth.total_deltas?.computational_power || 0) + (cleanDeltas.computational_power || 0),
          communication: (existingGrowth.total_deltas?.communication || 0) + (cleanDeltas.communication || 0),
          creativity: (existingGrowth.total_deltas?.creativity || 0) + (cleanDeltas.creativity || 0),
          knowledge: (existingGrowth.total_deltas?.knowledge || 0) + (cleanDeltas.knowledge || 0),
        } : existingGrowth.total_deltas,
        preferred_type: resourceType,
      },
      growth_updated_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      results: {
        total_score: v.total_score,
        passed: v.passed,
        per_question: v.per_question,
        overall_feedback: v.overall_feedback,
        next_recommendation: v.next_recommendation,
      },
      pillar_impact: v.passed ? {
        deltas: v.pillar_deltas,
        reasoning: v.delta_reasoning,
      } : {
        deltas: null,
        reasoning: "Complete the test with a score of 60+ to earn pillar growth points. You can retake the test.",
      },
      path_completed: pathCompleted,
    });
  } catch (err) {
    console.error("evaluate-growth-test error:", err);
    if (err instanceof AnthropicError) {
      return errorResponse(err.statusCode, err.errorCode, err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
});
