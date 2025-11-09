import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export type JobInteractionStatus = 'saved' | 'applied' | 'viewed';

export interface JobInteraction {
  id: string;
  user_id: string;
  job_id: string;
  status: JobInteractionStatus;
  applied_at?: string;
  created_at: string;
  updated_at: string;
}

export const useJobInteractions = (jobId?: string) => {
  const { user } = useUser();
  const [interactions, setInteractions] = useState<JobInteraction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInteractions = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('user_job_links')
        .select('*')
        .eq('user_id', user.id);
      
      if (jobId) {
        query = query.eq('job_id', jobId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setInteractions((data as JobInteraction[]) || []);
    } catch (error) {
      console.error('Error fetching job interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, [user?.id, jobId]);

  const trackInteraction = async (
    targetJobId: string,
    status: JobInteractionStatus
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const data: any = {
        user_id: user.id,
        job_id: targetJobId,
        status,
      };

      if (status === 'applied') {
        data.applied_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_job_links')
        .upsert(data, { 
          onConflict: 'user_id,job_id,status',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      
      await fetchInteractions();
      return true;
    } catch (error) {
      console.error('Error tracking interaction:', error);
      return false;
    }
  };

  const hasStatus = (targetJobId: string, status: JobInteractionStatus) => {
    return interactions.some(
      (i) => i.job_id === targetJobId && i.status === status
    );
  };

  return {
    interactions,
    loading,
    trackInteraction,
    hasStatus,
    refresh: fetchInteractions,
  };
};
