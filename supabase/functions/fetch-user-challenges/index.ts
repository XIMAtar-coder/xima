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
      console.log('Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, challenges: [], message: "Authentication required" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.log('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ success: false, challenges: [], message: "Authentication failed" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching profile for user:', user.id);

    // Get user profile with pillar scores (aligned with v2 column names)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ximatar_id, ximatar, ximatar_name, ximatar_level, pillar_scores")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.log('Profile not found or incomplete:', profileError);
      // Return empty challenges if profile is not complete
      return new Response(
        JSON.stringify({ success: true, challenges: [], message: "Complete your assessment to see personalized challenges" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching challenges...');

    // Get public challenges with left join to handle missing business profiles
    const { data: challenges, error: challengesError } = await supabase
      .from("business_challenges")
      .select(`
        id,
        title,
        description,
        difficulty,
        target_skills,
        deadline,
        business_id
      `)
      .eq("is_public", true)
      .gte("deadline", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
      return new Response(
        JSON.stringify({ success: true, challenges: [], message: "No challenges available" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no challenges exist, return empty array
    if (!challenges || challenges.length === 0) {
      console.log('No challenges found');
      return new Response(
        JSON.stringify({ success: true, challenges: [], message: "No challenges available this week" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business profiles separately
    const businessIds = [...new Set(challenges.map(c => c.business_id))];
    const { data: businessProfiles } = await supabase
      .from("business_profiles")
      .select("user_id, company_name")
      .in("user_id", businessIds);

    const businessProfileMap = new Map(
      businessProfiles?.map(bp => [bp.user_id, bp.company_name]) || []
    );

    console.log(`Processing ${challenges.length} challenges`);

    // Calculate match scores for each challenge
    const pillarScores = profile.assessment_scores as Record<string, number> || {};
    
    // If no pillar scores, return all challenges with default scores
    if (!pillarScores || Object.keys(pillarScores).length === 0) {
      console.log('No pillar scores, returning challenges with default match');
      const defaultChallenges = challenges.slice(0, 5).map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description || 'Join this challenge to showcase your skills!',
        difficulty: challenge.difficulty || 3,
        reward: `${(challenge.difficulty || 3) * 10} XP`,
        companyName: businessProfileMap.get(challenge.business_id) || 'Company',
        deadline: challenge.deadline,
        matchScore: 70
      }));

      return new Response(
        JSON.stringify({ success: true, challenges: defaultChallenges }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pillarMap: Record<string, string> = {
      'computational_power': 'comp_power',
      'communication': 'communication',
      'knowledge': 'knowledge',
      'creativity': 'creativity',
      'drive': 'drive'
    };

    const challengesWithScores = challenges.map(challenge => {
      let matchScore = 0;
      const targetSkills = challenge.target_skills || [];
      
      // Calculate match based on target skills alignment with user pillars
      if (targetSkills.length > 0) {
        let skillMatches = 0;
        targetSkills.forEach((skill: string) => {
          const lowerSkill = skill.toLowerCase();
          Object.entries(pillarMap).forEach(([key, pillarKey]) => {
            if (lowerSkill.includes(key.replace('_', ' ')) || lowerSkill.includes(pillarKey)) {
              matchScore += (pillarScores[key] || 0) * 10;
              skillMatches++;
            }
          });
        });
        if (skillMatches > 0) {
          matchScore = Math.min(100, matchScore / skillMatches);
        } else {
          // No skills matched, use average
          const scores = Object.values(pillarScores).filter(s => typeof s === 'number');
          const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 5;
          matchScore = avgScore * 10;
        }
      } else {
        // If no specific skills, use average pillar score
        const scores = Object.values(pillarScores).filter(s => typeof s === 'number');
        const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 5;
        matchScore = avgScore * 10;
      }

      // Adjust for difficulty
      const scores = Object.values(pillarScores).filter(s => typeof s === 'number');
      const avgPillarScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 5;
      if (avgPillarScore > 7 && challenge.difficulty && challenge.difficulty > 3) {
        matchScore += 10;
      }

      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description || 'Join this challenge to showcase your skills!',
        difficulty: challenge.difficulty || 3,
        reward: `${(challenge.difficulty || 3) * 10} XP`,
        companyName: businessProfileMap.get(challenge.business_id) || 'Company',
        deadline: challenge.deadline,
        matchScore: Math.round(Math.max(0, Math.min(100, matchScore)))
      };
    });

    // Filter challenges with match score >= 50 and sort by match score
    const matchedChallenges = challengesWithScores
      .filter(c => c.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    console.log(`Returning ${matchedChallenges.length} matched challenges`);

    return new Response(
      JSON.stringify({
        success: true,
        challenges: matchedChallenges,
        user_context: {
          ximatar: profile.ximatar_archetype,
          level: profile.ximatar_level || 1,
        },
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error in fetch-user-challenges:', err);
    // Always return 200 with empty challenges on error to prevent frontend issues
    return new Response(
      JSON.stringify({ success: true, challenges: [], message: 'Unable to load challenges at this time' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
