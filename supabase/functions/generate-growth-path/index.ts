/**
 * generate-growth-path — XIMA Growth Hub v1.0
 * 
 * Generates a personalized learning path with courses, books, and podcasts
 * targeting the user's weakest pillars. Claude recommends real, free content.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES } from "../_shared/ximatarTaxonomy.ts";
import { loadUserAiContext, buildContextBlock, updateUserAiContext } from "../_shared/aiContext.ts";
import { checkDatabaseFirst, depositInference } from "../_shared/intelligenceEngine.ts";

const VALID_PILLARS = ["drive", "computational_power", "communication", "creativity", "knowledge"];

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
    const locale = body.locale || "en";

    // Fetch user data in parallel
    const [profileResult, optCheckResult, cvAnalysisResult, trajectoryResult, completedResult] = await Promise.all([
      supabase.from("profiles")
        .select("ximatar_archetype, ximatar, ximatar_id, ximatar_level, assessment_scores, pillar_scores, preferred_language, language, profiling_opt_out")
        .eq("user_id", user.id).single(),
      Promise.resolve(null), // opt-out checked inline
      supabase.from("cv_identity_analysis")
        .select("alignment_score, tension_gaps")
        .eq("user_id", user.id).maybeSingle(),
      supabase.from("pillar_trajectory_log")
        .select("drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta, source_type, created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("growth_hub_progress")
        .select("resource_title")
        .eq("user_id", user.id)
        .in("status", ["completed", "test_passed"]),
    ]);

    const profile = profileResult.data;
    if (profileResult.error || !profile) {
      console.error("[generate-growth-path] Profile error:", profileResult.error?.message || "not found");
      return errorResponse(404, "PROFILE_NOT_FOUND", "User profile not found. Please complete the assessment first.");
    }

    if (profile.profiling_opt_out === true) {
      return errorResponse(403, "PROFILING_OPT_OUT", "Automated profiling is disabled for this account.");
    }

    const cvAnalysis = cvAnalysisResult.data;
    const trajectory = trajectoryResult.data;
    const completedTitles = completedResult.data?.map(p => p.resource_title) || [];

    // Resolve fields from whichever column names exist
    const assessmentScores = (profile.assessment_scores || profile.pillar_scores) as Record<string, number> | null;
    const ximatarRaw = (profile.ximatar_archetype || profile.ximatar || profile.ximatar_id) as string | null;
    const ximatarLevel = (profile.ximatar_level || 1) as number;
    const preferredLang = (profile.preferred_language || profile.language || locale) as string;

    if (!assessmentScores) {
      return errorResponse(400, "ASSESSMENT_REQUIRED", "Please complete the XIMA assessment before generating a growth path.");
    }

    // Resolve XIMAtar key (might be UUID)
    let ximatarKey = ximatarRaw || "unknown";
    let archetypeInfo = XIMATAR_PROFILES[ximatarKey.toLowerCase()];

    if (!archetypeInfo && ximatarKey && ximatarKey.includes("-")) {
      // Likely a UUID — look up from ximatars table
      const { data: ximatarRecord } = await supabase
        .from("ximatars")
        .select("label, animal")
        .eq("id", ximatarKey)
        .maybeSingle();

      if (ximatarRecord) {
        const animalLower = (ximatarRecord.animal || ximatarRecord.label || "").toLowerCase().trim();
        archetypeInfo = XIMATAR_PROFILES[animalLower];
        if (archetypeInfo) ximatarKey = animalLower;
      }
    }

    const archetype = ximatarKey.toLowerCase();

    // Compute weakest pillars
    const scores = assessmentScores;
    const pillarEntries = VALID_PILLARS.map(p => ({ pillar: p, score: scores[p] ?? 50 }));
    pillarEntries.sort((a, b) => a.score - b.score);
    const weakestPillar = pillarEntries[0].pillar;
    const weakestScore = pillarEntries[0].score;
    const secondWeakest = pillarEntries[1].pillar;
    const secondScore = pillarEntries[1].score;

    // Trajectory summary
    let trajectorySummary = "No trajectory data yet";
    if (trajectory && trajectory.length > 0) {
      const totals: Record<string, number> = {};
      for (const p of VALID_PILLARS) totals[p] = 0;
      for (const t of trajectory) {
        totals.drive += t.drive_delta || 0;
        totals.computational_power += t.computational_power_delta || 0;
        totals.communication += t.communication_delta || 0;
        totals.creativity += t.creativity_delta || 0;
        totals.knowledge += t.knowledge_delta || 0;
      }
      trajectorySummary = Object.entries(totals).map(([p, d]) =>
        `${p}: ${d >= 0 ? '+' : ''}${d}`).join(", ");
    }

    const tensionSummary = cvAnalysis?.tension_gaps
      ? JSON.stringify(cvAnalysis.tension_gaps)
      : "No CV analysis yet";

    const level = ximatarLevel;
    const nextLevel = Math.min(level + 1, 3);

    // ---- Intelligence Engine: check pattern library first (FREE) ----
    const dbDecision = await checkDatabaseFirst("growth_path", archetype, weakestPillar);
    if (dbDecision.source === "database" && dbDecision.data?.growth_path?.resources) {
      console.log(`[intelligence] Growth path served from pattern library (confidence: ${dbDecision.confidence})`);

      await supabase
        .from("growth_paths")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("status", "active");

      const v = dbDecision.data;
      v.growth_path.target_pillar = weakestPillar;

      const { data: newPath } = await supabase
        .from("growth_paths")
        .insert({
          user_id: user.id,
          path_title: v.growth_path.title,
          path_objective: v.growth_path.objective,
          target_pillar: weakestPillar,
          resources: v.growth_path.resources,
          growth_insight: v.growth_insight,
          next_milestone: v.next_milestone,
          estimated_total_hours: v.growth_path.estimated_total_hours,
          status: "active",
        })
        .select()
        .single();

      return jsonResponse({
        success: true,
        growth_path: v.growth_path,
        growth_insight: v.growth_insight,
        next_milestone: v.next_milestone,
        path_id: newPath?.id,
        user_context: { ximatar: archetype, level, weakest_pillar: weakestPillar, weakest_score: weakestScore },
        _intelligence: { source: "database", confidence: dbDecision.confidence, cost: 0 },
      });
    }

    // Load AI context
    const userContext = await loadUserAiContext(user.id);
    const contextBlock = buildContextBlock(userContext);

    const systemPrompt = `You are the XIMA Growth Advisor — a personal development coach powered by psychometric intelligence. Recommend specific, real, free learning resources.

USER PROFILE:
- XIMAtar: ${archetype} L${level} (${archetypeInfo?.title || archetype})
- Scores: Drive ${scores.drive ?? 50}, CompPower ${scores.computational_power ?? 50}, Comm ${scores.communication ?? 50}, Creativity ${scores.creativity ?? 50}, Knowledge ${scores.knowledge ?? 50}
- Weakest: ${weakestPillar} (${weakestScore}), Second weakest: ${secondWeakest} (${secondScore})
- CV alignment: ${cvAnalysis?.alignment_score ?? 'N/A'}/100
- Tensions: ${tensionSummary}
- Trajectory: ${trajectorySummary}
- Completed: ${completedTitles.length > 0 ? completedTitles.join(", ") : "None"}
- Language: ${preferredLang}

OBJECTIVE: Strengthen ${weakestPillar} for XIMAtar L${nextLevel} progression.

SOURCES (free content only):
Courses: Coursera/edX (audit), YouTube (TED, HBR, Stanford, CrashCourse), Khan Academy, FreeCodeCamp, Google Digital Garage, HubSpot Academy, Great Learning, Alison
Books: widely available titles, link to OpenLibrary/Google Books/Amazon
Podcasts: Spotify/Apple/YouTube — recommend specific shows or episodes

Return 10-13 resources: 4-5 courses + 3-4 books + 3-4 podcasts. 60% weakest pillar, 30% second weakest, 10% bridging.
For Italian users, prioritize Italian resources. Write descriptions in user's preferred language.

` + contextBlock + `

Return ONLY valid JSON:
{
  "growth_path": {
    "title": "Path name",
    "objective": "1-2 sentence description",
    "target_pillar": "${weakestPillar}",
    "estimated_total_hours": number,
    "resources": {
      "courses": [{"id":"course_1","title":"str","platform":"str","url":"str","primary_pillar":"str","secondary_pillar":"str|null","difficulty":"str","estimated_hours":0,"why_for_you":"str","language":"en|it","free_access_note":"str"}],
      "books": [{"id":"book_1","title":"str","author":"str","read_url":"str","primary_pillar":"str","estimated_hours":0,"key_takeaway":"str","why_for_you":"str","language":"en|it","availability":"str"}],
      "podcasts": [{"id":"podcast_1","title":"str","episode_title":"str|null","host":"str","platform":"str","url":"str","primary_pillar":"str","episode_length_minutes":0,"why_for_you":"str","language":"en|it"}]
    }
  },
  "growth_insight": "2-3 sentence motivational insight",
  "next_milestone": "What completing this path means"
}`;

    const result = await callAnthropicApi({
      system: systemPrompt,
      userMessage: `Generate the personalized Growth Hub learning path for this user. Focus on strengthening ${weakestPillar} (score: ${weakestScore}). Return ONLY valid JSON.`,
      correlationId,
      functionName: "generate-growth-path",
      maxTokens: 4096,
      temperature: 0.7,
    });

    const parsed = extractJsonFromAiContent(result.content);
    if (!parsed || !parsed.growth_path?.resources) {
      return errorResponse(500, "AI_PARSE_ERROR", "Failed to parse AI response");
    }

    // Validate
    const v = parsed;
    const courses = v.growth_path.resources.courses || [];
    const books = v.growth_path.resources.books || [];
    const podcasts = v.growth_path.resources.podcasts || [];

    if (courses.length < 3) {
      console.warn("Too few courses returned:", courses.length);
    }
    if (books.length < 2) {
      console.warn("Too few books returned:", books.length);
    }
    if (podcasts.length < 2) {
      console.warn("Too few podcasts returned:", podcasts.length);
    }

    // Ensure target_pillar matches
    v.growth_path.target_pillar = weakestPillar;

    // Archive existing active paths
    await supabase
      .from("growth_paths")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");

    // Insert new path
    const { data: newPath, error: pathError } = await supabase
      .from("growth_paths")
      .insert({
        user_id: user.id,
        path_title: v.growth_path.title,
        path_objective: v.growth_path.objective,
        target_pillar: v.growth_path.target_pillar,
        resources: v.growth_path.resources,
        growth_insight: v.growth_insight,
        next_milestone: v.next_milestone,
        estimated_total_hours: v.growth_path.estimated_total_hours,
        status: "active",
      })
      .select()
      .single();

    if (pathError || !newPath) {
      console.error("Failed to insert growth path:", pathError);
      return errorResponse(500, "DB_ERROR", "Failed to save growth path");
    }

    // Create progress records for each resource
    const allResources = [
      ...courses.map((r: any) => ({ ...r, resource_type: "course" })),
      ...books.map((r: any) => ({ ...r, resource_type: "book" })),
      ...podcasts.map((r: any) => ({ ...r, resource_type: "podcast" })),
    ];

    const progressRecords = allResources.map((r: any) => ({
      user_id: user.id,
      path_id: newPath.id,
      resource_id: r.id,
      resource_type: r.resource_type,
      resource_title: r.title,
      resource_platform: r.platform,
      resource_url: r.url || r.read_url,
      primary_pillar: r.primary_pillar,
      status: "not_started",
    }));

    if (progressRecords.length > 0) {
      const { error: progressError } = await supabase
        .from("growth_hub_progress")
        .insert(progressRecords);
      if (progressError) {
        console.error("Failed to insert progress records:", progressError);
      }
    }

    // Audit
    emitAuditEventWithMetric({
      actorType: "candidate",
      actorId: user.id,
      action: "growth.path_generated",
      entityType: "growth_path",
      entityId: newPath.id,
      correlationId,
      metadata: {
        target_pillar: weakestPillar,
        courses_count: courses.length,
        books_count: books.length,
        podcasts_count: podcasts.length,
        ximatar: archetype,
        level,
      },
    }, "growth_paths_generated");

    // Update progressive AI context
    await updateUserAiContext(user.id, {
      assessment_summary: {
        ximatar: archetype,
        level,
        scores: assessmentScores,
        edge: pillarEntries[pillarEntries.length - 1]?.pillar,
        friction: weakestPillar,
        trajectory_direction: trajectorySummary !== "No trajectory data yet" ? "active" : "not_started",
      },
      assessment_updated_at: new Date().toISOString(),
    });

    // Deposit into intelligence engine for future pattern matching
    await depositInference(user.id, "generate-growth-path", v, {
      patternType: "growth_path",
      archetype,
      targetPillar: weakestPillar,
    });

    return jsonResponse({
      success: true,
      growth_path: v.growth_path,
      growth_insight: v.growth_insight,
      next_milestone: v.next_milestone,
      path_id: newPath.id,
      user_context: {
        ximatar: archetype,
        level,
        weakest_pillar: weakestPillar,
        weakest_score: weakestScore,
      },
    });
  } catch (err) {
    console.error("generate-growth-path error:", err);
    if (err instanceof AnthropicError) {
      return errorResponse(err.statusCode, err.errorCode, err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
});
