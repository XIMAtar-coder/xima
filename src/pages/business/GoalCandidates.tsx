import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { SelectionActionBar } from '@/components/business/SelectionActionBar';
import { ChallengePickerModal } from '@/components/business/ChallengePickerModal';
import { XimatarCandidateCard } from '@/components/business/XimatarCandidateCard';
import { NoChallengeGate } from '@/components/business/NoChallengeGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { supabase } from '@/integrations/supabase/client';
import { Users, Target, RefreshCw, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';

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
}

const GoalCandidates: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { goals, loading: goalsLoading } = useHiringGoals();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Modal state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState<string[]>([]);

  const currentGoal = goals.find(g => g.id === goalId) || null;

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

      // Fetch active challenges for this goal
      const { data: challengeData } = await supabase
        .from('business_challenges')
        .select('id, title, updated_at')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .eq('status', 'active');

      setActiveChallenges(challengeData || []);
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

  const handleInviteToChallenge = async (profileIds: string[], challengeId: string) => {
    if (!goalId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let successCount = 0;
    for (const profileId of profileIds) {
      // Check if already invited
      const { data: existing } = await supabase
        .from('challenge_invitations')
        .select('id')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .eq('candidate_profile_id', profileId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('challenge_invitations')
          .insert({
            business_id: user.id,
            hiring_goal_id: goalId,
            candidate_profile_id: profileId,
            challenge_id: challengeId,
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

  const handleBulkInviteClick = () => {
    if (selectedIds.size === 0) return;
    
    if (activeChallenges.length === 0) {
      toast({
        title: t('business.invite.no_challenge_title'),
        description: t('business.invite.no_challenge_desc'),
        variant: 'destructive'
      });
      return;
    }

    if (activeChallenges.length === 1) {
      handleInviteToChallenge(Array.from(selectedIds), activeChallenges[0].id);
    } else {
      setPendingInviteIds(Array.from(selectedIds));
      setShowChallengeModal(true);
    }
  };

  const handleSingleInvite = (profileId: string) => {
    if (activeChallenges.length === 0) {
      toast({
        title: t('business.invite.no_challenge_title'),
        description: t('business.invite.no_challenge_desc'),
        variant: 'destructive'
      });
      return;
    }

    if (activeChallenges.length === 1) {
      handleInviteToChallenge([profileId], activeChallenges[0].id);
    } else {
      setPendingInviteIds([profileId]);
      setShowChallengeModal(true);
    }
  };

  const handleChallengeSelect = (challengeId: string) => {
    handleInviteToChallenge(pendingInviteIds, challengeId);
    setShowChallengeModal(false);
    setPendingInviteIds([]);
  };

  const getInvitationStatus = (profileId: string): 'none' | 'invited' | 'accepted' => {
    if (acceptedIds.has(profileId)) return 'accepted';
    if (invitedIds.has(profileId)) return 'invited';
    return 'none';
  };

  const filteredCandidates = activeTab === 'saved'
    ? candidates.filter(c => shortlistedIds.has(c.profile_id))
    : candidates;

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
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              {t('business.candidates.all_matches')}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-4 w-4" />
              {t('business.candidates.saved')} ({shortlistedIds.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
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
                  inviteDisabled={activeChallenges.length === 0}
                  inviteDisabledReason={activeChallenges.length === 0 ? t('business.invite.no_challenge_desc') : undefined}
                  onSelect={(checked) => toggleSelection(candidate.profile_id, checked)}
                  onToggleShortlist={() => toggleShortlist(candidate.profile_id)}
                  onInviteToChallenge={() => handleSingleInvite(candidate.profile_id)}
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
                  inviteDisabled={activeChallenges.length === 0}
                  inviteDisabledReason={activeChallenges.length === 0 ? t('business.invite.no_challenge_desc') : undefined}
                  onSelect={(checked) => toggleSelection(candidate.profile_id, checked)}
                  onToggleShortlist={() => toggleShortlist(candidate.profile_id)}
                  onInviteToChallenge={() => handleSingleInvite(candidate.profile_id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Challenge picker modal */}
        <ChallengePickerModal
          open={showChallengeModal}
          onOpenChange={setShowChallengeModal}
          challenges={activeChallenges}
          selectedCount={pendingInviteIds.length}
          onConfirm={handleChallengeSelect}
        />
      </div>
    </BusinessLayout>
  );
};

export default GoalCandidates;
