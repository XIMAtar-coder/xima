import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface JobRecommendation {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    skills: string[];
    sourceUrl: string;
    summary: string;
  };
  matchScore: number;
  ximatarMatch: boolean;
  pillarContributions: Array<{
    pillar: string;
    weight: number;
    userScore: number;
    contribution: number;
  }>;
  skillCoverage: number;
  inferredXimatar: string[];
}

export interface RecommendationResponse {
  recommendations: JobRecommendation[];
  total: number;
  generatedAt: string;
  message?: string;
}

export const useJobRecommendationEngine = () => {
  const { user } = useUser();
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const generateRecommendations = async (forceRefresh = false) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    // Don't regenerate if we have recent recommendations (< 5 minutes old)
    if (!forceRefresh && lastGenerated) {
      const lastGeneratedTime = new Date(lastGenerated).getTime();
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - lastGeneratedTime < fiveMinutes) {
        return; // Use cached recommendations
      }
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('recommend-jobs', {
        body: { userId: user.id }
      });

      if (functionError) throw functionError;

      const response = data as RecommendationResponse;
      
      if (response.message && response.recommendations.length === 0) {
        setError(response.message);
      } else {
        setRecommendations(response.recommendations);
        setLastGenerated(response.generatedAt);
      }
    } catch (err: any) {
      console.error('Error generating recommendations:', err);
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      generateRecommendations();
    }
  }, [user?.id]);

  return {
    recommendations,
    loading,
    error,
    generateRecommendations,
    lastGenerated
  };
};
