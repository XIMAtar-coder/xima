import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { PipelineView } from '@/components/business/PipelineView';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { SelectionActionBar } from '@/components/business/SelectionActionBar';
// ChallengePickerModal removed - pipeline always starts with XIMA Core (L1)
import { XimatarCandidateCard, XimatarRecommendationExplanation } from '@/components/business/XimatarCandidateCard';
import { NoChallengeGate } from '@/components/business/NoChallengeGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useHiringGoalRequirements } from '@/hooks/useHiringGoalRequirements';
import { supabase } from '@/integrations/supabase/client';
import { getChallengeLevel } from '@/lib/challenges/challengeLevels';
import { computeXimatarRecommendations, type XimatarRecommendation } from '@/lib/recommendations';
import { Users, Target, RefreshCw, Bookmark, Sparkles, Zap, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShortlistView } from '@/components/business/ShortlistView';

interface Candidate {
  profile_id: string;
  user_id: string;
  display_name: string;
  ximatar_id: string | null;
  ximatar_label: string;
  ximatar_image: string;
  pillar_average: number;
  evaluation_score: number;
  computational_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
}

interface ActiveChallenge {
  id: string;
  title: string;
  updated_at: string;
  rubric?: unknown;
}

const GoalCandidates: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { goals, loading: goalsLoading } = useHiringGoals();
  const { requirements, hasRequirements } = useHiringGoalRequirements(goalId);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [eligibleIds, setEligibleIds] = useState<Set<string>>(new Set());
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shortlist');
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  
  // Modal state (legacy - keeping for potential future use)

  const currentGoal = goals.find(g => g.id === goalId) || null;
  const requiresEligibility = hasRequirements();

  const fetchCandidates = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch candidates via RPC
      const { data: candidateData, error: candidateError } = await supabase
        .rpc('get_candidate_visibility');

      if (candidateError) {
        console.error('Error fetching candidates:', candidateError);
        return;
      }

      setCandidates((candidateData || []).map((c: any) => ({
        profile_id: c.profile_id,
        user_id: c.user_id,
        display_name: c.display_name,
        ximatar_id: c.ximatar_id,
        ximatar_label: c.ximatar_label || 'Unknown',
        ximatar_image: c.ximatar_image || '/placeholder.svg',
        pillar_average: c.pillar_average || 0,
        evaluation_score: c.evaluation_score || 0,
        computational_power: c.computational_power || 0,
        communication: c.communication || 0,
        knowledge: c.knowledge || 0,
        creativity: c.creativity || 0,
        drive: c.drive || 0,
      })));

      // Fetch shortlisted IDs for this goal
      const { data: shortlistData } = await supabase
        .from('business_shortlists')
        .select('candidate_profile_id')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId);

      setShortlistedIds(new Set(shortlistData?.map(s => s.candidate_profile_id) || []));

      // Fetch invitation statuses
      const { data: inviteData } = await supabase
        .from('challenge_invitations')
        .select('candidate_profile_id, status')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId);

      const invited = new Set<string>();
      const accepted = new Set<string>();
      inviteData?.forEach(inv => {
        if (inv.status === 'accepted') {
          accepted.add(inv.candidate_profile_id);
        } else {
          invited.add(inv.candidate_profile_id);
        }
      });
      setInvitedIds(invited);
      setAcceptedIds(accepted);

      // Fetch active challenges for this goal (include rubric for level detection)
      const { data: challengeData } = await supabase
        .from('business_challenges')
        .select('id, title, updated_at, rubric')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .eq('status', 'active');

      setActiveChallenges(challengeData || []);

      // Fetch eligibility statuses for candidates
      const { data: eligibilityData } = await supabase
        .from('candidate_eligibility')
        .select('candidate_profile_id, status')
        .eq('hiring_goal_id', goalId)
        .eq('status', 'eligible');

      setEligibleIds(new Set(eligibilityData?.map(e => e.candidate_profile_id) || []));

      // Fetch company profile for recommendation explanations
      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_id', user.id)
        .maybeSingle();
      
      setCompanyProfile(companyData);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleGoalSwitch = (newGoalId: string) => {
    navigate(`/business/goals/${newGoalId}/candidates`);
  };

  const toggleShortlist = async (profileId: string) => {
    if (!goalId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isShortlisted = shortlistedIds.has(profileId);

    if (isShortlisted) {
      await supabase
        .from('business_shortlists')
        .delete()
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .eq('candidate_profile_id', profileId);
      
      setShortlistedIds(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    } else {
      await supabase
        .from('business_shortlists')
        .insert({
          business_id: user.id,
          hiring_goal_id: goalId,
          candidate_profile_id: profileId
        });
      
      setShortlistedIds(prev => new Set([...prev, profileId]));
    }
  };

  const toggleSelection = (profileId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(profileId);
      } else {
        next.delete(profileId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Find the active XIMA Core (Level 1) challenge for this goal
  const getXimaCoreChallenge = async (userId: string) => {
    const { data: allChallenges } = await supabase
      .from('business_challenges')
      .select('id, rubric, title')
      .eq('business_id', userId)
      .eq('hiring_goal_id', goalId)
      .in('status', ['active', 'published']);

    const l1Challenge = allChallenges?.find(c => {
      // Pass rubric and title for full detection
      const rubric = c.rubric as { type?: string; isXimaCore?: boolean; level?: number } | null;
      return getChallengeLevel({ rubric, title: c.title }) === 1;
    });
    return l1Challenge || null;
  };

  // Invite candidates to XIMA Core (Level 1) - primary action
  const handleInviteToXimaCore = async (profileIds: string[]) => {
    if (!goalId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const l1Challenge = await getXimaCoreChallenge(user.id);
    
    if (!l1Challenge) {
      toast({
        title: t('business.invite.no_xima_core_title', 'No XIMA Core challenge'),
        description: t('business.invite.no_xima_core_desc', 'Create an active XIMA Core (Level 1) challenge first.'),
        variant: 'destructive'
      });
      return;
    }

    let successCount = 0;
    for (const profileId of profileIds) {
      // Check if already invited to this L1 challenge
      const { data: existingInvitation } = await supabase
        .from('challenge_invitations')
        .select('id')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .eq('candidate_profile_id', profileId)
        .eq('challenge_id', l1Challenge.id)
        .maybeSingle();

      if (!existingInvitation) {
        const { error } = await supabase
          .from('challenge_invitations')
          .insert({
            business_id: user.id,
            hiring_goal_id: goalId,
            candidate_profile_id: profileId,
            challenge_id: l1Challenge.id,
            status: 'invited',
            sent_via: ['platform']
          });

        if (!error) successCount++;
      }
    }

    toast({
      title: t('business.invite.success_title'),
      description: t('business.invite.success_desc', { count: successCount })
    });

    setSelectedIds(new Set());
    await fetchCandidates();
  };

  // Check if there's an active XIMA Core challenge
  const hasXimaCoreChallenge = activeChallenges.some(c => {
    const rubric = (c as any).rubric as { type?: string; isXimaCore?: boolean; level?: number } | null;
    return getChallengeLevel({ rubric, title: c.title }) === 1;
  });

  const handleBulkInviteClick = () => {
    if (selectedIds.size === 0) return;
    // Primary action: Always invite to XIMA Core (Level 1) - the pipeline entry point
    handleInviteToXimaCore(Array.from(selectedIds));
  };

  const handleSingleInvite = (profileId: string) => {
    // Primary action: Always invite to XIMA Core (Level 1) - the pipeline entry point
    handleInviteToXimaCore([profileId]);
  };

  const getInvitationStatus = (profileId: string): 'none' | 'invited' | 'accepted' => {
    if (acceptedIds.has(profileId)) return 'accepted';
    if (invitedIds.has(profileId)) return 'invited';
    return 'none';
  };

  const getInviteDisabledReason = (profileId: string): string | undefined => {
    if (activeChallenges.length === 0) {
      return t('business.invite.no_challenge_desc');
    }
    if (requiresEligibility && !eligibleIds.has(profileId)) {
      return t('eligibility.not_verified');
    }
    return undefined;
  };

  const isInviteDisabled = (profileId: string): boolean => {
    if (activeChallenges.length === 0) return true;
    if (requiresEligibility && !eligibleIds.has(profileId)) return true;
    return false;
  };

  const filteredCandidates = activeTab === 'saved'
    ? candidates.filter(c => shortlistedIds.has(c.profile_id))
    : candidates;

  // Compute XIMAtar recommendations with explanations
  const recommendationsMap = useMemo(() => {
    if (!currentGoal) return new Map<string, XimatarRecommendationExplanation>();
    
    const companyContext = {
      ideal_ximatar_profile_ids: companyProfile?.ideal_ximatar_profile_ids,
      pillar_vector: companyProfile?.pillar_vector,
      values: companyProfile?.values,
      ideal_traits: companyProfile?.ideal_traits,
      industry: companyProfile?.snapshot_industry,
    };
    
    const hiringGoalContext = {
      role_title: currentGoal.role_title,
      function_area: currentGoal.function_area,
      experience_level: currentGoal.experience_level,
      task_description: currentGoal.task_description,
    };
    
    const result = computeXimatarRecommendations(companyContext, hiringGoalContext);
    
    const map = new Map<string, XimatarRecommendationExplanation>();
    
    for (const rec of result.recommendations) {
      // Generate short reason based on source and matches
      let shortReason = '';
      if (rec.source === 'company_constraint') {
        shortReason = t('business.recommendations.matches_ideal_profile', 'Matches your ideal profile set');
      } else if (rec.matched_skills.length > 0) {
        const topSkills = rec.matched_skills.slice(0, 2).join(', ');
        shortReason = t('business.recommendations.top_skill_match', { skills: topSkills, defaultValue: `Top skill match: ${topSkills}` });
      } else if (rec.matched_industries.length > 0) {
        shortReason = t('business.recommendations.industry_match', { industry: rec.matched_industries[0], defaultValue: `Industry match: ${rec.matched_industries[0]}` });
      } else {
        shortReason = t('business.recommendations.general_fit', 'General fit for this role');
      }
      
      map.set(rec.ximatar_id, {
        shortReason,
        source: rec.source,
        matchedSkills: rec.matched_skills,
        matchedKeywords: rec.matched_keywords,
        matchedIndustries: rec.matched_industries,
        scoreBreakdown: rec.score_breakdown,
      });
    }
    
    return map;
  }, [currentGoal, companyProfile, t]);

  if (goalsLoading || loading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <GoalContextHeader
          currentGoal={currentGoal}
          allGoals={goals}
          onGoalSwitch={handleGoalSwitch}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('business.candidates.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('business.candidates.subtitle')}
            </p>
          </div>
          <Button variant="outline" onClick={fetchCandidates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('business.candidates.refresh')}
          </Button>
        </div>

        {/* Active challenges info */}
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t('business.candidates.active_challenges')}: <strong>{activeChallenges.length}</strong>
              </span>
            </div>
            <Link to={`/business/goals/${goalId}/challenges`}>
              <Button variant="link" size="sm">
                {t('business.candidates.manage_challenges')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* No challenge gate */}
        {activeChallenges.length === 0 && (
          <NoChallengeGate 
            goalId={goalId}
            onViewSaved={() => setActiveTab('saved')}
          />
        )}

        {/* Selection action bar */}
        <SelectionActionBar
          selectedCount={selectedIds.size}
          activeChallengeCount={activeChallenges.length}
          onInvite={handleBulkInviteClick}
          onClear={clearSelection}
          inviteDisabled={activeChallenges.length === 0}
          inviteDisabledReason={activeChallenges.length === 0 ? t('business.invite.no_challenge_desc') : undefined}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="shortlist" className="gap-2">
              <Zap className="h-4 w-4" />
              {t('shortlist.tab_label', 'AI Shortlist')}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <GitBranch className="h-4 w-4" />
              {t('anonymous.pipeline_tab', 'Pipeline')}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              {t('business.candidates.all_matches')}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-4 w-4" />
              {t('business.candidates.saved')} ({shortlistedIds.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shortlist" className="mt-6">
            {currentGoal && goalId && (
              <ShortlistView
                goalId={goalId}
                roleTitle={currentGoal.role_title || 'Untitled Role'}
                onInviteToChallenge={(userIds) => {
                  // Map user IDs to profile IDs for the invite flow
                  const profileIds = userIds.map(uid => {
                    const match = candidates.find(c => c.user_id === uid);
                    return match?.profile_id || uid;
                  });
                  handleInviteToXimaCore(profileIds);
                }}
                onViewProfile={() => {/* future: open anonymous profile drawer */}}
              />
            )}
          </TabsContent>

          <TabsContent value="pipeline" className="mt-6">
            {goalId && (
              <PipelineView
                hiringGoalId={goalId}
                onInviteToL1={(userId) => {
                  const match = candidates.find(c => c.user_id === userId);
                  if (match) handleInviteToXimaCore([match.profile_id]);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {/* Recommendation label */}
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>
                {t('business.recommendations.based_on_label', 'Recommended based on your Company Profile + this Hiring Goal')}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCandidates.map((candidate) => (
                <XimatarCandidateCard
                  key={candidate.profile_id}
                  candidateId={candidate.user_id}
                  profileId={candidate.profile_id}
                  displayName={candidate.display_name}
                  ximatarLabel={candidate.ximatar_label}
                  ximatarImage={candidate.ximatar_image}
                  ximatarId={candidate.ximatar_id || undefined}
                  evaluationScore={candidate.evaluation_score}
                  pillarAverage={candidate.pillar_average}
                  pillars={{
                    computational_power: candidate.computational_power,
                    communication: candidate.communication,
                    knowledge: candidate.knowledge,
                    creativity: candidate.creativity,
                    drive: candidate.drive,
                  }}
                  isShortlisted={shortlistedIds.has(candidate.profile_id)}
                  isSelected={selectedIds.has(candidate.profile_id)}
                  showSaveButton={true}
                  invitationStatus={getInvitationStatus(candidate.profile_id)}
                  inviteDisabled={isInviteDisabled(candidate.profile_id)}
                  inviteDisabledReason={getInviteDisabledReason(candidate.profile_id)}
                  onSelect={(checked) => toggleSelection(candidate.profile_id, checked)}
                  onToggleShortlist={() => toggleShortlist(candidate.profile_id)}
                  onInviteToChallenge={() => handleSingleInvite(candidate.profile_id)}
                  recommendationExplanation={candidate.ximatar_id ? recommendationsMap.get(candidate.ximatar_id) : undefined}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCandidates.map((candidate) => (
                <XimatarCandidateCard
                  key={candidate.profile_id}
                  candidateId={candidate.user_id}
                  profileId={candidate.profile_id}
                  displayName={candidate.display_name}
                  ximatarLabel={candidate.ximatar_label}
                  ximatarImage={candidate.ximatar_image}
                  ximatarId={candidate.ximatar_id || undefined}
                  evaluationScore={candidate.evaluation_score}
                  pillarAverage={candidate.pillar_average}
                  pillars={{
                    computational_power: candidate.computational_power,
                    communication: candidate.communication,
                    knowledge: candidate.knowledge,
                    creativity: candidate.creativity,
                    drive: candidate.drive,
                  }}
                  isShortlisted={shortlistedIds.has(candidate.profile_id)}
                  isSelected={selectedIds.has(candidate.profile_id)}
                  showSaveButton={true}
                  invitationStatus={getInvitationStatus(candidate.profile_id)}
                  inviteDisabled={isInviteDisabled(candidate.profile_id)}
                  inviteDisabledReason={getInviteDisabledReason(candidate.profile_id)}
                  onSelect={(checked) => toggleSelection(candidate.profile_id, checked)}
                  onToggleShortlist={() => toggleShortlist(candidate.profile_id)}
                  onInviteToChallenge={() => handleSingleInvite(candidate.profile_id)}
                  recommendationExplanation={candidate.ximatar_id ? recommendationsMap.get(candidate.ximatar_id) : undefined}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Challenge picker modal removed - pipeline always starts with XIMA Core (L1) */}
      </div>
    </BusinessLayout>
  );
};

export default GoalCandidates;
