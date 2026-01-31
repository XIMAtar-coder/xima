import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AvailabilitySlot {
  id: string;
  mentor_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  is_recurring: boolean;
  rrule: string | null;
  status: 'open' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface MentorSession {
  id: string;
  mentor_id: string;
  candidate_profile_id: string;
  availability_slot_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'rescheduled';
  title: string | null;
  notes_private: string | null;
  notes_shared: string | null;
  created_by: 'candidate' | 'mentor' | 'system';
  created_at: string;
  updated_at: string;
  candidate_name?: string;
}

export interface SessionAuditLog {
  id: string;
  session_id: string;
  actor_user_id: string | null;
  actor_role: 'mentor' | 'candidate' | 'system' | 'admin';
  action: string;
  meta: Record<string, any>;
  created_at: string;
}

export function useMentorCalendar(mentorId: string | null) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mentorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch availability slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('mentor_availability_slots')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('start_time', { ascending: true });

      if (slotsError) throw slotsError;

      // Fetch sessions with candidate names
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('mentor_sessions')
        .select(`
          *,
          profiles!mentor_sessions_candidate_profile_id_fkey (
            full_name,
            name
          )
        `)
        .eq('mentor_id', mentorId)
        .order('starts_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Type cast the data
      setSlots((slotsData || []).map((s: any) => ({
        ...s,
        status: s.status as 'open' | 'blocked'
      })));
      setSessions((sessionsData || []).map((s: any) => ({
        ...s,
        status: s.status as MentorSession['status'],
        created_by: s.created_by as MentorSession['created_by'],
        candidate_name: s.profiles?.full_name || s.profiles?.name || 'Anonymous'
      })));
    } catch (err: any) {
      console.error('[useMentorCalendar] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for slots
  useEffect(() => {
    if (!mentorId) return;

    const slotsChannel = supabase
      .channel(`mentor_slots_${mentorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_availability_slots',
          filter: `mentor_id=eq.${mentorId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel(`mentor_sessions_${mentorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_sessions',
          filter: `mentor_id=eq.${mentorId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [mentorId, fetchData]);

  // Create availability slot
  const createSlot = async (data: {
    start_time: string;
    end_time: string;
    timezone: string;
    is_recurring?: boolean;
    rrule?: string;
  }) => {
    if (!mentorId) return { success: false, error: 'No mentor ID' };

    try {
      const { error } = await supabase
        .from('mentor_availability_slots')
        .insert({
          mentor_id: mentorId,
          start_time: data.start_time,
          end_time: data.end_time,
          timezone: data.timezone,
          is_recurring: data.is_recurring || false,
          rrule: data.rrule || null,
          status: 'open'
        });

      if (error) throw error;

      toast({ title: 'Slot created', description: 'Availability slot added successfully' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Delete/block slot
  const deleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('mentor_availability_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      toast({ title: 'Slot deleted' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Block/unblock slot
  const toggleSlotStatus = async (slotId: string, newStatus: 'open' | 'blocked') => {
    try {
      const { error } = await supabase
        .from('mentor_availability_slots')
        .update({ status: newStatus })
        .eq('id', slotId);

      if (error) throw error;

      toast({ title: newStatus === 'blocked' ? 'Slot blocked' : 'Slot reopened' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Confirm session via RPC
  const confirmSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('mentor_confirm_session', {
        p_session_id: sessionId
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to confirm');

      toast({ title: 'Session confirmed' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Reject session via RPC
  const rejectSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('mentor_reject_session', {
        p_session_id: sessionId
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to reject');

      toast({ title: 'Session rejected' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Cancel session via RPC
  const cancelSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('mentor_cancel_session', {
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

  // Reschedule session via RPC
  const rescheduleSession = async (sessionId: string, newStartsAt: string, newEndsAt: string) => {
    try {
      const { data, error } = await supabase.rpc('mentor_reschedule_session', {
        p_session_id: sessionId,
        p_new_starts_at: newStartsAt,
        p_new_ends_at: newEndsAt
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to reschedule');

      toast({ title: 'Session rescheduled' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Complete session via RPC
  const completeSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('mentor_complete_session', {
        p_session_id: sessionId
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to complete');

      toast({ title: 'Session marked as completed' });
      await fetchData();
      return { success: true };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return { success: false, error: err.message };
    }
  };

  // Fetch audit logs for a session
  const fetchAuditLogs = async (sessionId: string): Promise<SessionAuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('mentor_session_audit_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((log: any) => ({
        ...log,
        actor_role: log.actor_role as SessionAuditLog['actor_role'],
        meta: log.meta as Record<string, any>
      }));
    } catch (err) {
      console.error('[fetchAuditLogs] Error:', err);
      return [];
    }
  };

  // Update session notes
  const updateSessionNotes = async (sessionId: string, notesPrivate: string | null, notesShared: string | null) => {
    try {
      const { error } = await supabase
        .from('mentor_sessions')
        .update({
          notes_private: notesPrivate,
          notes_shared: notesShared
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({ title: 'Notes saved' });
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
    error,
    refetch: fetchData,
    createSlot,
    deleteSlot,
    toggleSlotStatus,
    confirmSession,
    rejectSession,
    cancelSession,
    rescheduleSession,
    completeSession,
    fetchAuditLogs,
    updateSessionNotes,
  };
}
