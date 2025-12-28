import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HiringGoalRequirements {
  id: string;
  business_id: string;
  hiring_goal_id: string;
  education_required: boolean;
  min_education_level: string | null;
  education_field: string | null;
  certificates_required: boolean;
  required_certificates: string[];
  language_required: boolean;
  language: string | null;
  language_level: string | null;
  allow_override: boolean;
  override_reason_required: boolean;
  created_at: string;
  updated_at: string;
}

export const useHiringGoalRequirements = (hiringGoalId: string | undefined) => {
  const [requirements, setRequirements] = useState<HiringGoalRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = useCallback(async () => {
    if (!hiringGoalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('hiring_goal_requirements')
        .select('*')
        .eq('hiring_goal_id', hiringGoalId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching requirements:', fetchError);
        setError(fetchError.message);
        return;
      }

      setRequirements(data as HiringGoalRequirements | null);
      setError(null);
    } catch (err) {
      console.error('Error in useHiringGoalRequirements:', err);
      setError('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }, [hiringGoalId]);

  const saveRequirements = useCallback(async (data: Partial<HiringGoalRequirements>) => {
    if (!hiringGoalId) throw new Error('No hiring goal ID');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const payload = {
      business_id: user.id,
      hiring_goal_id: hiringGoalId,
      ...data
    };

    if (requirements?.id) {
      // Update
      const { error } = await supabase
        .from('hiring_goal_requirements')
        .update(payload)
        .eq('id', requirements.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('hiring_goal_requirements')
        .insert(payload);

      if (error) throw error;
    }

    await fetchRequirements();
  }, [hiringGoalId, requirements, fetchRequirements]);

  const hasRequirements = useCallback(() => {
    if (!requirements) return false;
    return requirements.education_required || 
           requirements.certificates_required || 
           requirements.language_required;
  }, [requirements]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  return {
    requirements,
    loading,
    error,
    saveRequirements,
    hasRequirements,
    refetch: fetchRequirements
  };
};
