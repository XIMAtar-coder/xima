import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface PendingInterest {
  id: string;
  business_name: string;
  hiring_goal_title: string | null;
  interested_at: string;
  accepted: boolean;
}

export const useMutualInterest = () => {
  const { user } = useUser();
  const [pendingInterests, setPendingInterests] = useState<PendingInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingInterests = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_pending_interests');

      if (fetchError) {
        console.error('[useMutualInterest] Error fetching interests:', fetchError);
        setError('Failed to load interest signals');
        return;
      }

      setPendingInterests((data || []) as PendingInterest[]);
    } catch (err) {
      console.error('[useMutualInterest] Exception:', err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const acceptInterest = useCallback(async (interestId: string): Promise<{
    success: boolean;
    threadId?: string;
    error?: string;
  }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('accept_interest', {
        p_interest_id: interestId
      });

      if (error) {
        console.error('[useMutualInterest] Error accepting interest:', error);
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; chat_created?: boolean; thread_id?: string; error?: string };

      if (result.success) {
        // Update local state
        setPendingInterests(prev => 
          prev.map(interest => 
            interest.id === interestId 
              ? { ...interest, accepted: true }
              : interest
          )
        );
        return { success: true, threadId: result.thread_id };
      }

      return { success: false, error: result.error };
    } catch (err) {
      console.error('[useMutualInterest] Exception accepting:', err);
      return { success: false, error: 'An error occurred' };
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchPendingInterests();
  }, [fetchPendingInterests]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchPendingInterests();
  }, [fetchPendingInterests]);

  const pendingCount = pendingInterests.filter(i => !i.accepted).length;
  const acceptedCount = pendingInterests.filter(i => i.accepted).length;

  return {
    pendingInterests,
    pendingCount,
    acceptedCount,
    loading,
    error,
    acceptInterest,
    refresh
  };
};
