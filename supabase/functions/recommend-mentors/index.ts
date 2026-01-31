import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// XIMAtar to dominant pillar mapping
const XIMATAR_PILLARS: Record<string, string[]> = {
  lion: ['drive', 'communication'],
  fox: ['creativity', 'communication'],
  dolphin: ['communication', 'knowledge'],
  cat: ['computational_power', 'creativity'],
  bear: ['knowledge', 'drive'],
  bee: ['drive', 'computational_power'],
  wolf: ['drive', 'knowledge'],
  owl: ['knowledge', 'computational_power'],
  parrot: ['communication', 'creativity'],
  elephant: ['knowledge', 'communication'],
  horse: ['drive', 'knowledge'],
  chameleon: ['creativity', 'communication'],
};

interface PillarScore {
  pillar: string;
  score: number;
}

interface Mentor {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  profile_image_url: string | null;
  specialties: string[];
  xima_pillars: string[];
  rating: number | null;
  experience_years: number | null;
  is_active: boolean;
  updated_at: string;
}

interface RecommendedMentor extends Mentor {
  compatibility_score: number;
  match_reasons: string[];
}

function calculateMentorScore(
  mentor: Mentor,
  userPillars: PillarScore[],
  userXimatar: string | null
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  
  // Sort user pillars by score
  const sortedPillars = [...userPillars].sort((a, b) => b.score - a.score);
  const userTopPillars = sortedPillars.slice(0, 2).map(p => p.pillar);
  const userWeakestPillar = sortedPillars[sortedPillars.length - 1]?.pillar;
  
  // Normalize pillar names
  const normalizePillar = (p: string) => 
    p === 'computational' ? 'computational_power' : p;
  
  const mentorPillars = mentor.xima_pillars.map(normalizePillar);
  
  // 1. Pillar Alignment Score (40% weight)
  const matchingTopPillars = mentorPillars.filter(p => 
    userTopPillars.includes(p)
  );
  const alignmentScore = mentorPillars.length > 0 
    ? (matchingTopPillars.length / Math.min(mentorPillars.length, 2)) * 100
    : 50;
  
  if (matchingTopPillars.length > 0) {
    reasons.push(`Matches your strength in ${matchingTopPillars[0].replace('_', ' ')}`);
  }
  
  // 2. Growth Potential Score (30% weight)
  const canHelpWithWeakness = userWeakestPillar && mentorPillars.includes(userWeakestPillar);
  const growthScore = canHelpWithWeakness ? 100 : 40;
  
  if (canHelpWithWeakness) {
    reasons.push(`Can help develop your ${userWeakestPillar.replace('_', ' ')}`);
  }
  
  // 3. XIMAtar Compatibility (20% weight)
  let ximatarScore = 50;
  if (userXimatar && XIMATAR_PILLARS[userXimatar.toLowerCase()]) {
    const ximatarPillars = XIMATAR_PILLARS[userXimatar.toLowerCase()];
    const ximatarMatches = mentorPillars.filter(p => ximatarPillars.includes(p));
    ximatarScore = (ximatarMatches.length / ximatarPillars.length) * 100;
    
    if (ximatarMatches.length > 0) {
      reasons.push(`Complements your ${userXimatar} profile`);
    }
  }
  
  // 4. Mentor Rating Bonus (10% weight)
  const ratingScore = mentor.rating ? (mentor.rating / 5) * 100 : 70;
  
  // Weighted total
  const totalScore = 
    alignmentScore * 0.4 +
    growthScore * 0.3 +
    ximatarScore * 0.2 +
    ratingScore * 0.1;
  
  return { score: Math.round(totalScore), reasons };
}

Deno.serve(async (req) => {
  console.log('[recommend-mentors] Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check for authentication - but allow unauthenticated requests (guest users after assessment)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      // Create client with user's auth context to validate the JWT
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      
      if (!authError && user) {
        userId = user.id;
        console.log(`[recommend-mentors] Authenticated user: ${userId}`);
      } else {
        console.log('[recommend-mentors] Auth header present but invalid, continuing as guest');
      }
    } else {
      console.log('[recommend-mentors] No auth header, processing as guest request');
    }

    // Use service role for database operations (to bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for user data
    const { pillar_scores, ximatar, refresh_seed } = await req.json().catch(() => ({}));
    
    console.log('[recommend-mentors] Input:', { pillar_scores, ximatar, refresh_seed, isAuthenticated: !!userId });

    // Simple seeded shuffle function for deterministic randomization
    const seededShuffle = <T,>(arr: T[], seed: string): T[] => {
      const result = [...arr];
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      // Fisher-Yates shuffle with seeded random
      for (let i = result.length - 1; i > 0; i--) {
        hash = Math.abs((hash * 1103515245 + 12345) & 0x7fffffff);
        const j = hash % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    // Fetch all active mentors using the public view (safe for all users)
    // Using service role still works with the view
    const { data: mentors, error: mentorsError } = await supabase
      .from('mentors')
      .select('id, name, title, bio, profile_image_url, specialties, xima_pillars, rating, experience_years, is_active, updated_at')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (mentorsError) {
      console.error('[recommend-mentors] Error fetching mentors:', mentorsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch mentors', details: mentorsError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mentors || mentors.length === 0) {
      console.log('[recommend-mentors] No active mentors found');
      return new Response(
        JSON.stringify({ recommendations: [], message: 'No active mentors available' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[recommend-mentors] Found ${mentors.length} active mentors`);

    // If no pillar scores provided, return mentors sorted by rating with base compatibility
    if (!pillar_scores || pillar_scores.length === 0) {
      console.log('[recommend-mentors] No pillar scores provided, returning mentors by rating');
      const defaultRecommendations: RecommendedMentor[] = mentors.map((m: Mentor) => ({
        ...m,
        compatibility_score: m.rating ? Math.round(m.rating * 20) : 85,
        match_reasons: ['Top-rated mentor']
      }));
      
      return new Response(
        JSON.stringify({ recommendations: defaultRecommendations }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate compatibility scores for each mentor
    const recommendations: RecommendedMentor[] = mentors.map((mentor: Mentor) => {
      const { score, reasons } = calculateMentorScore(mentor, pillar_scores, ximatar);
      return {
        ...mentor,
        compatibility_score: score,
        match_reasons: reasons.length > 0 ? reasons : ['Recommended mentor']
      };
    });

    // Sort by compatibility score
    recommendations.sort((a, b) => b.compatibility_score - a.compatibility_score);

    // Apply seeded shuffle if refresh_seed is provided (for "Refresh mentors" feature)
    let finalRecommendations = recommendations;
    if (refresh_seed && typeof refresh_seed === 'string') {
      console.log('[recommend-mentors] Applying seeded shuffle with seed:', refresh_seed);
      // Group by score buckets to maintain some relevance while shuffling
      const scoreBuckets = new Map<number, RecommendedMentor[]>();
      for (const r of recommendations) {
        const bucket = Math.floor(r.compatibility_score / 10) * 10; // 10-point buckets
        if (!scoreBuckets.has(bucket)) scoreBuckets.set(bucket, []);
        scoreBuckets.get(bucket)!.push(r);
      }
      // Shuffle within each bucket
      finalRecommendations = [];
      const sortedBuckets = [...scoreBuckets.keys()].sort((a, b) => b - a);
      for (const bucket of sortedBuckets) {
        const shuffled = seededShuffle(scoreBuckets.get(bucket)!, refresh_seed);
        finalRecommendations.push(...shuffled);
      }
    }

    console.log('[recommend-mentors] Recommendations calculated:', 
      finalRecommendations.map(r => ({ name: r.name, score: r.compatibility_score }))
    );

    return new Response(
      JSON.stringify({ recommendations: finalRecommendations }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[recommend-mentors] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
