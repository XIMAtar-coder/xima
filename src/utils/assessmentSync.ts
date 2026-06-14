import { supabase } from '@/integrations/supabase/client';
import {
  selectArchetypeFromAssessmentPillars,
  type AssessmentPillarScores,
} from '@/lib/ximatarTaxonomy';
import { CV_PROCESSING_VERSION } from '@/lib/legal/consentVersions';


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
    let assessmentProfileSynced = false;

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

    // Ensure a profile row exists BEFORE linking/creating assessment_results.
    // assessment_results.user_id has an FK to profiles.user_id, so doing this
    // after the insert can race with the signup profile trigger and abort sync.
    let hasProfile = false;
    try {
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existingProfile) hasProfile = true;
      if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        console.error('[sync] profile fetch error before assessment sync:', profileFetchError);
      }
    } catch (e) {
      console.error('[sync] error checking existing profile before assessment sync', e);
    }

    if (!hasProfile) {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const displayName = authUser?.user?.user_metadata?.name || authUser?.user?.email || '';
        const { data: insertedProfile, error: insertProfileError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, name: displayName, profile_complete: false })
          .select('user_id')
          .maybeSingle();
        if (insertProfileError) {
          console.error('[sync] error inserting profile row before assessment sync:', insertProfileError);
        } else {
          hasProfile = !!insertedProfile;
          console.log('[sync] inserted profile row before assessment sync');
        }
      } catch (e) {
        console.error('[sync] unexpected error inserting profile before assessment sync', e);
      }
    }

    if (!hasProfile) {
      console.error('[sync] CRITICAL: profile row unavailable; preserving guest assessment data for retry', { userId });
      return false;
    }

    let assessmentResultId = guestResultId || '';

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
      let resultId = assessmentResultId;
      if (!resultId) {
        // Create a new assessment_result for this data
        const totalScore: number = Object.values(scores).reduce((sum: number, val: number) => sum + val, 0);
        
        const { data: newResult, error: createError } = await supabase
          .from('assessment_results')
          .insert([{
            user_id: userId,
            completed: true,
            total_score: totalScore,
            pillars: scores as any,
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
        assessmentResultId = newResult.id;
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

/**
 * Claims guest CV analysis stored in sessionStorage by GuestCvUpload.
 * Persists results into cv_identity_analysis + cv_credentials and records
 * the cv_processing consent in user_consents. Best-effort: any failure is
 * logged but never blocks the registration flow.
 *
 * Idempotent: if no guest_cv_* keys are present, returns false silently.
 * Always clears the sessionStorage CV blob on success or terminal failure.
 */
export const syncGuestCvToProfile = async (userId: string): Promise<boolean> => {
  const blob = sessionStorage.getItem('guest_cv_analysis');
  if (!blob) {
    console.log('[sync-cv] no guest CV analysis to claim');
    return false;
  }

  try {
    const data = JSON.parse(blob);
    const credentials = data.credentials || {};
    const identity = data.identity || {};
    const archetype = identity.cv_archetype || {};
    const tension = identity.tension || {};
    const improvements = identity.improvements || {};
    const roleFit = identity.role_fit || {};
    const mentorHook = identity.mentor_hook || {};
    const cvPillarScores = identity.cv_pillar_scores || {
      drive: 0, computational_power: 0, communication: 0, creativity: 0, knowledge: 0,
    };

    // Resolve real assessment archetype + pillars.
    // Priority: 1) profiles row (already written by syncGuestAssessmentToProfile),
    // 2) sessionStorage (if assessment sync hasn't cleared it), 3) CV blob fallback.
    let assessmentXimatar: string = '';
    let assessmentPillarScores: Record<string, number> = {};
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('ximatar, pillar_scores')
        .eq('user_id', userId)
        .maybeSingle();
      if (prof?.ximatar) assessmentXimatar = String(prof.ximatar).toLowerCase();
      if (prof?.pillar_scores && typeof prof.pillar_scores === 'object') {
        assessmentPillarScores = prof.pillar_scores as Record<string, number>;
      }
    } catch (e) {
      console.warn('[sync-cv] profile lookup for assessment data failed:', e);
    }
    if (!assessmentXimatar) {
      const ss = sessionStorage.getItem('guest_ximatar');
      if (ss) assessmentXimatar = ss.toLowerCase();
    }
    if (!Object.keys(assessmentPillarScores).length) {
      const ss = sessionStorage.getItem('guest_pillar_scores');
      if (ss) {
        try { assessmentPillarScores = JSON.parse(ss); } catch {}
      }
    }
    if (!assessmentXimatar) assessmentXimatar = (data.assessment_ximatar || '').toLowerCase();
    if (!Object.keys(assessmentPillarScores).length) {
      assessmentPillarScores = data.assessment_pillar_scores || {};
    }

    // Upsert cv_identity_analysis (NOT NULL: cv_archetype_primary, cv_pillar_scores,
    // assessment_ximatar, assessment_pillar_scores — all populated below).
    const { error: identityErr } = await supabase
      .from('cv_identity_analysis')
      .upsert({
        user_id: userId,
        cv_archetype_primary: archetype.primary || assessmentXimatar,
        cv_archetype_secondary: archetype.secondary || null,
        cv_archetype_explanation: archetype.explanation || null,
        cv_pillar_scores: cvPillarScores,
        assessment_ximatar: assessmentXimatar,
        assessment_pillar_scores: assessmentPillarScores,
        alignment_score: tension.alignment_score ?? null,
        tension_gaps: tension.primary_gaps || null,
        tension_narrative: tension.overall_narrative || null,
        technical_improvements: improvements.technical || null,
        identity_improvements: improvements.identity_aligned || null,
        cv_qualified_roles: roleFit.cv_qualified_roles || [],
        archetype_aligned_roles: roleFit.archetype_aligned_roles || [],
        growth_bridge_roles: roleFit.growth_bridge_roles || [],
        mentor_suggested_focus: mentorHook.suggested_focus || null,
        mentor_key_question: mentorHook.key_question || null,
        correlation_id: data.correlation_id || null,
      }, { onConflict: 'user_id' });

    if (identityErr) {
      console.error('[sync-cv] cv_identity_analysis upsert error:', identityErr);
    } else {
      console.log('[sync-cv] cv_identity_analysis claimed');
    }

    // cv_credentials — surface Supabase errors (do not swallow)
    try {
      const location = credentials.location || {};
      const { error: credErr } = await supabase.from('cv_credentials').upsert({
        user_id: userId,
        full_name: credentials.full_name || null,
        email: credentials.email || null,
        phone: credentials.phone || null,
        location_city: location.city || null,
        location_region: location.region || null,
        location_country: location.country || null,
        linkedin_url: credentials.linkedin_url || null,
        portfolio_url: credentials.portfolio_url || null,
        education: credentials.education || [],
        work_experience: credentials.work_experience || [],
        hard_skills: credentials.hard_skills || [],
        certifications: credentials.certifications || [],
        languages: credentials.languages || [],
        total_years_experience: credentials.total_years_experience ?? null,
        seniority_level: credentials.seniority_level || null,
        industries_worked: credentials.industries_worked || [],
        career_trajectory: credentials.career_trajectory || null,
      }, { onConflict: 'user_id' });
      if (credErr) {
        console.error('[sync-cv] cv_credentials upsert error:', credErr);
      } else {
        console.log('[sync-cv] cv_credentials claimed');
      }
    } catch (e) {
      console.error('[sync-cv] cv_credentials upsert exception:', e);
    }

    // Mirror cv_scores onto profiles — surface Supabase errors
    try {
      const { error: scoresErr } = await supabase.from('profiles').update({
        cv_scores: {
          computational_power: cvPillarScores.computational_power ?? 0,
          communication: cvPillarScores.communication ?? 0,
          knowledge: cvPillarScores.knowledge ?? 0,
          creativity: cvPillarScores.creativity ?? 0,
          drive: cvPillarScores.drive ?? 0,
        },
        cv_comments: tension.overall_narrative ? { summary: tension.overall_narrative } : null,
      }).eq('user_id', userId);
      if (scoresErr) {
        console.error('[sync-cv] profiles cv_scores update error:', scoresErr);
      } else {
        console.log('[sync-cv] profiles.cv_scores updated');
      }
    } catch (e) {
      console.error('[sync-cv] profiles cv_scores update exception:', e);
    }

    // Record cv_processing consent (consent was given at guest upload time)
    try {
      const consentRaw = sessionStorage.getItem('guest_cv_consent');
      const consentBlob = consentRaw ? JSON.parse(consentRaw) : null;
      const { error: consentErr } = await supabase.from('user_consents').insert({
        user_id: userId,
        consent_type: 'cv_processing',
        consent_version: consentBlob?.version || CV_PROCESSING_VERSION,
        locale: consentBlob?.locale || null,
        user_agent: consentBlob?.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      });
      if (consentErr) {
        console.error('[sync-cv] user_consents insert error:', consentErr);
      } else {
        console.log('[sync-cv] cv_processing consent recorded');
      }
    } catch (e) {
      console.error('[sync-cv] consent insert exception:', e);
    }


    return !identityErr;
  } catch (e) {
    console.error('[sync-cv] unexpected error claiming guest CV:', e);
    return false;
  } finally {
    sessionStorage.removeItem('guest_cv_analysis');
    sessionStorage.removeItem('guest_cv_pillar_scores');
    sessionStorage.removeItem('guest_cv_filename');
    sessionStorage.removeItem('guest_cv_consent');
  }
};
