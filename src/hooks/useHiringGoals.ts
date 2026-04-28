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

export const useHiringGoals = () => {
  const [goals, setGoals] = useState<HiringGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const { data: ownGoals, error: ownGoalsError } = await supabase
        .from('hiring_goal_drafts')
        .select('*')
        .eq('business_id', user.id)
        .order('updated_at', { ascending: false });

      const { data: sharedGoals, error: sharedGoalsError } = await supabase
        .from('hiring_goal_drafts')
        .select('*')
        .neq('business_id', user.id)
        .order('updated_at', { ascending: false });

      const data = [...(ownGoals || []), ...(sharedGoals || [])];
      const fetchError = ownGoalsError || sharedGoalsError;

      if (fetchError) {
        console.error('Error fetching hiring goals:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Enrich with counts
      const enrichedGoals = await Promise.all((data || []).map(async (goal) => {
        // Get candidate count from shortlists
        const { count: candidateCount } = await supabase
          .from('business_shortlists')
          .select('*', { count: 'exact', head: true })
          .eq('hiring_goal_id', goal.id);

        // Get challenge count
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

    // Refresh goals
    await fetchGoals();
  }, [fetchGoals]);

  const createGoal = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('hiring_goal_drafts')
      .insert({
        business_id: user.id,
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
