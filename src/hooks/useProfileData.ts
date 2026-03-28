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

interface CvTensionGap {
  pillar: string;
  ximatar_score: number;
  cv_score: number;
  gap_direction: 'undersold' | 'oversold' | string;
  narrative: string;
}

interface CvTechnicalImprovement {
  category: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low' | string;
}

interface CvIdentityImprovement {
  target_pillar: string;
  recommendation: string;
  example_before?: string | null;
  example_after?: string | null;
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
    alignmentScore?: number | null;
    tensionNarrative?: string | null;
    tensionGaps?: CvTensionGap[] | null;
    technicalImprovements?: CvTechnicalImprovement[] | null;
    identityImprovements?: CvIdentityImprovement[] | null;
    roleFit?: {
      cvQualifiedRoles: string[];
      archetypeAlignedRoles: string[];
      growthBridgeRoles: string[];
    } | null;
    mentorHook?: {
      suggestedFocus?: string | null;
      keyQuestion?: string | null;
    } | null;
    cvArchetype?: {
      primary?: string | null;
      secondary?: string | null;
    } | null;
    cv_comments?: {
      summary?: string;
      computational_power?: string;
      communication?: string;
      knowledge?: string;
      creativity?: string;
      drive?: string;
    } | null;
  } | null;
  hasAssessment: boolean;
  isLoading: boolean;
  error: string | null;
  profile_completed: boolean;
  desired_locations: any[];
  work_preference: string | null;
  willing_to_relocate: string | null;
  salary_expectation: any | null;
  availability_date: string | null;
  industry_preferences: string[];
}

const normalizePillars = (raw: any) => {
  if (!raw) return null;

  return {
    computational_power: Number(raw.computational_power ?? raw.comp_power ?? raw.computational ?? 0),
    communication: Number(raw.communication ?? 0),
    knowledge: Number(raw.knowledge ?? 0),
    creativity: Number(raw.creativity ?? 0),
    drive: Number(raw.drive ?? 0),
  };
};

/**
 * Robust hook to load the user's profile and related dynamic data
 */
export const useProfileData = (refreshTrigger?: number): ProfileData => {
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
    profile_completed: false,
    desired_locations: [],
    work_preference: null,
    willing_to_relocate: null,
    salary_expectation: null,
    availability_date: null,
    industry_preferences: [],
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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            name,
            ximatar,
            ximatar_id,
            ximatar_name,
            ximatar_image,
            drive_level,
            pillar_scores,
            cv_scores,
            cv_comments,
            strongest_pillar,
            weakest_pillar,
            ximatar_storytelling,
            ximatar_growth_path,
            mentor,
            profile_completed,
            desired_locations,
            work_preference,
            willing_to_relocate,
            salary_expectation,
            availability_date,
            industry_preferences
          `)
          .eq('user_id', user.id)
          .single();

        console.log('[useProfileData] Profile query result:', { profile, profileError });

        if (profileError) {
          console.error('[useProfileData] profile error', profileError);
          setState((prev) => ({ ...prev, isLoading: false, error: profileError.message }));
          return;
        }

        const profileId = profile?.id;
        if (!profileId) {
          console.error('[useProfileData] No profile ID found');
          setState((prev) => ({ ...prev, isLoading: false, error: 'Profile not found' }));
          return;
        }

        const [mentorMatchRes, openRespRes, latestResultRes, cvAnalysisRes, cvCredentialsRes, cvIdentityRes] = await Promise.all([
          supabase
            .from('mentor_matches')
            .select('mentor_user_id')
            .eq('mentee_user_id', profileId)
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
          supabase
            .from('cv_credentials')
            .select('hard_skills')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('cv_identity_analysis')
            .select('alignment_score, cv_archetype_primary, cv_archetype_secondary, tension_narrative, tension_gaps, technical_improvements, identity_improvements, cv_qualified_roles, archetype_aligned_roles, growth_bridge_roles, mentor_suggested_focus, mentor_key_question, cv_pillar_scores')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const mentor_profile_id = mentorMatchRes.data?.mentor_user_id || null;

        let mentor_profile: MentorProfile | null = null;
        let mentor_user_id: string | null = null;

        if (profile?.mentor) {
          const m = profile.mentor as any;
          mentor_profile = {
            name: m?.name ?? '',
            bio: m?.bio ?? null,
            avatar_url: m?.avatar_url ?? m?.profile_image_url ?? null,
            calendar_url: m?.calendar_url ?? null,
          };
          console.log('[useProfileData] Using cached mentor from profile:', mentor_profile.name);
        } else if (mentor_profile_id) {
          console.log('[useProfileData] Fetching mentor from mentors table:', mentor_profile_id);
          const { data: mentorData, error: profError } = await supabase
            .from('mentors')
            .select('id, user_id, name, title, profile_image_url, bio, specialties, xima_pillars')
            .eq('id', mentor_profile_id)
            .maybeSingle();

          if (profError) {
            console.error('[useProfileData] Error fetching mentor:', profError);
          } else if (mentorData) {
            console.log('[useProfileData] Found mentor:', mentorData.name);
            mentor_user_id = mentorData.user_id;

            mentor_profile = {
              name: mentorData.name || '',
              bio: mentorData.bio || null,
              avatar_url: mentorData.profile_image_url || null,
              calendar_url: null,
            };
          } else {
            console.warn('[useProfileData] Mentor not found for ID:', mentor_profile_id);
          }
        }

        const pillar_scores = normalizePillars(profile?.pillar_scores);
        const cv_pillar_scores = normalizePillars(
          (cvIdentityRes.data?.cv_pillar_scores as any) ||
          (profile?.cv_scores as any) ||
          (cvAnalysisRes.data?.pillar_vector as any)
        );

        const tensionGaps = Array.isArray(cvIdentityRes.data?.tension_gaps)
          ? (cvIdentityRes.data?.tension_gaps as unknown as CvTensionGap[])
          : [];

        const commentsFromTension = tensionGaps.reduce<Record<string, string>>((acc, item) => {
          if (item?.pillar && item?.narrative) {
            acc[item.pillar] = item.narrative;
          }
          return acc;
        }, {});

        const open_answers: OpenAnswerItem[] = (openRespRes.data || []).map((row: any) => {
          const formatted = (row.open_key as string)?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return { question: formatted, answer: row.answer, score: row.score ?? undefined };
        });

        let full_name = profile?.full_name || profile?.name || user?.name || '';
        const anyProfile: any = profile;
        if (!profile?.full_name && (anyProfile?.first_name || anyProfile?.last_name)) {
          full_name = `${anyProfile?.first_name || ''} ${anyProfile?.last_name || ''}`.trim() || full_name;
        }

        const skillsFallback = ((cvCredentialsRes.data?.hard_skills as any[] | null) || [])
          .slice(0, 5)
          .map((skill) => skill?.name || String(skill))
          .filter(Boolean);

        const technicalImprovements = Array.isArray(cvIdentityRes.data?.technical_improvements)
          ? (cvIdentityRes.data.technical_improvements as unknown as CvTechnicalImprovement[])
          : null;

        const identityImprovements = Array.isArray(cvIdentityRes.data?.identity_improvements)
          ? (cvIdentityRes.data.identity_improvements as unknown as CvIdentityImprovement[])
          : null;

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
            summary: cvAnalysisRes.data?.summary ?? cvIdentityRes.data?.tension_narrative ?? (profile?.cv_comments as any)?.summary ?? null,
            strengths: cvAnalysisRes.data?.strengths ?? (skillsFallback.length ? skillsFallback : null),
            soft_skills: cvAnalysisRes.data?.soft_skills ?? null,
            alignmentScore: typeof cvIdentityRes.data?.alignment_score === 'number' ? cvIdentityRes.data.alignment_score : null,
            tensionNarrative: (cvIdentityRes.data?.tension_narrative as string | null) ?? null,
            tensionGaps: tensionGaps.length ? tensionGaps : null,
            technicalImprovements,
            identityImprovements,
            roleFit: {
              cvQualifiedRoles: Array.isArray(cvIdentityRes.data?.cv_qualified_roles) ? cvIdentityRes.data.cv_qualified_roles as string[] : [],
              archetypeAlignedRoles: Array.isArray(cvIdentityRes.data?.archetype_aligned_roles) ? cvIdentityRes.data.archetype_aligned_roles as string[] : [],
              growthBridgeRoles: Array.isArray(cvIdentityRes.data?.growth_bridge_roles) ? cvIdentityRes.data.growth_bridge_roles as string[] : [],
            },
            mentorHook: {
              suggestedFocus: (cvIdentityRes.data?.mentor_suggested_focus as string | null) ?? null,
              keyQuestion: (cvIdentityRes.data?.mentor_key_question as string | null) ?? null,
            },
            cvArchetype: {
              primary: (cvIdentityRes.data?.cv_archetype_primary as string | null) ?? null,
              secondary: (cvIdentityRes.data?.cv_archetype_secondary as string | null) ?? null,
            },
            cv_comments: {
              ...((profile?.cv_comments as any) ?? {}),
              ...commentsFromTension,
            },
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
  }, [user?.id, isAuthenticated, refreshTrigger]);

  return state;
};