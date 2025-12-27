import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CandidateLevelProgress, 
  ChallengeLevel, 
  computeLevelProgress,
  getChallengeLevel 
} from '@/lib/challenges/challengeLevels';

interface SubmissionData {
  status: string;
  challenge_level?: ChallengeLevel;
  challenge?: {
    rubric?: { type?: string } | null;
  };
}

/**
 * Hook to fetch and compute a candidate's level progress for a specific hiring goal
 */
export function useCandidateLevelProgress(
  candidateProfileId: string | undefined,
  hiringGoalId: string | undefined
) {
  const [progress, setProgress] = useState<CandidateLevelProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!candidateProfileId || !hiringGoalId) {
      setProgress(null);
      return;
    }

    setLoading(true);
    try {
      // Fetch all submissions for this candidate + goal
      const { data: submissions, error } = await supabase
        .from('challenge_submissions')
        .select(`
          status,
          challenge:business_challenges(rubric)
        `)
        .eq('candidate_profile_id', candidateProfileId)
        .eq('hiring_goal_id', hiringGoalId);

      if (error) {
        console.error('Error fetching submissions for level progress:', error);
        setProgress(null);
        return;
      }

      // Map submissions to include challenge level
      const mappedSubmissions: SubmissionData[] = (submissions || []).map((sub: any) => ({
        status: sub.status,
        challenge_level: getChallengeLevel(sub.challenge),
      }));

      const computed = computeLevelProgress(mappedSubmissions);
      setProgress(computed);
    } catch (err) {
      console.error('Error computing level progress:', err);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [candidateProfileId, hiringGoalId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, refresh: fetchProgress };
}

/**
 * Hook to batch-fetch level progress for multiple candidates
 */
export function useCandidatesLevelProgress(
  candidateProfileIds: string[],
  hiringGoalId: string | undefined
) {
  const [progressMap, setProgressMap] = useState<Map<string, CandidateLevelProgress>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchAllProgress = useCallback(async () => {
    if (!hiringGoalId || candidateProfileIds.length === 0) {
      setProgressMap(new Map());
      return;
    }

    setLoading(true);
    try {
      // Fetch all submissions for these candidates in this goal
      const { data: submissions, error } = await supabase
        .from('challenge_submissions')
        .select(`
          candidate_profile_id,
          status,
          challenge:business_challenges(rubric)
        `)
        .eq('hiring_goal_id', hiringGoalId)
        .in('candidate_profile_id', candidateProfileIds);

      if (error) {
        console.error('Error fetching batch submissions:', error);
        setProgressMap(new Map());
        return;
      }

      // Group submissions by candidate
      const grouped = new Map<string, SubmissionData[]>();
      (submissions || []).forEach((sub: any) => {
        const profileId = sub.candidate_profile_id;
        if (!grouped.has(profileId)) {
          grouped.set(profileId, []);
        }
        grouped.get(profileId)!.push({
          status: sub.status,
          challenge_level: getChallengeLevel(sub.challenge),
        });
      });

      // Compute progress for each candidate
      const result = new Map<string, CandidateLevelProgress>();
      candidateProfileIds.forEach(profileId => {
        const subs = grouped.get(profileId) || [];
        result.set(profileId, computeLevelProgress(subs));
      });

      setProgressMap(result);
    } catch (err) {
      console.error('Error computing batch level progress:', err);
      setProgressMap(new Map());
    } finally {
      setLoading(false);
    }
  }, [candidateProfileIds.join(','), hiringGoalId]);

  useEffect(() => {
    fetchAllProgress();
  }, [fetchAllProgress]);

  return { progressMap, loading, refresh: fetchAllProgress };
}
