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
 * Reads the durable claim payload from localStorage (survives tab switches).
 * Falls back to individual sessionStorage keys for backwards compatibility.
 */
function resolveClaimData() {
  // 1) Try the consolidated localStorage claim payload first
  const claimRaw = localStorage.getItem('xima.pre_signup_claim');
  if (claimRaw) {
    try {
      const claim = JSON.parse(claimRaw);
      console.log('[sync] Using localStorage claim payload');
      return {
        resultId: claim.result_id || null,
        pillarScores: claim.pillar_scores ? JSON.stringify(claim.pillar_scores) : null,
        ximatar: claim.ximatar_label || null,
        ximatarName: claim.ximatar_name || null,
        ximatarImage: claim.ximatar_image || null,
        driveLevel: claim.drive_level || null,
        strongestPillar: claim.strongest_pillar || null,
        weakestPillar: claim.weakest_pillar || null,
        storytelling: claim.storytelling || null,
        growthPath: claim.growth_path || null,
        attemptId: claim.attempt_id || null,
        mentorId: claim.selected_mentor_id || null,
        totalScore: claim.total_score || null,
        source: 'localStorage' as const,
      };
    } catch (e) {
      console.warn('[sync] Invalid claim payload in localStorage', e);
    }
  }

  // 2) Fallback: individual sessionStorage keys (legacy)
  const guestResultId = sessionStorage.getItem('latest_assessment_result_id');
  const guestPillarScores = sessionStorage.getItem('guest_pillar_scores');
  const guestXimatar = sessionStorage.getItem('guest_ximatar');

  if (!guestResultId && !guestPillarScores && !guestXimatar) {
    return null;
  }

  console.log('[sync] Using sessionStorage keys (legacy fallback)');
  const mentorRaw = localStorage.getItem('selected_professional_data');
  let mentorId: string | null = null;
  if (mentorRaw) {
    try { mentorId = JSON.parse(mentorRaw)?.id || null; } catch {}
  }

  return {
    resultId: guestResultId,
    pillarScores: guestPillarScores,
    ximatar: guestXimatar,
    ximatarName: sessionStorage.getItem('guest_ximatar_name'),
    ximatarImage: sessionStorage.getItem('guest_ximatar_image'),
    driveLevel: sessionStorage.getItem('guest_drive_level'),
    strongestPillar: sessionStorage.getItem('guest_strongest_pillar'),
    weakestPillar: sessionStorage.getItem('guest_weakest_pillar'),
    storytelling: sessionStorage.getItem('guest_ximatar_storytelling'),
    growthPath: sessionStorage.getItem('guest_ximatar_growth_path'),
    attemptId: sessionStorage.getItem('current_attempt_id'),
    mentorId,
    totalScore: null,
    source: 'sessionStorage' as const,
  };
}

/**
 * Syncs guest assessment data to the user's profile after registration.
 * Also assigns the selected mentor if one was chosen pre-signup.
 * This ensures data continuity from guest → authenticated user flow.
 */
export const syncGuestAssessmentToProfile = async (userId: string): Promise<boolean> => {
  try {
    console.log('[sync] Starting assessment sync for user:', userId);

    const claim = resolveClaimData();
    if (!claim) {
      console.log('[sync] No guest assessment data found to sync');
      return false;
    }

    // If we have a result_id from guest flow, link it to the user
    if (claim.resultId) {
      const { error: linkError } = await supabase
        .from('assessment_results')
        .update({ 
          user_id: userId,
          computed_at: new Date().toISOString()
        })
        .eq('id', claim.resultId)
        .is('user_id', null);

      if (linkError) {
        console.error('[sync] Error linking assessment result:', linkError);
      } else {
        console.log('[sync] Successfully linked assessment result to user');
      }
    }

    // Sync pillar scores
    if (claim.pillarScores) {
      const scores = JSON.parse(claim.pillarScores) as Record<string, number>;
      
      let resultId = claim.resultId;
      if (!resultId) {
        const totalScore: number = Object.values(scores).reduce((sum: number, val: number) => sum + val, 0);
        
        const { data: newResult, error: createError } = await supabase
          .from('assessment_results')
          .insert([{
            user_id: userId,
            completed: true,
            total_score: totalScore,
            language: localStorage.getItem('i18nextLng')?.split('-')[0] || 'it',
            attempt_id: claim.attemptId || undefined
          }])
          .select()
          .single();

        if (createError || !newResult) {
          console.error('[sync] Error creating assessment result:', createError);
        } else {
          resultId = newResult.id;
        }
      }

      if (resultId) {
        const pillarInserts = Object.entries(scores).map(([pillar, score]) => ({
          assessment_result_id: resultId,
          pillar,
          score: score as number
        }));

        const { error: pillarError } = await supabase
          .from('pillar_scores')
          .insert(pillarInserts);

        if (pillarError) {
          console.error('[sync] Error syncing pillar scores:', pillarError);
        } else {
          console.log('[sync] Successfully synced pillar scores');
        }
      }
    }

    // Ensure profile row exists
    let hasProfile = false;
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existingProfile) hasProfile = true;
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

    // Update profile with XIMAtar assessment data
    if (claim.ximatar) {
      const { data: ximatarData } = await supabase
        .from('ximatars')
        .select('id, image_url')
        .eq('label', claim.ximatar.toLowerCase())
        .single();

      if (ximatarData) {
        const profileUpdate: any = {
          ximatar: claim.ximatar.toLowerCase() as any,
          ximatar_id: ximatarData.id,
          ximatar_assigned_at: new Date().toISOString(),
          creation_source: 'assessment',
          profile_complete: true
        };

        if (claim.ximatarName) profileUpdate.ximatar_name = claim.ximatarName;
        if (claim.ximatarImage) profileUpdate.ximatar_image = claim.ximatarImage;
        else if (ximatarData.image_url) profileUpdate.ximatar_image = ximatarData.image_url;
        if (claim.driveLevel) profileUpdate.drive_level = claim.driveLevel;
        if (claim.strongestPillar) profileUpdate.strongest_pillar = claim.strongestPillar;
        if (claim.weakestPillar) profileUpdate.weakest_pillar = claim.weakestPillar;
        if (claim.storytelling) profileUpdate.ximatar_storytelling = claim.storytelling;
        if (claim.growthPath) profileUpdate.ximatar_growth_path = claim.growthPath;
        
        if (claim.pillarScores) {
          try {
            profileUpdate.pillar_scores = JSON.parse(claim.pillarScores);
          } catch (e) {
            console.warn('[sync] invalid pillar_scores JSON, skipping');
          }
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', userId);

        if (profileError) {
          console.error('[sync] Error updating profile with assessment data:', profileError);
        } else {
          console.log('[sync] ✅ Updated profile with XIMAtar assessment data');
        }

        // Update assessment_result with ximatar_id
        if (claim.resultId) {
          await supabase
            .from('assessment_results')
            .update({ ximatar_id: ximatarData.id })
            .eq('id', claim.resultId);
        }
      }
    }

    // ── Assign mentor if selected pre-signup ──
    if (claim.mentorId) {
      console.log('[sync] Assigning pre-signup mentor:', claim.mentorId);
      try {
        const { data, error } = await supabase.functions.invoke('assign-mentor', {
          body: { professional_id: claim.mentorId },
        });
        if (error) {
          console.error('[sync] Error assigning mentor via edge function:', error);
        } else if (data?.success) {
          console.log('[sync] ✅ Mentor assigned successfully:', data.mentor?.name);
        }
      } catch (e) {
        console.error('[sync] Exception assigning mentor:', e);
      }
    }

    // Clean up ALL storage after sync
    // localStorage claim
    localStorage.removeItem('xima.pre_signup_claim');
    // Keep xima.assessment_completed and selected_professional_data for CandidateRouteGuard
    // They'll be cleaned up by Profile.tsx once DB state is confirmed
    
    // sessionStorage (legacy)
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
    
    console.log('[sync] ✅ Assessment sync completed - all data transferred to profile');
    return true;

  } catch (error) {
    console.error('[sync] Error syncing guest assessment:', error);
    return false;
  }
};
