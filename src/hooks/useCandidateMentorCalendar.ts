import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MentorAvailabilitySlot {
  id: string;
  mentor_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  status: 'open' | 'blocked';
}

export interface CandidateSession {
  id: string;
  mentor_id: string;
  candidate_profile_id: string;
  starts_at: string;
  ends_at: string;
  status: 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'rescheduled';
  title: string | null;
  notes_shared: string | null;
  created_at: string;
}

export function useCandidateMentorCalendar(selectedMentorId: string | null) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<MentorAvailabilitySlot[]>([]);
  const [sessions, setSessions] = useState<CandidateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
      }

      // Fetch candidate's sessions
      const { data: sessionsData } = await supabase
        .from('mentor_sessions')
        .select('id, mentor_id, candidate_profile_id, starts_at, ends_at, status, title, notes_shared, created_at')
        .order('starts_at', { ascending: true });

      setSessions((sessionsData || []).map((s: any) => ({
        ...s,
        status: s.status as CandidateSession['status']
      })));

      // Fetch mentor's open availability slots if mentor selected
      if (selectedMentorId) {
        const { data: slotsData } = await supabase
          .from('mentor_availability_slots')
          .select('id, mentor_id, start_time, end_time, timezone, status')
          .eq('mentor_id', selectedMentorId)
          .eq('status', 'open')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        setSlots((slotsData || []).map((s: any) => ({
          ...s,
          status: s.status as 'open' | 'blocked'
        })));
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error('[useCandidateMentorCalendar] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMentorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedMentorId && !profileId) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to mentor's slots if mentor is selected
    if (selectedMentorId) {
      const slotsChannel = supabase
        .channel(`candidate_mentor_slots_${selectedMentorId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mentor_availability_slots',
            filter: `mentor_id=eq.${selectedMentorId}`
          },
          () => fetchData()
        )
        .subscribe();
      channels.push(slotsChannel);
    }

    // Subscribe to own sessions
    if (profileId) {
      const sessionsChannel = supabase
        .channel(`candidate_sessions_${profileId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mentor_sessions',
            filter: `candidate_profile_id=eq.${profileId}`
          },
          () => fetchData()
        )
        .subscribe();
      channels.push(sessionsChannel);
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [selectedMentorId, profileId, fetchData]);

  // Request a session via RPC
  const requestSession = async (slotId: string) => {
    try {
      const { data, error } = await supabase.rpc('request_mentor_session', {
        p_slot_id: slotId
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string; session_id?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to book session');

      toast({
        title: 'Session requested!',
        description: 'Your mentor will confirm shortly.'
      });
      await fetchData();
      return { success: true, session_id: result.session_id };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Cancel own session via RPC
  const cancelSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('candidate_cancel_session', {
        p_session_id: sessionId
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to cancel');

      toast({ title: 'Session cancelled' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  return {
    slots,
    sessions,
    loading,
    profileId,
    refetch: fetchData,
    requestSession,
    cancelSession,
  };
}
