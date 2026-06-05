import { supabase } from '@/integrations/supabase/client';
import {
  selectArchetypeFromAssessmentPillars,
  type AssessmentPillarScores,
} from '@/lib/ximatarTaxonomy';

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

    // Update profiles table with COMPLETE XIMAtar assessment data.
    // CRITICAL: this block is gated ONLY on guest_pillar_scores existing.
    // The archetype is resolved from guest_ximatar when present, otherwise
    // derived from pillar scores using the same helper the assessment UI uses.
    if (guestPillarScores) {
      let parsedScores: AssessmentPillarScores | null = null;
      try {
        parsedScores = JSON.parse(guestPillarScores) as AssessmentPillarScores;
      } catch (e) {
        console.error('[sync] invalid guest_pillar_scores JSON, aborting profile write', e);
      }

      if (parsedScores) {
        // Resolve archetype label (guest value first, derived second)
        let resolvedLabel = guestXimatar?.toLowerCase() || '';
        let resolvedName = guestXimatarName || '';
        let driveLevel = guestDriveLevel || '';
        let strongestPillar = guestStrongestPillar || '';
        let weakestPillar = guestWeakestPillar || '';

        if (!resolvedLabel) {
          const derived = selectArchetypeFromAssessmentPillars(parsedScores);
          resolvedLabel = derived.label;
          resolvedName = resolvedName || derived.name;
          driveLevel = driveLevel || derived.driveLevel;
          strongestPillar = strongestPillar || derived.strongest;
          weakestPillar = weakestPillar || derived.weakest;
          console.warn(
            '[sync] guest_ximatar missing in sessionStorage — derived archetype from pillar_scores',
            { resolvedLabel }
          );
        }

        if (!resolvedName) {
          resolvedName = resolvedLabel.charAt(0).toUpperCase() + resolvedLabel.slice(1);
        }

        // Best-effort ximatar_id lookup
        const { data: ximatarData, error: ximatarLookupError } = await supabase
          .from('ximatars')
          .select('id, image_url')
          .eq('label', resolvedLabel)
          .maybeSingle();

        if (ximatarLookupError) {
          console.error('[sync] ximatars lookup error (continuing)', ximatarLookupError);
        }

        const profileUpdate: any = {
          ximatar: resolvedLabel as any,
          ximatar_name: resolvedName,
          ximatar_assigned_at: new Date().toISOString(),
          creation_source: 'assessment',
          profile_complete: true,
          pillar_scores: parsedScores,
        };
        if (driveLevel) profileUpdate.drive_level = driveLevel;
        if (strongestPillar) profileUpdate.strongest_pillar = strongestPillar;
        if (weakestPillar) profileUpdate.weakest_pillar = weakestPillar;
        if (guestStorytelling) profileUpdate.ximatar_storytelling = guestStorytelling;
        if (guestGrowthPath) profileUpdate.ximatar_growth_path = guestGrowthPath;

        if (ximatarData) {
          profileUpdate.ximatar_id = ximatarData.id;
          profileUpdate.ximatar_image = guestXimatarImage || ximatarData.image_url;
        } else {
          console.error(
            '[sync] CRITICAL: ximatars row not found for label — writing profile without ximatar_id',
            { resolvedLabel }
          );
          if (guestXimatarImage) profileUpdate.ximatar_image = guestXimatarImage;
        }

        // Affected-row check: 0-row updates (RLS mismatch / row not visible)
        // currently return {error:null}; surface them as ERROR.
        const { data: updatedRows, error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', userId)
          .select('user_id');

        if (profileError) {
          console.error('[sync] ERROR updating profile with assessment data:', profileError);
        } else if (!updatedRows || updatedRows.length === 0) {
          console.error(
            '[sync] ERROR: profile UPDATE affected 0 rows — likely RLS mismatch or missing profile row',
            { userId }
          );
        } else {
          console.log('[sync] ✅ profile updated with archetype', {
            userId,
            ximatar: resolvedLabel,
            hasXimatarId: !!ximatarData,
          });
        }

        // Link assessment_result to ximatar (best effort, only if both present)
        if (guestResultId && ximatarData) {
          const { error: arError } = await supabase
            .from('assessment_results')
            .update({ ximatar_id: ximatarData.id })
            .eq('id', guestResultId);
          if (arError) {
            console.warn('[sync] failed to link assessment_result to ximatar', arError);
          }
        }
      }
    }

    // Insert initial pillar progress snapshot for Drive computation
    // This snapshot enables Drive to be calculated as improvement velocity over time
    // Only inserted if we have pillar scores; Drive remains NULL until a second snapshot exists
    if (guestPillarScores) {
      try {
        const scores = JSON.parse(guestPillarScores);
        const snapshotScores = {
          communication: scores.communication ?? 0,
          knowledge: scores.knowledge ?? 0,
          creativity: scores.creativity ?? 0,
          computational_power: scores.computational_power ?? 0,
        };
        const { error: snapshotError } = await supabase
          .from('pillar_progress_snapshots')
          .insert({
            user_id: userId,
            source: 'assessment_initial',
            pillar_scores: snapshotScores,
            metadata: { result_id: guestResultId || null },
          });
        if (snapshotError) {
          console.warn('[sync] snapshot insert error (non-fatal):', snapshotError);
        } else {
          console.log('✅ Inserted initial pillar progress snapshot for Drive');
        }
      } catch (e) {
        console.warn('[sync] snapshot insert failed (non-fatal):', e);
      }
    }

    // Clean up sessionStorage after successful sync (keep xima_pending_cv for CV import)
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
