import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { getChallengeTimeInfo, ChallengeTimeStatus } from '@/utils/challengeTimeUtils';
import { 
  ChallengeLevel, 
  CandidateLevelProgress, 
  getChallengeLevel, 
  computeLevelProgress 
} from '@/lib/challenges/challengeLevels';

export interface CandidateChallenge {
  invitationId: string;
  challengeId: string;
  challengeTitle: string;
  companyName: string;
  roleTitle: string | null;
  hiringGoalId: string;
  businessId: string;
  status: 'invited' | 'accepted' | 'declined' | 'submitted';
  timeStatus: 'upcoming' | 'active' | 'expired' | 'archived';
  remainingText: string | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  isSubmitted: boolean;
  level: ChallengeLevel;
  rubricType: string | null;
  isLocked: boolean;
  prerequisiteInvitationId: string | null;
}

export const useCandidateChallenges = () => {
  const { user, isAuthenticated } = useUser();
  const [challenges, setChallenges] = useState<CandidateChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  const fetchChallenges = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get profile_id for current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get all invitations with challenge and business info
      const { data: invitations, error } = await supabase
        .from('challenge_invitations')
        .select(`
          id,
          challenge_id,
          status,
          created_at,
          business_id,
          hiring_goal_id,
          business_challenges!challenge_invitations_challenge_id_fkey (
            id,
            title,
            start_at,
            end_at,
            status,
            rubric
          ),
          hiring_goal_drafts!challenge_invitations_hiring_goal_id_fkey (
            role_title
          )
        `)
        .eq('candidate_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get business profiles for company names
      const businessIds = [...new Set((invitations || []).map(i => i.business_id).filter(Boolean))];
      
      // Fetch business info
      let businessMap: Record<string, string> = {};
      if (businessIds.length > 0) {
        const { data: businesses } = await supabase
          .from('business_profiles')
          .select('user_id, company_name')
          .in('user_id', businessIds);
        
        (businesses || []).forEach(b => {
          businessMap[b.user_id] = b.company_name;
        });
      }

      // Check for submitted challenges
      const invitationIds = (invitations || []).map(i => i.id);
      let submittedMap: Record<string, boolean> = {};
      
      if (invitationIds.length > 0) {
        const { data: submissions } = await supabase
          .from('challenge_submissions')
          .select('invitation_id, status')
          .in('invitation_id', invitationIds)
          .eq('status', 'submitted');
        
        (submissions || []).forEach(s => {
          submittedMap[s.invitation_id] = true;
        });
      }

      // Pre-compute level info for all invitations to find prerequisites
      const invitationLevelMap = new Map<string, { level: ChallengeLevel; businessId: string; hiringGoalId: string }>();
      (invitations || []).forEach(inv => {
        const challenge = inv.business_challenges as any;
        const rubric = challenge?.rubric as { type?: string } | null;
        const level = getChallengeLevel({ rubric, title: challenge?.title });
        invitationLevelMap.set(inv.id, {
          level,
          businessId: inv.business_id,
          hiringGoalId: inv.hiring_goal_id,
        });
      });

      const challengeList: CandidateChallenge[] = (invitations || []).map(inv => {
        const challenge = inv.business_challenges as any;
        const goal = inv.hiring_goal_drafts as any;
        const rubric = challenge?.rubric as { type?: string } | null;
        const timeInfo = getChallengeTimeInfo(
          challenge?.start_at || null,
          challenge?.end_at || null,
          challenge?.status || 'active'
        );

        // Determine challenge level
        const level = getChallengeLevel({ rubric, title: challenge?.title });

        // Compute if locked (prerequisite not submitted) for same business + hiring goal
        let isLocked = false;
        let prerequisiteInvitationId: string | null = null;
        const prerequisiteLevel: ChallengeLevel | null = level === 2 ? 1 : level === 3 ? 2 : null;

        if (prerequisiteLevel) {
          // Find prerequisite invitation for same business + hiring goal
          const prereqInv = (invitations || []).find(i => {
            const info = invitationLevelMap.get(i.id);
            return info &&
              info.level === prerequisiteLevel &&
              info.businessId === inv.business_id &&
              info.hiringGoalId === inv.hiring_goal_id;
          });

          if (prereqInv) {
            prerequisiteInvitationId = prereqInv.id;
            // Check if prerequisite is submitted
            if (!submittedMap[prereqInv.id]) {
              isLocked = true;
            }
          } else {
            // No prerequisite invitation found - still locked
            isLocked = true;
          }
        }

        return {
          invitationId: inv.id,
          challengeId: inv.challenge_id || '',
          challengeTitle: challenge?.title || 'Challenge',
          companyName: businessMap[inv.business_id] || 'Company',
          roleTitle: goal?.role_title || null,
          hiringGoalId: inv.hiring_goal_id,
          businessId: inv.business_id,
          status: submittedMap[inv.id] ? 'submitted' : (inv.status as 'invited' | 'accepted' | 'declined'),
          timeStatus: timeInfo.timeStatus,
          remainingText: timeInfo.remainingText,
          startAt: challenge?.start_at || null,
          endAt: challenge?.end_at || null,
          createdAt: inv.created_at,
          isSubmitted: !!submittedMap[inv.id],
          level,
          rubricType: rubric?.type || null,
          isLocked,
          prerequisiteInvitationId,
        };
      });

      setChallenges(challengeList);
      setActiveCount(challengeList.filter(c => 
        c.timeStatus === 'active' && 
        !c.isSubmitted && 
        c.status !== 'declined'
      ).length);
    } catch (err) {
      console.error('Error fetching candidate challenges:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Compute level progress based on submitted challenges
  // Group by hiring goal and compute progress for each
  const levelProgressByGoal = useMemo(() => {
    const byGoal: Record<string, CandidateLevelProgress> = {};
    
    const goalIds = [...new Set(challenges.map(c => c.hiringGoalId))];
    
    for (const goalId of goalIds) {
      const goalChallenges = challenges.filter(c => c.hiringGoalId === goalId);
      const submissions = goalChallenges.map(c => ({
        challenge_level: c.level,
        status: c.isSubmitted ? 'submitted' : 'draft',
      }));
      byGoal[goalId] = computeLevelProgress(submissions);
    }
    
    return byGoal;
  }, [challenges]);

  // Overall progress (across all goals - for dashboard display)
  const overallProgress = useMemo((): CandidateLevelProgress => {
    const allSubmissions = challenges.map(c => ({
      challenge_level: c.level,
      status: c.isSubmitted ? 'submitted' : 'draft',
    }));
    return computeLevelProgress(allSubmissions);
  }, [challenges]);

  return {
    challenges,
    loading,
    activeCount,
    levelProgressByGoal,
    overallProgress,
    refresh: fetchChallenges,
  };
};
