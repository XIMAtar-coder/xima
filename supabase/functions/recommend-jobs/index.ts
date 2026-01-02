import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
  sourceUrl: string;
  summary: string;
  idealXimatar?: string[];
}

const skillToPillar: Record<string, string> = {
  data: 'computational',
  analysis: 'computational',
  analytics: 'computational',
  python: 'computational',
  sql: 'computational',
  presentation: 'communication',
  communication: 'communication',
  storytelling: 'communication',
  research: 'knowledge',
  domain: 'knowledge',
  strategy: 'knowledge',
  design: 'creativity',
  creativity: 'creativity',
  innovation: 'creativity',
  initiative: 'drive',
  leadership: 'drive',
  ownership: 'drive',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // SECURITY: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[recommend-jobs] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth context to validate the JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('[recommend-jobs] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the authenticated user's ID instead of accepting from request body
    const userId = user.id;
    console.log(`[recommend-jobs] Generating recommendations for authenticated user: ${userId}`);

    // Use service role for database operations that need RLS bypass
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch user's latest assessment with pillar scores
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_results')
      .select(`
        id,
        ximatar_id,
        ximatars (label, id)
      `)
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessmentError || !assessmentData) {
      console.log('[recommend-jobs] No assessment found for user:', userId);
      return new Response(
        JSON.stringify({ 
          recommendations: [], 
          message: 'Complete your XIMA assessment to get personalized recommendations' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pillar scores for this assessment
    const { data: pillarData, error: pillarError } = await supabase
      .from('pillar_scores')
      .select('pillar, score')
      .eq('assessment_result_id', assessmentData.id);

    if (pillarError || !pillarData || pillarData.length === 0) {
      console.log('[recommend-jobs] No pillar scores found for user:', userId);
      return new Response(
        JSON.stringify({ 
          recommendations: [], 
          message: 'Complete your XIMA assessment to get personalized recommendations' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert pillar data to object
    const userPillars: Record<string, number> = {};
    pillarData.forEach(p => {
      const key = p.pillar === 'computational_power' ? 'computational' : p.pillar;
      userPillars[key] = p.score;
    });

    const userXimatar = (assessmentData.ximatars as any)?.label?.toLowerCase();

    console.log('[recommend-jobs] User pillars:', userPillars);
    console.log('[recommend-jobs] User ximatar:', userXimatar);

    // 2. Fetch opportunities from database
    const { data: opportunities, error: jobsError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('is_public', true);

    let jobs: Job[] = [];

    if (!jobsError && opportunities) {
      // Convert opportunities to Job format
      jobs = opportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        company: opp.company,
        location: opp.location || 'Remote',
        skills: opp.skills || [],
        sourceUrl: opp.source_url || '',
        summary: opp.description || '',
        idealXimatar: [] as string[], // Will be computed dynamically
      }));
    }

    // Fallback: Also fetch from jobs.json for additional opportunities
    try {
      const jobsUrl = `${supabaseUrl.replace('https://', 'https://iyckvvnecpnldrxqmzta.')}/jobs.json`;
      const jobsResponse = await fetch(jobsUrl);
      if (jobsResponse.ok) {
        const staticJobs = await jobsResponse.json();
        jobs = [...jobs, ...staticJobs];
      }
    } catch (e) {
      console.warn('[recommend-jobs] Could not fetch static jobs:', e);
    }

    // If still no jobs, use fallback
    if (jobs.length === 0) {
      jobs = [
        {
          id: '1',
          title: 'Data Analyst',
          company: 'Aurora Insights',
          location: 'Milan, IT',
          skills: ['data', 'analysis', 'sql', 'presentation'],
          sourceUrl: 'https://example.com/jobs/1',
          summary: 'Analyze datasets to deliver insights for business teams and stakeholders.',
          idealXimatar: ['owl', 'elephant'],
        },
        {
          id: '2',
          title: 'Product Marketing Manager',
          company: 'NovaTech',
          location: 'Remote',
          skills: ['communication', 'storytelling', 'strategy', 'ownership'],
          sourceUrl: 'https://example.com/jobs/2',
          summary: 'Own product positioning and go-to-market narratives across channels.',
          idealXimatar: ['parrot', 'fox'],
        },
        {
          id: '3',
          title: 'UX Designer',
          company: 'BlueWave Studio',
          location: 'Rome, IT',
          skills: ['design', 'creativity', 'research', 'communication'],
          sourceUrl: 'https://example.com/jobs/3',
          summary: 'Design intuitive experiences backed by research and rapid iteration.',
          idealXimatar: ['cat', 'dolphin'],
        },
      ];
    }

    console.log(`[recommend-jobs] Loaded ${jobs.length} jobs`);

    // 3. Calculate match scores with enhanced algorithm
    const recommendations = jobs.map((job) => {
      // Calculate pillar weights from skills
      const pillarWeights: Record<string, number> = {};
      for (const skill of job.skills) {
        const pillar = skillToPillar[skill.toLowerCase()];
        if (pillar) {
          pillarWeights[pillar] = (pillarWeights[pillar] || 0) + 1;
        }
      }

      // Dynamic XIMAtar inference based on skill pillars
      const inferredXimatar: string[] = [];
      const dominantPillars = Object.entries(pillarWeights)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([pillar]) => pillar);

      // Map pillar combinations to XIMAtar types
      if (dominantPillars.includes('creativity') && dominantPillars.includes('communication')) {
        inferredXimatar.push('parrot', 'fox');
      } else if (dominantPillars.includes('knowledge') && dominantPillars.includes('computational')) {
        inferredXimatar.push('owl', 'elephant');
      } else if (dominantPillars.includes('drive') && dominantPillars.includes('knowledge')) {
        inferredXimatar.push('elephant', 'horse');
      } else if (dominantPillars.includes('communication') && dominantPillars.includes('drive')) {
        inferredXimatar.push('dolphin', 'parrot');
      } else if (dominantPillars.includes('computational') && dominantPillars.includes('creativity')) {
        inferredXimatar.push('cat', 'bee');
      } else if (dominantPillars.includes('drive')) {
        inferredXimatar.push('horse', 'lion', 'wolf');
      } else if (dominantPillars.includes('creativity')) {
        inferredXimatar.push('fox', 'cat');
      } else if (dominantPillars.includes('computational')) {
        inferredXimatar.push('owl', 'bee');
      }

      // Use provided idealXimatar or inferred
      const targetXimatar = job.idealXimatar && job.idealXimatar.length > 0 
        ? job.idealXimatar 
        : inferredXimatar;

      const totalWeight = Object.values(pillarWeights).reduce((a, b) => a + b, 0) || 1;

      // Compute weighted pillar score with alignment penalty/bonus
      let pillarScore = 0;
      const pillarContributions: Array<{ pillar: string; weight: number; userScore: number; contribution: number }> = [];

      for (const [pillar, weight] of Object.entries(pillarWeights)) {
        const normalizedWeight = weight / totalWeight;
        const userScore = userPillars[pillar] || 5;
        const normalizedUserScore = userScore / 10; // 0-1 range
        
        // Apply alignment bonus: reward high scores in required pillars
        const alignmentBonus = normalizedUserScore > 0.7 ? 1.15 : 1.0;
        const contribution = normalizedUserScore * normalizedWeight * 100 * alignmentBonus;
        pillarScore += contribution;

        pillarContributions.push({
          pillar,
          weight: normalizedWeight * 100,
          userScore,
          contribution: Math.round(contribution),
        });
      }

      // XIMAtar match bonus
      const ximatarMatch = targetXimatar.includes(userXimatar || '');
      const ximatarBonus = ximatarMatch ? 20 : 0;

      // Skill coverage bonus (how many required skills align with user strengths)
      const skillCoverage = job.skills.length > 0 
        ? (job.skills.filter(skill => {
            const pillar = skillToPillar[skill.toLowerCase()];
            return pillar && userPillars[pillar] >= 7;
          }).length / job.skills.length) * 10
        : 0;

      // Final score
      const rawScore = pillarScore + ximatarBonus + skillCoverage;
      const matchScore = Math.min(100, Math.round(rawScore));

      return {
        job,
        matchScore,
        ximatarMatch,
        pillarContributions,
        skillCoverage: Math.round(skillCoverage),
        inferredXimatar: targetXimatar,
      };
    });

    // 4. Filter and sort
    const filtered = recommendations
      .filter((r) => r.matchScore >= 65)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    console.log(`[recommend-jobs] Returning ${filtered.length} recommendations`);

    // 5. Update user_job_links with recommended status
    const recommendedJobIds = filtered.map((r) => r.job.id);
    
    // First, delete old recommendations
    await supabase
      .from('user_job_links')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'recommended');

    // Insert new recommendations
    if (recommendedJobIds.length > 0) {
      const recommendedLinks = recommendedJobIds.map((jobId) => ({
        user_id: userId,
        job_id: jobId,
        status: 'recommended',
      }));

      await supabase
        .from('user_job_links')
        .insert(recommendedLinks);
    }

    return new Response(
      JSON.stringify({
        recommendations: filtered,
        total: filtered.length,
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[recommend-jobs] Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
