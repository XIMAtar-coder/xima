import { supabase } from '@/integrations/supabase/client';

interface GuestAssessmentData {
  result_id?: string;
  ximatar_id?: string;
  ximatar_label?: string;
  ximatar_name?: string;
  ximatar_image?: string;
  drive_level?: string;
  strongest_pillar?: string;
  weakest_pillar?: string;
  pillar_scores?: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
  total_score?: number;
  ximatar_storytelling?: string;
  ximatar_growth_path?: string;
  assessment_data?: any;
}

/**
 * Syncs guest assessment data to the user's profile after registration
 * This ensures data continuity from guest → authenticated user flow
 */
export const syncGuestAssessmentToProfile = async (userId: string): Promise<boolean> => {
  try {
    console.log('Starting assessment sync for user:', userId);

    try {
      const { data: authUser } = await supabase.auth.getUser();
      console.log('[sync] auth.getUser', authUser?.user?.id, authUser?.user?.email);
    } catch (e) {
      console.warn('[sync] auth.getUser failed', e);
    }
    // Check sessionStorage for guest assessment data (more secure than localStorage)
    const guestResultId = sessionStorage.getItem('latest_assessment_result_id');
    const guestPillarScores = sessionStorage.getItem('guest_pillar_scores');
    const guestXimatar = sessionStorage.getItem('guest_ximatar');
    const guestXimatarName = sessionStorage.getItem('guest_ximatar_name');
    const guestXimatarImage = sessionStorage.getItem('guest_ximatar_image');
    const guestDriveLevel = sessionStorage.getItem('guest_drive_level');
    const guestStrongestPillar = sessionStorage.getItem('guest_strongest_pillar');
    const guestWeakestPillar = sessionStorage.getItem('guest_weakest_pillar');
    const guestStorytelling = sessionStorage.getItem('guest_ximatar_storytelling');
    const guestGrowthPath = sessionStorage.getItem('guest_ximatar_growth_path');
    const guestAttemptId = sessionStorage.getItem('current_attempt_id');

    if (!guestResultId && !guestPillarScores && !guestXimatar) {
      console.log('No guest assessment data found to sync');
      return false;
    }

    // If we have a result_id from guest flow, link it to the user
    if (guestResultId) {
      const { error: linkError } = await supabase
        .from('assessment_results')
        .update({ 
          user_id: userId,
          computed_at: new Date().toISOString()
        })
        .eq('id', guestResultId)
        .is('user_id', null); // Only update if not already claimed

      if (linkError) {
        console.error('Error linking assessment result:', linkError);
      } else {
        console.log('Successfully linked assessment result to user');
      }
    }

    // Sync pillar scores from localStorage if available
    if (guestPillarScores) {
      const scores = JSON.parse(guestPillarScores) as Record<string, number>;
      
      // Get or create assessment_result
      let resultId = guestResultId;
      if (!resultId) {
        // Create a new assessment_result for this data
        const totalScore: number = Object.values(scores).reduce((sum: number, val: number) => sum + val, 0);
        
        const { data: newResult, error: createError } = await supabase
          .from('assessment_results')
          .insert([{
            user_id: userId,
            completed: true,
            total_score: totalScore,
            language: localStorage.getItem('i18nextLng')?.split('-')[0] || 'it',
            attempt_id: guestAttemptId || undefined
          }])
          .select()
          .single();

        if (createError || !newResult) {
          console.error('Error creating assessment result:', createError);
          return false;
        }
        resultId = newResult.id;
      }

      // Insert pillar scores (they won't duplicate due to unique constraint)
      const pillarInserts = Object.entries(scores).map(([pillar, score]) => ({
        assessment_result_id: resultId,
        pillar: pillar,
        score: score as number
      }));

      const { error: pillarError } = await supabase
        .from('pillar_scores')
        .insert(pillarInserts);

      if (pillarError) {
        console.error('Error syncing pillar scores:', pillarError);
      } else {
        console.log('Successfully synced pillar scores');
      }
    }

    // Ensure a profile row exists for this user
    let hasProfile = false;
    try {
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existingProfile) hasProfile = true;
      if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        console.warn('[sync] profile fetch error (ignored if not found):', profileFetchError);
      }
    } catch (e) {
      console.warn('[sync] error checking existing profile', e);
    }

    if (!hasProfile) {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const displayName = authUser?.user?.user_metadata?.name || authUser?.user?.email || '';
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, name: displayName, profile_complete: false });
        if (insertProfileError) {
          console.error('[sync] error inserting profile row:', insertProfileError);
        } else {
          console.log('[sync] inserted new profile row');
        }
      } catch (e) {
        console.error('[sync] unexpected error inserting profile', e);
      }
    }

    // Update profiles table with COMPLETE XIMAtar assessment data
    if (guestXimatar) {
      // Get XIMAtar ID and full data from label
      const { data: ximatarData } = await supabase
        .from('ximatars')
        .select('id, image_url')
        .eq('label', guestXimatar.toLowerCase())
        .single();

      if (ximatarData) {
        // Prepare complete profile update with ALL assessment fields
        const profileUpdate: any = {
          ximatar: guestXimatar.toLowerCase() as any,
          ximatar_id: ximatarData.id,
          ximatar_assigned_at: new Date().toISOString(),
          creation_source: 'assessment',
          profile_complete: true
        };

        // Add optional fields if available
        if (guestXimatarName) profileUpdate.ximatar_name = guestXimatarName;
        if (guestXimatarImage) profileUpdate.ximatar_image = guestXimatarImage;
        else if (ximatarData.image_url) profileUpdate.ximatar_image = ximatarData.image_url;
        if (guestDriveLevel) profileUpdate.drive_level = guestDriveLevel;
        if (guestStrongestPillar) profileUpdate.strongest_pillar = guestStrongestPillar;
        if (guestWeakestPillar) profileUpdate.weakest_pillar = guestWeakestPillar;
        if (guestStorytelling) profileUpdate.ximatar_storytelling = guestStorytelling;
        if (guestGrowthPath) profileUpdate.ximatar_growth_path = guestGrowthPath;
        
        // Add pillar scores as JSONB
        if (guestPillarScores) {
          try {
            profileUpdate.pillar_scores = JSON.parse(guestPillarScores);
          } catch (e) {
            console.warn('[sync] invalid pillar_scores JSON, skipping');
          }
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', userId);

        if (profileError) {
          console.error('Error updating profile with complete data:', profileError);
        } else {
          console.log('✅ Successfully updated profile with complete XIMAtar assessment data');
        }

        // Update assessment_result with ximatar_id if we have a result
        if (guestResultId) {
          await supabase
            .from('assessment_results')
            .update({ ximatar_id: ximatarData.id })
            .eq('id', guestResultId);
        }
      }
    }

    // Clean up sessionStorage after successful sync
    sessionStorage.removeItem('latest_assessment_result_id');
    sessionStorage.removeItem('guest_pillar_scores');
    sessionStorage.removeItem('guest_ximatar');
    sessionStorage.removeItem('guest_ximatar_name');
    sessionStorage.removeItem('guest_ximatar_image');
    sessionStorage.removeItem('guest_drive_level');
    sessionStorage.removeItem('guest_strongest_pillar');
    sessionStorage.removeItem('guest_weakest_pillar');
    sessionStorage.removeItem('guest_ximatar_storytelling');
    sessionStorage.removeItem('guest_ximatar_growth_path');
    sessionStorage.removeItem('guest_assessment_data');
    sessionStorage.removeItem('current_attempt_id');
    
    console.log('✅ Assessment sync completed successfully - all data transferred to profile');
    return true;

  } catch (error) {
    console.error('Error syncing guest assessment:', error);
    return false;
  }
};
