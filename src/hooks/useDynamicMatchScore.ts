import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { Job } from '@/services/jobFeed';

export interface DynamicMatchBreakdown {
  score: number;
  pillarContributions: Array<{
    pillar: string;
    userScore: number;
    weight: number;
    contribution: number;
  }>;
  ximatarMatch: boolean;
  ximatarBonus: number;
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

export const useDynamicMatchScore = (job: Job | null) => {
  const { user } = useUser();
  const [match, setMatch] = useState<DynamicMatchBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const computeMatch = async () => {
      if (!job || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's latest assessment results
        const { data: assessmentData } = await supabase
          .from('assessment_results')
          .select(`
            pillars,
            ximatars (label)
          `)
          .eq('user_id', user.id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!assessmentData?.pillars) {
          setMatch(null);
          setLoading(false);
          return;
        }

        const userPillars = assessmentData.pillars as Record<string, number>;
        const userXimatar = (assessmentData.ximatars as any)?.label?.toLowerCase();

        // Calculate pillar requirements from job skills
        const pillarWeights: Record<string, number> = {};
        for (const skill of job.skills) {
          const pillar = skillToPillar[skill.toLowerCase()];
          if (pillar) {
            pillarWeights[pillar] = (pillarWeights[pillar] || 0) + 1;
          }
        }

        const totalWeight = Object.values(pillarWeights).reduce((a, b) => a + b, 0) || 1;

        // Normalize weights and compute weighted score
        const pillarContributions = Object.entries(pillarWeights).map(([pillar, weight]) => {
          const normalizedWeight = weight / totalWeight;
          const userScore = userPillars[pillar] || 5;
          const normalizedUserScore = userScore / 10; // 0-1 range
          const contribution = normalizedUserScore * normalizedWeight;

          return {
            pillar,
            userScore,
            weight: normalizedWeight * 100,
            contribution: contribution * 100,
          };
        });

        const pillarScore = pillarContributions.reduce((sum, p) => sum + p.contribution, 0);

        // Check ximatar match
        const ximatarMatch = job.idealXimatar?.includes(userXimatar || '') || false;
        const ximatarBonus = ximatarMatch ? 15 : 0;

        // Final score (pillar score 0-100 + ximatar bonus 0-15)
        const finalScore = Math.min(100, Math.round(pillarScore + ximatarBonus));

        setMatch({
          score: finalScore,
          pillarContributions,
          ximatarMatch,
          ximatarBonus,
        });
      } catch (error) {
        console.error('Error computing dynamic match:', error);
        setMatch(null);
      } finally {
        setLoading(false);
      }
    };

    computeMatch();
  }, [job, user?.id]);

  return { match, loading };
};
