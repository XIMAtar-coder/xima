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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating recommendations for user: ${userId}`);

    // 1. Fetch user's latest assessment
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_results')
      .select(`
        pillars,
        ximatars (label)
      `)
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessmentError || !assessmentData?.pillars) {
      console.log('No assessment found for user:', userId);
      return new Response(
        JSON.stringify({ 
          recommendations: [], 
          message: 'Complete your XIMA assessment to get personalized recommendations' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPillars = assessmentData.pillars as Record<string, number>;
    const userXimatar = (assessmentData.ximatars as any)?.label?.toLowerCase();

    console.log('User pillars:', userPillars);
    console.log('User ximatar:', userXimatar);

    // 2. Fetch all jobs from jobs.json (static data source for now)
    const jobsUrl = `${supabaseUrl.replace('https://', 'https://iyckvvnecpnldrxqmzta.')}/jobs.json`;
    const jobsResponse = await fetch(jobsUrl);
    let jobs: Job[] = [];

    if (jobsResponse.ok) {
      jobs = await jobsResponse.json();
    } else {
      // Fallback to in-memory jobs if file doesn't exist
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

    console.log(`Loaded ${jobs.length} jobs`);

    // 3. Calculate match scores
    const recommendations = jobs.map((job) => {
      // Calculate pillar weights from skills
      const pillarWeights: Record<string, number> = {};
      for (const skill of job.skills) {
        const pillar = skillToPillar[skill.toLowerCase()];
        if (pillar) {
          pillarWeights[pillar] = (pillarWeights[pillar] || 0) + 1;
        }
      }

      const totalWeight = Object.values(pillarWeights).reduce((a, b) => a + b, 0) || 1;

      // Compute weighted pillar score
      let pillarScore = 0;
      const pillarContributions: Array<{ pillar: string; weight: number; userScore: number }> = [];

      for (const [pillar, weight] of Object.entries(pillarWeights)) {
        const normalizedWeight = weight / totalWeight;
        const userScore = userPillars[pillar] || 5;
        const normalizedUserScore = userScore / 10; // 0-1 range
        const contribution = normalizedUserScore * normalizedWeight * 100;
        pillarScore += contribution;

        pillarContributions.push({
          pillar,
          weight: normalizedWeight * 100,
          userScore,
        });
      }

      // Ximatar match bonus
      const ximatarMatch = job.idealXimatar?.includes(userXimatar || '') || false;
      const ximatarBonus = ximatarMatch ? 15 : 0;

      // Final score
      const matchScore = Math.min(100, Math.round(pillarScore + ximatarBonus));

      return {
        job,
        matchScore,
        ximatarMatch,
        pillarContributions,
      };
    });

    // 4. Filter and sort
    const filtered = recommendations
      .filter((r) => r.matchScore >= 65)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    console.log(`Returning ${filtered.length} recommendations`);

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
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
