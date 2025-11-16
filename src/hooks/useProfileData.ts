import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface ProfileData {
  fullName: string;
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
  strongest_pillar: string | null;
  weakest_pillar: string | null;
  ximatar_storytelling: string | null;
  ximatar_growth_path: string | null;
  mentor: any;
  hasAssessment: boolean;
  isLoading: boolean;
}

/**
 * Hook to load complete profile data from profiles table
 * This replaces the old approach of loading from assessment_results
 */
export const useProfileData = (): ProfileData => {
  const { user, isAuthenticated } = useUser();
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    ximatar: null,
    ximatar_id: null,
    ximatar_name: null,
    ximatar_image: null,
    drive_level: null,
    pillar_scores: null,
    strongest_pillar: null,
    weakest_pillar: null,
    ximatar_storytelling: null,
    ximatar_growth_path: null,
    mentor: null,
    hasAssessment: false,
    isLoading: true
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isAuthenticated || !user?.id) {
        setProfileData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Load complete profile data including all assessment fields
        const { data: profile, error } = await supabase
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

        if (error) {
          console.error('Error fetching profile:', error);
          setProfileData(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (profile) {
          setProfileData({
            fullName: profile.full_name || profile.name || user.name || '',
            ximatar: profile.ximatar,
            ximatar_id: profile.ximatar_id,
            ximatar_name: profile.ximatar_name,
            ximatar_image: profile.ximatar_image,
            drive_level: profile.drive_level as 'high' | 'medium' | 'low' | null,
            pillar_scores: profile.pillar_scores as any,
            strongest_pillar: profile.strongest_pillar,
            weakest_pillar: profile.weakest_pillar,
            ximatar_storytelling: profile.ximatar_storytelling,
            ximatar_growth_path: profile.ximatar_growth_path,
            mentor: profile.mentor,
            hasAssessment: !!(profile.ximatar && profile.pillar_scores),
            isLoading: false
          });
        } else {
          setProfileData(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Unexpected error loading profile:', error);
        setProfileData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchProfileData();
  }, [user?.id, isAuthenticated]);

  return profileData;
};
