import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Find active users who logged in within last 7 days and don't have a recent insight
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, ximatar, ximatar_id, pillar_scores, preferred_lang")
      .not("pillar_scores", "is", null)
      .limit(50);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No eligible users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;

    for (const profile of profiles) {
      try {
        // Check if user already has a recent AI insight (within 7 days)
        const { data: recentInsight } = await supabase
          .from("feed_items")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("feed_type", "ai_insight")
          .gte("created_at", sevenDaysAgo)
          .limit(1);

        if (recentInsight && recentInsight.length > 0) {
          skipped++;
          continue;
        }

        const pillarScores = (profile.pillar_scores || {}) as Record<string, number>;
        const sortedPillars = Object.entries(pillarScores).sort(([, a], [, b]) => a - b);
        const weakest = sortedPillars[0];
        const strongest = sortedPillars[sortedPillars.length - 1];
        const archetype = profile.ximatar || "explorer";
        const lang = profile.preferred_lang || "en";

        // Get recent trajectory
        const { data: trajectory } = await supabase
          .from("pillar_trajectory_log")
          .select("source_type, drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(5);

        const trajectorySummary = trajectory && trajectory.length > 0
          ? `${trajectory.length} recent changes from ${[...new Set(trajectory.map((t: any) => t.source_type))].join(", ")}`
          : "No recent activity";

        // Call Claude Haiku for a short insight
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            messages: [{
              role: "user",
              content: `You are XIMA's growth advisor. Write ONE short personalized insight (2-3 sentences) for this user. Be encouraging, specific, and actionable. Write in ${lang === "it" ? "Italian" : lang === "es" ? "Spanish" : "English"}.

User archetype: ${archetype}
Strongest pillar: ${strongest?.[0] || "unknown"} (${strongest?.[1] || 0})
Weakest pillar: ${weakest?.[0] || "unknown"} (${weakest?.[1] || 0})
Recent activity: ${trajectorySummary}

Write a brief, inspiring insight about their growth journey. No markdown, no bullet points. Just 2-3 clean sentences.`,
            }],
          }),
        });

        if (!response.ok) {
          console.warn(`[generate-feed-insights] Claude call failed for ${profile.user_id}: ${response.status}`);
          continue;
        }

        const result = await response.json();
        const insightText = result?.content?.[0]?.text?.trim();

        if (!insightText) continue;

        await supabase.from("feed_items").insert({
          user_id: profile.user_id,
          feed_type: "ai_insight",
          title: lang === "it" ? "Insight Settimanale" : lang === "es" ? "Perspectiva Semanal" : "Weekly Insight",
          body: insightText,
          icon: "lightbulb",
          priority: 2,
          metadata: { archetype, weakest_pillar: weakest?.[0], generated_by: "claude-haiku" },
        });

        processed++;
      } catch (err) {
        console.warn(`[generate-feed-insights] Error for user ${profile.user_id}:`, err);
      }
    }

    return new Response(JSON.stringify({ processed, skipped, total: profiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-feed-insights] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
