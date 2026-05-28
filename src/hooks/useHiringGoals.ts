import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HiringGoal {
  id: string;
  business_id: string;
  role_title: string | null;
  function_area: string | null;
  task_description: string | null;
  experience_level: string | null;
  work_model: string | null;
  country: string | null;
  city_region: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  status: string | null;
  candidate_count: number | null;
  challenge_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Resolve the business_profiles.id for the currently authenticated user.
 * hiring_goal_drafts.business_id references business_profiles.id (NOT auth.uid()).
 * RLS policy: is_business_owner(business_id) checks business_profiles.id = _id AND user_id = auth.uid().
 */
async function getCurrentBusinessProfileId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('[useHiringGoals] business_profiles lookup failed:', error);
    return null;
  }
  return data?.id ?? null;
}

export const useHiringGoals = () => {
  const [goals, setGoals] = useState<HiringGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const businessProfileId = await getCurrentBusinessProfileId();
      if (!businessProfileId) {
        setError('Business profile not found');
        setGoals([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('hiring_goal_drafts')
        .select('*')
        .eq('business_id', businessProfileId)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching hiring goals:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Enrich with counts
      const enrichedGoals = await Promise.all((data || []).map(async (goal) => {
        const { count: candidateCount } = await supabase
          .from('business_shortlists')
          .select('*', { count: 'exact', head: true })
          .eq('hiring_goal_id', goal.id);

        const { count: challengeCount } = await supabase
          .from('business_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('hiring_goal_id', goal.id);

        return {
          ...goal,
          candidate_count: candidateCount || 0,
          challenge_count: challengeCount || 0
        };
      }));

      setGoals(enrichedGoals);
      setError(null);
    } catch (err) {
      console.error('Error in useHiringGoals:', err);
      setError('Failed to load hiring goals');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGoalStatus = useCallback(async (goalId: string, status: string) => {
    const { error } = await supabase
      .from('hiring_goal_drafts')
      .update({ status })
      .eq('id', goalId);

    if (error) {
      console.error('Error updating goal status:', error);
      throw error;
    }

    await fetchGoals();
  }, [fetchGoals]);

  const createGoal = useCallback(async () => {
    const businessProfileId = await getCurrentBusinessProfileId();
    if (!businessProfileId) throw new Error('Business profile not found');

    const { data, error } = await supabase
      .from('hiring_goal_drafts')
      .insert({
        business_id: businessProfileId,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    await fetchGoals();
    return data;
  }, [fetchGoals]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals,
    updateGoalStatus,
    createGoal
  };
};
