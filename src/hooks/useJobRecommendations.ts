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
    if (!user?.id) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-jobs', {
        body: { userId: user.id },
      });

      // Handle auth errors gracefully - don't crash the app
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        const isAuthError = errorMessage.includes('401') || 
                           errorMessage.includes('unauthorized') ||
                           errorMessage.includes('auth') ||
                           errorMessage.includes('session');
        
        if (isAuthError) {
          console.warn('[useJobRecommendations] Auth error - clearing recommendations silently');
          setRecommendations([]);
          return;
        }
        
        // For non-auth errors, log but don't throw
        console.error('[useJobRecommendations] Error:', error);
        setRecommendations([]);
        return;
      }

      setRecommendations(data?.recommendations || []);
      setLastGenerated(data?.generatedAt || new Date().toISOString());
    } catch (error) {
      // Catch any unexpected errors and fail gracefully
      console.error('[useJobRecommendations] Unexpected error:', error);
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
