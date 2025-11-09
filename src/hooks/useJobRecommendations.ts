import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { Job } from '@/services/jobFeed';

export interface JobRecommendation {
  job: Job;
  matchScore: number;
  ximatarMatch: boolean;
  pillarContributions: Array<{
    pillar: string;
    weight: number;
    userScore: number;
  }>;
}

export const useJobRecommendations = () => {
  const { user } = useUser();
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const generateRecommendations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-jobs', {
        body: { userId: user.id },
      });

      if (error) throw error;

      setRecommendations(data.recommendations || []);
      setLastGenerated(data.generatedAt || new Date().toISOString());
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate recommendations on mount if user is authenticated
    if (user?.id) {
      generateRecommendations();
    }
  }, [user?.id]);

  return {
    recommendations,
    loading,
    lastGenerated,
    refresh: generateRecommendations,
  };
};
