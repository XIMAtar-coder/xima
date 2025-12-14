import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface Invitation {
  id: string;
  business_id: string;
  hiring_goal_id: string;
  status: string;
  invite_token: string;
  created_at: string;
  company_name: string;
  role_title: string | null;
}

export const useChallengeInvitations = () => {
  const { user, isAuthenticated } = useUser();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchInvitations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_candidate_invitations', {
        p_user_id: user.id
      });

      if (error) throw error;

      const invitationList = (data || []) as Invitation[];
      setInvitations(invitationList);
      setPendingCount(invitationList.filter(i => i.status === 'invited').length);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const acceptInvitation = async (invitationId: string) => {
    try {
      // Get profile_id for current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('challenge_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('candidate_profile_id', profile.id);

      if (error) throw error;

      // Update local state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId
            ? { ...inv, status: 'accepted' }
            : inv
        )
      );
      setPendingCount(prev => Math.max(0, prev - 1));

      return { success: true };
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      return { success: false, error: err.message };
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      // Get profile_id for current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('challenge_invitations')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('candidate_profile_id', profile.id);

      if (error) throw error;

      // Update local state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId
            ? { ...inv, status: 'declined' }
            : inv
        )
      );
      setPendingCount(prev => Math.max(0, prev - 1));

      return { success: true };
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    invitations,
    loading,
    pendingCount,
    acceptInvitation,
    declineInvitation,
    refresh: fetchInvitations
  };
};
