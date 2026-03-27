/**
 * generate-growth-test — XIMA Growth Hub v1.0
 * 
 * Generates a personalized 5-question test after a user completes a learning resource.
 * Questions connect the resource content to the user's specific pillar gaps.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { loadUserAiContext, buildContextBlock } from "../_shared/aiContext.ts";

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
    const { progress_id } = body;
    const locale = body.locale || "en";

    if (!progress_id) {
      return errorResponse(400, "MISSING_FIELD", "progress_id is required");
    }

    // Check profiling opt-out
    const { data: optCheck } = await supabase
      .from("profiles")
      .select("profiling_opt_out")
      .eq("user_id", user.id)
      .single();
    if (optCheck?.profiling_opt_out === true) {
      return errorResponse(403, "PROFILING_OPT_OUT",
        "Automated profiling is disabled for this account.");
    }

    // 1. Progress record
    const { data: progress, error: progressErr } = await supabase
      .from("growth_hub_progress")
      .select("resource_id, resource_type, resource_title, resource_platform, primary_pillar, path_id")
      .eq("id", progress_id)
      .eq("user_id", user.id)
      .single();

    if (progressErr || !progress) {
      return errorResponse(404, "PROGRESS_NOT_FOUND", "Progress record not found");
    }

    // 2. User profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return errorResponse(404, "PROFILE_NOT_FOUND", "User profile not found");
    }

    // Resolve fields
    const _ximatarArchetype = (profile.ximatar_archetype || profile.ximatar || profile.ximatar_id || "unknown") as string;
    const _ximatarLevel = (profile.ximatar_level || 1) as number;
    const _assessmentScores = (profile.assessment_scores || profile.pillar_scores) as Record<string, number> || {};

    // 3. CV tension
    const { data: cvAnalysis } = await supabase
      .from("cv_identity_analysis")
      .select("tension_gaps, alignment_score")
      .eq("user_id", user.id)
      .maybeSingle();

    const scores = _assessmentScores;
    const pillarScore = scores[progress.primary_pillar] ?? 50;
    const tensionSummary = cvAnalysis?.tension_gaps
      ? JSON.stringify(cvAnalysis.tension_gaps)
      : "No specific tension data";

    const questionTypeGuide = progress.resource_type === "course"
      ? `For COURSES:
   - 2 scenario-based: "Given this situation, how would you apply what you learned?"
   - 2 conceptual: "Explain the key principle behind X and how it relates to your work"
   - 1 self-reflection: "How has this course changed your approach to [pillar aspect]?"`
      : progress.resource_type === "book"
      ? `For BOOKS:
   - 2 conceptual: "The author argues X. How does this apply to your professional context?"
   - 2 application: "Describe how you would use [concept from book] in a real situation"
   - 1 critical thinking: "What is the strongest/weakest argument in the book and why?"`
      : `For PODCASTS:
   - 2 insight-based: "What was the key insight from [episode/podcast] and how does it relate to [pillar]?"
   - 2 application: "The host/guest discussed X. How would you apply this?"
   - 1 self-reflection: "What perspective shift did this give you about [pillar aspect]?"`;

    // Load AI context
    const userContext = await loadUserAiContext(user.id);
    const contextBlock = buildContextBlock(userContext);

    const systemPrompt = `You are the XIMA Growth Test Architect. You generate personalized assessment questions that verify whether a user truly absorbed learning material in the context of their specific professional growth needs.

USER: ${_ximatarArchetype} L${_ximatarLevel}, strengthening ${progress.primary_pillar} (score: ${pillarScore})
Key tension: ${tensionSummary}

RESOURCE COMPLETED:
- Type: ${progress.resource_type}
- Title: "${progress.resource_title}"
- Platform: ${progress.resource_platform || "unknown"}
- Pillar it targets: ${progress.primary_pillar}

TEST DESIGN RULES:
1. Generate exactly 5 questions
2. Question types:
${questionTypeGuide}
3. Each question MUST connect the resource content to the user's SPECIFIC pillar gap
4. Questions should be answerable in 2-4 sentences each
5. Include evaluation criteria for each question
6. Difficulty should match the resource level

IMPORTANT: Use your knowledge of what "${progress.resource_title}" typically covers. If it's a well-known resource, reference specific concepts, frameworks, or ideas from it.

LANGUAGE: ${locale}

` + contextBlock + `

Return ONLY valid JSON:
{
  "test": {
    "title": "Test title referencing the resource",
    "resource_reference": "${progress.resource_title}",
    "resource_type": "${progress.resource_type}",
    "target_pillar": "${progress.primary_pillar}",
    "time_limit_minutes": 15,
    "questions": [
      {
        "id": "tq1",
        "question_text": "The question",
        "question_type": "scenario|conceptual|application|self_reflection|critical_thinking|insight",
        "max_words": 100,
        "evaluation_criteria": {
          "excellent": "What an excellent answer includes",
          "good": "What a good answer includes",
          "poor": "What a poor answer looks like"
        }
      }
    ]
  }
}`;

    const result = await callAnthropicApi({
      system: systemPrompt,
      userMessage: `Generate the Growth Hub test for the completed resource "${progress.resource_title}". Return ONLY valid JSON.`,
      correlationId,
      functionName: "generate-growth-test",
      maxTokens: 2048,
      temperature: 0.6,
    });

    const parsed = extractJsonFromAiContent(result.content);
    if (!parsed?.test?.questions) {
      return errorResponse(500, "AI_PARSE_ERROR", "Failed to parse AI response");
    }

    // Validate
    const questions = parsed.test.questions;
    if (questions.length !== 5) {
      console.warn(`Expected 5 questions, got ${questions.length}`);
    }

    for (const q of questions) {
      if (!q.question_text || !q.id || !q.evaluation_criteria) {
        return errorResponse(500, "VALIDATION_ERROR", "Invalid test question structure");
      }
    }

    // Store test config
    const { error: updateErr } = await supabase
      .from("growth_hub_progress")
      .update({ test_config: parsed.test, status: "test_ready" })
      .eq("id", progress_id);

    if (updateErr) {
      console.error("Failed to update progress with test config:", updateErr);
      return errorResponse(500, "DB_ERROR", "Failed to save test configuration");
    }

    // Audit
    emitAuditEventWithMetric({
      actorType: "candidate",
      actorId: user.id,
      action: "growth.test_generated",
      entityType: "growth_test",
      entityId: progress_id,
      correlationId,
      metadata: {
        resource_title: progress.resource_title,
        resource_type: progress.resource_type,
        target_pillar: progress.primary_pillar,
        questions_count: questions.length,
      },
    }, "growth_tests_generated");

    return jsonResponse({ success: true, test: parsed.test, progress_id });
  } catch (err) {
    console.error("generate-growth-test error:", err);
    if (err instanceof AnthropicError) {
      return errorResponse(err.statusCode, err.errorCode, err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
});
