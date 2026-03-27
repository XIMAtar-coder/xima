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

    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) {
      console.error("[generate-growth-path] Profile error:", profileErr?.message || "not found");
      return errorResponse(404, "PROFILE_NOT_FOUND", "User profile not found. Please complete the assessment first.");
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

    // 2. CV tension analysis
    const { data: cvAnalysis } = await supabase
      .from("cv_identity_analysis")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 3. Pillar trajectory (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trajectory } = await supabase
      .from("pillar_trajectory_log")
      .select("drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta, source_type, created_at")
      .eq("user_id", user.id)
      .gte("created_at", ninetyDaysAgo)
      .order("created_at", { ascending: false });

    // 4. Completed resources (avoid repeats)
    const { data: completedProgress } = await supabase
      .from("growth_hub_progress")
      .select("resource_title")
      .eq("user_id", user.id)
      .in("status", ["completed", "test_passed"]);

    const completedTitles = completedProgress?.map(p => p.resource_title) || [];

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

    const systemPrompt = `You are the XIMA Growth Advisor — a personal development coach powered by psychometric intelligence. You recommend specific, real, free learning resources across three formats: video courses, books, and podcasts.

USER PROFILE:
- XIMAtar: ${archetype} L${level} (${archetypeInfo?.title || archetype})
- Pillar scores: Drive ${scores.drive ?? 50}, CompPower ${scores.computational_power ?? 50}, Communication ${scores.communication ?? 50}, Creativity ${scores.creativity ?? 50}, Knowledge ${scores.knowledge ?? 50}
- Weakest pillar: ${weakestPillar} (score: ${weakestScore})
- Second weakest: ${secondWeakest} (score: ${secondScore})
- CV alignment score: ${cvAnalysis?.alignment_score ?? 'N/A'}/100
- Key tension gaps: ${tensionSummary}
- Recent trajectory: ${trajectorySummary}
- Already completed: ${completedTitles.length > 0 ? completedTitles.join(", ") : "None yet"}
- Preferred language: ${preferredLang}

GROWTH OBJECTIVE:
Strengthen the weakest pillar (${weakestPillar}) to support progression toward XIMAtar L${nextLevel}. Leveling requires sustained growth in the weakest pillar, 5 mentor interactions, and 5 L2 challenges.

RESOURCE TYPES TO RECOMMEND:

1. VIDEO COURSES (4-5 courses):
   Sources: Coursera (free audit), edX (free audit), YouTube (TED, HBR, Y Combinator, Google Talks, Stanford Online, MIT OCW, CrashCourse, Ali Abdaal, etc.), Khan Academy, Great Learning Academy, FreeCodeCamp, Google Digital Garage, HubSpot Academy, Alison, FutureLearn (free access period)
   Rules:
   - Must be completely free or have a free audit/access option
   - Include the real, specific course title
   - Include the platform and a URL (exact URL if known, search URL if not)
   - Include estimated completion hours
   - Mix of 3 courses for weakest pillar + 1-2 for second weakest

2. BOOKS (3-4 books):
   Recommend real, specific books. For each include exact title, author, a read_url (OpenLibrary, Google Books, Amazon, or free PDF if legally available), key takeaway relevant to the user's gap, estimated reading hours.
   For Italian users, also consider Italian-language books when they exist.

3. PODCASTS (3-4 podcasts or specific episodes):
   Recommend real, specific podcasts on Spotify, Apple Podcasts, or YouTube. For each include podcast name, specific episode if applicable, host, platform/URL, relevance, length.
   For Italian users, include Italian podcasts when available.

RESOURCE MIX:
- Total: 10-13 resources (4-5 courses + 3-4 books + 3-4 podcasts)
- 60% targeting weakest pillar
- 30% targeting second weakest pillar
- 10% bridging weakest with strongest

LANGUAGE RULES:
- If user prefers Italian: prioritize Italian-language resources, include English ones only when no Italian equivalent exists. Write all descriptions in Italian.
- If user prefers English: recommend English resources. Write all descriptions in English.
- Always indicate the resource language.

` + contextBlock + `

Return ONLY valid JSON:
{
  "growth_path": {
    "title": "Personalized path name",
    "objective": "1-2 sentence description",
    "target_pillar": "the weakest pillar",
    "estimated_total_hours": number,
    "resources": {
      "courses": [
        {
          "id": "course_1",
          "title": "Exact course name",
          "platform": "Coursera|edX|YouTube|Khan Academy|etc",
          "url": "https://...",
          "primary_pillar": "drive|computational_power|communication|creativity|knowledge",
          "secondary_pillar": "string or null",
          "difficulty": "beginner|intermediate|advanced",
          "estimated_hours": number,
          "why_for_you": "1-2 sentences",
          "language": "en|it",
          "free_access_note": "How to access for free"
        }
      ],
      "books": [
        {
          "id": "book_1",
          "title": "Exact book title",
          "author": "Author name",
          "read_url": "https://...",
          "primary_pillar": "drive|computational_power|communication|creativity|knowledge",
          "estimated_hours": number,
          "key_takeaway": "1-2 sentences",
          "why_for_you": "Why THIS book for THIS user",
          "language": "en|it",
          "availability": "Free PDF|OpenLibrary|Purchase required|Library"
        }
      ],
      "podcasts": [
        {
          "id": "podcast_1",
          "title": "Podcast name",
          "episode_title": "Specific episode or null",
          "host": "Host name(s)",
          "platform": "Spotify|Apple Podcasts|YouTube",
          "url": "https://...",
          "primary_pillar": "drive|computational_power|communication|creativity|knowledge",
          "episode_length_minutes": number,
          "why_for_you": "Why this for this user",
          "language": "en|it"
        }
      ]
    }
  },
  "growth_insight": "2-3 sentence motivational insight",
  "next_milestone": "What completing this path means for XIMAtar evolution"
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
