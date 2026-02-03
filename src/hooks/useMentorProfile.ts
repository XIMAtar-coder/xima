import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MentorProfile {
  id: string;
  user_id: string | null;
  name: string;
  title: string | null;
  bio: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  specialties: string[];
  xima_pillars: string[];
  rating: number | null;
  is_active: boolean | null;
  first_session_expectations: string | null;
  active_coached_profiles_count: number;
  total_coached_profiles_count: number;
  updated_at: string;
  // New fields
  languages: string[];
  location: string | null;
  badges: string[];
  free_intro_enabled: boolean;
  free_intro_duration_minutes: number;
  paid_sessions_enabled: boolean;
  can_host_video_sessions: boolean;
  can_reschedule_sessions: boolean;
  can_view_candidate_cv: boolean;
  requires_candidate_cv_consent: boolean;
}

interface UseMentorProfileResult {
  isMentor: boolean;
  mentorProfile: MentorProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMentorProfile(): UseMentorProfileResult {
  const [isMentor, setIsMentor] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMentorProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsMentor(false);
        setMentorProfile(null);
        return;
      }

      // Check if user has a mentor record
      const { data, error: fetchError } = await supabase
        .from('mentors')
        .select('id, user_id, name, title, bio, profile_image_url, linkedin_url, specialties, xima_pillars, rating, is_active, first_session_expectations, active_coached_profiles_count, total_coached_profiles_count, updated_at, languages, location, badges, free_intro_enabled, free_intro_duration_minutes, paid_sessions_enabled, can_host_video_sessions, can_reschedule_sessions, can_view_candidate_cv, requires_candidate_cv_consent')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('[useMentorProfile] Error fetching mentor:', fetchError);
        setError('Failed to load mentor profile');
        setIsMentor(false);
        return;
      }

      if (data) {
        setIsMentor(true);
        setMentorProfile(data as MentorProfile);
      } else {
        setIsMentor(false);
        setMentorProfile(null);
      }
    } catch (err) {
      console.error('[useMentorProfile] Unexpected error:', err);
      setError('An unexpected error occurred');
      setIsMentor(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorProfile();
  }, []);

  return {
    isMentor,
    mentorProfile,
    loading,
    error,
    refetch: fetchMentorProfile
  };
}
