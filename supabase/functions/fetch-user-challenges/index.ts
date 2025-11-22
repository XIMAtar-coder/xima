import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with pillar scores
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ximatar, pillar_scores, strongest_pillar, weakest_pillar")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public challenges
    const { data: challenges, error: challengesError } = await supabase
      .from("business_challenges")
      .select(`
        id,
        title,
        description,
        difficulty,
        target_skills,
        deadline,
        business_id,
        business_profiles!inner(company_name)
      `)
      .eq("is_public", true)
      .gte("deadline", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (challengesError) {
      return new Response(
        JSON.stringify({ error: challengesError.message }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate match scores for each challenge
    const pillarScores = profile.pillar_scores as Record<string, number> || {};
    const pillarMap: Record<string, string> = {
      'computational_power': 'comp_power',
      'communication': 'communication',
      'knowledge': 'knowledge',
      'creativity': 'creativity',
      'drive': 'drive'
    };

    const challengesWithScores = challenges?.map(challenge => {
      let matchScore = 0;
      const targetSkills = challenge.target_skills || [];
      
      // Calculate match based on target skills alignment with user pillars
      if (targetSkills.length > 0) {
        targetSkills.forEach((skill: string) => {
          const lowerSkill = skill.toLowerCase();
          // Match skills to pillars
          Object.entries(pillarMap).forEach(([key, pillarKey]) => {
            if (lowerSkill.includes(key.replace('_', ' ')) || lowerSkill.includes(pillarKey)) {
              matchScore += (pillarScores[key] || 0) * 10;
            }
          });
        });
        matchScore = Math.min(100, matchScore / targetSkills.length);
      } else {
        // If no specific skills, use average pillar score
        const avgScore = Object.values(pillarScores).reduce((a: number, b: number) => a + b, 0) / Object.values(pillarScores).length;
        matchScore = avgScore * 10;
      }

      // Adjust for difficulty (harder challenges get slight boost for high performers)
      const avgPillarScore = Object.values(pillarScores).reduce((a: number, b: number) => a + b, 0) / Object.values(pillarScores).length;
      if (avgPillarScore > 7 && challenge.difficulty && challenge.difficulty > 3) {
        matchScore += 10;
      }

      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty || 3,
        reward: `${challenge.difficulty || 3} XP`,
        companyName: challenge.business_profiles?.company_name || 'Company',
        deadline: challenge.deadline,
        matchScore: Math.round(matchScore)
      };
    }) || [];

    // Filter challenges with match score >= 50 and sort by match score
    const matchedChallenges = challengesWithScores
      .filter(c => c.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Return top 5

    return new Response(
      JSON.stringify({ success: true, challenges: matchedChallenges }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error in fetch-user-challenges:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
