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

      // Handle auth/function errors gracefully
      if (functionError) {
        const errorMsg = functionError.message?.toLowerCase() || '';
        const isAuthError = errorMsg.includes('401') || 
                           errorMsg.includes('unauthorized') ||
                           errorMsg.includes('non-2xx') ||
                           errorMsg.includes('auth') ||
                           errorMsg.includes('session');
        
        if (isAuthError) {
          console.warn('[useJobRecommendationEngine] Auth error - clearing recommendations silently');
          setRecommendations([]);
          setError(null);
          return;
        }
        throw functionError;
      }

      const response = data as RecommendationResponse;
      
      if (response?.message && (!response.recommendations || response.recommendations.length === 0)) {
        setError(response.message);
      } else {
        setRecommendations(response?.recommendations || []);
        setLastGenerated(response?.generatedAt || new Date().toISOString());
      }
    } catch (err: any) {
      console.warn('[useJobRecommendationEngine] Error:', err);
      // Always fail gracefully - no blank screens
      setRecommendations([]);
      setError(null);
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
