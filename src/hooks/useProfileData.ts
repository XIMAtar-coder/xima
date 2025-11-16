import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface OpenAnswerItem {
  question: string;
  answer: string;
  score?: number;
}

export interface MentorProfile {
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  calendar_url?: string | null;
}

interface ProfileData {
  full_name: string;
  ximatar: string | null;
  ximatar_id: string | null;
  ximatar_name: string | null;
  ximatar_image: string | null;
  drive_level: 'high' | 'medium' | 'low' | null;
  pillar_scores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
  cv_pillar_scores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
  strongest_pillar: string | null;
  weakest_pillar: string | null;
  ximatar_storytelling: string | null;
  ximatar_growth_path: string | null;
  mentor_id: string | null;
  mentor_profile: MentorProfile | null;
  open_answers: OpenAnswerItem[];
  assessment_rationale: any;
  cv_analysis: {
    summary?: string | null;
    strengths?: string[] | null;
    soft_skills?: string[] | null;
  } | null;
  hasAssessment: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Robust hook to load the user's profile and related dynamic data
 */
export const useProfileData = (): ProfileData => {
  const { user, isAuthenticated } = useUser();
  const [state, setState] = useState<ProfileData>({
    full_name: '',
    ximatar: null,
    ximatar_id: null,
    ximatar_name: null,
    ximatar_image: null,
    drive_level: null,
    pillar_scores: null,
    cv_pillar_scores: null,
    strongest_pillar: null,
    weakest_pillar: null,
    ximatar_storytelling: null,
    ximatar_growth_path: null,
    mentor_id: null,
    mentor_profile: null,
    open_answers: [],
    assessment_rationale: null,
    cv_analysis: null,
    hasAssessment: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const load = async () => {
      console.log('[useProfileData] LOAD START', { isAuthenticated, userId: user?.id });
      
      try {
        const { data: authUser } = await supabase.auth.getUser();
        console.log('[useProfileData] auth.getUser result', authUser?.user?.id);
      } catch (e) {
        console.warn('[useProfileData] getUser failed', e);
      }

      if (!isAuthenticated || !user?.id) {
        console.log('[useProfileData] No auth or user, stopping');
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        console.log('[useProfileData] Fetching profile for user:', user.id);
        // 1) Base profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            full_name,
            name,
            ximatar,
            ximatar_id,
            ximatar_name,
            ximatar_image,
            drive_level,
            pillar_scores,
            strongest_pillar,
            weakest_pillar,
            ximatar_storytelling,
            ximatar_growth_path,
            mentor
          `)
          .eq('user_id', user.id)
          .single();

        console.log('[useProfileData] Profile query result:', { profile, profileError });

        if (profileError) {
          console.error('[useProfileData] profile error', profileError);
          setState((prev) => ({ ...prev, isLoading: false, error: profileError.message }));
          return;
        }

        // 2) Related data in parallel
        const [mentorMatchRes, openRespRes, latestResultRes, cvAnalysisRes] = await Promise.all([
          supabase
            .from('mentor_matches')
            .select('mentor_user_id')
            .eq('mentee_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('assessment_open_responses')
            .select('open_key, answer, score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('assessment_results')
            .select('rationale')
            .eq('user_id', user.id)
            .eq('completed', true)
            .order('computed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('assessment_cv_analysis')
            .select('summary, strengths, soft_skills, pillar_vector')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const mentor_user_id = mentorMatchRes.data?.mentor_user_id || null;

        // Optionally fetch mentor profile details if we have a match
        let mentor_profile: MentorProfile | null = null;
        if (profile?.mentor) {
          const m = profile.mentor as any;
          mentor_profile = {
            name: m?.name ?? '',
            bio: m?.bio ?? null,
            avatar_url: m?.avatar_url ?? m?.profile_image_url ?? null,
            calendar_url: m?.calendar_url ?? null,
          };
        } else if (mentor_user_id) {
          const [mentorsRes, professionalsRes] = await Promise.all([
            supabase
              .from('mentors')
              .select('name, bio, profile_image_url')
              .eq('user_id', mentor_user_id)
              .limit(1)
              .maybeSingle(),
            supabase
              .from('professionals')
              .select('calendar_url, full_name, avatar_path')
              .eq('user_id', mentor_user_id)
              .limit(1)
              .maybeSingle(),
          ]);
          mentor_profile = {
            name: mentorsRes.data?.name || professionalsRes.data?.full_name || '',
            bio: mentorsRes.data?.bio || null,
            avatar_url: mentorsRes.data?.profile_image_url || professionalsRes.data?.avatar_path || null,
            calendar_url: professionalsRes.data?.calendar_url || null,
          };
        }

        // Normalize pillars from profile
        const ps = (profile?.pillar_scores as any) || null;
        const pillar_scores = ps
          ? {
              computational_power: Number(ps.computational_power ?? ps.computational ?? 0),
              communication: Number(ps.communication ?? 0),
              knowledge: Number(ps.knowledge ?? 0),
              creativity: Number(ps.creativity ?? 0),
              drive: Number(ps.drive ?? 0),
            }
          : null;

        // CV pillar vector normalization
        const pv = (cvAnalysisRes.data?.pillar_vector as any) || null;
        const cv_pillar_scores = pv
          ? {
              computational_power: Number(pv.computational_power ?? pv.computational ?? pv.comp_power ?? 0),
              communication: Number(pv.communication ?? 0),
              knowledge: Number(pv.knowledge ?? 0),
              creativity: Number(pv.creativity ?? 0),
              drive: Number(pv.drive ?? 0),
            }
          : null;

        // Open answers mapping
        const open_answers: OpenAnswerItem[] = (openRespRes.data || []).map((row: any) => {
          const formatted = (row.open_key as string)?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return { question: formatted, answer: row.answer, score: row.score ?? undefined };
        });

        // Full name fallback handling
        let full_name = profile?.full_name || profile?.name || user?.name || '';
        const anyProfile: any = profile;
        if (!profile?.full_name && (anyProfile?.first_name || anyProfile?.last_name)) {
          full_name = `${anyProfile?.first_name || ''} ${anyProfile?.last_name || ''}`.trim() || full_name;
        }

        const next: ProfileData = {
          full_name,
          ximatar: (profile?.ximatar as any) ?? null,
          ximatar_id: (profile?.ximatar_id as any) ?? null,
          ximatar_name: (profile?.ximatar_name as any) ?? null,
          ximatar_image: (profile?.ximatar_image as any) ?? null,
          drive_level: (profile?.drive_level as any) ?? null,
          pillar_scores,
          cv_pillar_scores,
          strongest_pillar: (profile?.strongest_pillar as any) ?? null,
          weakest_pillar: (profile?.weakest_pillar as any) ?? null,
          ximatar_storytelling: (profile?.ximatar_storytelling as any) ?? null,
          ximatar_growth_path: (profile?.ximatar_growth_path as any) ?? null,
          mentor_id: mentor_user_id,
          mentor_profile,
          open_answers,
          assessment_rationale: latestResultRes.data?.rationale ?? null,
          cv_analysis: {
            summary: cvAnalysisRes.data?.summary ?? null,
            strengths: cvAnalysisRes.data?.strengths ?? null,
            soft_skills: cvAnalysisRes.data?.soft_skills ?? null,
          },
          hasAssessment: !!((profile?.ximatar || profile?.ximatar_id) && pillar_scores),
          isLoading: false,
          error: null,
        };

        console.log('[useProfileData] FINAL STATE UPDATE:', next);
        setState(next);
      } catch (err: any) {
        console.error('[useProfileData] UNEXPECTED ERROR', err);
        setState((prev) => ({ ...prev, isLoading: false, error: err?.message || 'Unknown error' }));
      }
    };

    load();
  }, [user?.id, isAuthenticated]);

  return state;
};
