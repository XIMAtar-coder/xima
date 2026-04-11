import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, Plus, Briefcase, Bug, Info, ChevronDown } from 'lucide-react';
import { CandidateEngagement } from '@/components/business/CandidateEngagement';
import { HiringGoalCard } from '@/components/business/HiringGoalCard';
import { HiringGoalOverviewCard } from '@/components/business/HiringGoalOverviewCard';
import { ActiveChallengesOverview } from '@/components/business/ActiveChallengesOverview';
import { BusinessCommandCenter } from '@/components/business/BusinessCommandCenter';
import { CompanyIdentityCard } from '@/components/business/CompanyIdentityCard';
import { TeamIntelligenceCard } from '@/components/business/TeamIntelligenceCard';
import { RecommendationDebugPanel } from '@/components/business/RecommendationDebugPanel';
import { ImportJobModal } from '@/components/business/ImportJobModal';
import { DiscoveredPositionsBanner } from '@/components/business/DiscoveredPositionsBanner';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useChallengeStatsMap } from '@/hooks/useChallengeResponsesData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HowXimaWorksExplainer } from '@/components/business/HowXimaWorksExplainer';

const isDev = import.meta.env.DEV;

interface ActiveChallengeWithStats {
  id: string;
  title: string;
  hiring_goal_id: string | null;
  hiring_goal_title: string | null;
  invited_count: number;
  responses_count: number;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
}

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    shortlisted: 0,
    activeChallenges: 0,
    completedChallenges: 0
  });
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { businessProfile, isLoading: businessProfileLoading } = useBusinessProfile();
  const [hiringGoalStatus, setHiringGoalStatus] = useState<'none' | 'draft' | 'completed'>('none');
  const [hiringGoalDraftId, setHiringGoalDraftId] = useState<string | null>(null);
  const [hiringGoalLoading, setHiringGoalLoading] = useState(true);
  const [activeChallengesBase, setActiveChallengesBase] = useState<{id: string; title: string; hiring_goal_id: string | null; hiring_goal_title: string | null; created_at: string; start_at: string | null; end_at: string | null; status: string}[]>([]);
  const [activeChallengesLoading, setActiveChallengesLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const { goals: hiringGoals, loading: hiringGoalsLoading, updateGoalStatus, createGoal, refetch: refetchGoals } = useHiringGoals();

  const challengeIds = useMemo(() => activeChallengesBase.map(c => c.id), [activeChallengesBase]);
  const { statsMap, loading: statsLoading, debug: statsDebug } = useChallengeStatsMap(user?.id, challengeIds);

  const activeChallengesWithStats: ActiveChallengeWithStats[] = useMemo(() => {
    return activeChallengesBase.map(challenge => {
      const s = statsMap.get(challenge.id);
      return {
        ...challenge,
        invited_count: s?.invited || 0,
        responses_count: s?.responses || 0,
      };
    });
  }, [activeChallengesBase, statsMap]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/business/login'); return; }
    if (businessLoading) return;
    if (!isBusiness) {
      toast({ title: t('business.dashboard.access_denied'), description: t('business.dashboard.no_access'), variant: 'destructive' });
      navigate('/login');
      return;
    }
    loadCompanyProfile();
    loadHiringGoalStatus();
    loadActiveChallengesBase();
  }, [isAuthenticated, isBusiness, businessLoading, navigate, toast, t]);

  useEffect(() => {
    if (!hiringGoalLoading && user?.id) loadDashboardStats();
  }, [hiringGoalLoading, hiringGoalDraftId, hiringGoalStatus, user?.id]);

  const loadActiveChallengesBase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: challenges, error } = await supabase
        .from('business_challenges')
        .select('id, title, hiring_goal_id, created_at, start_at, end_at, status')
        .eq('business_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) { console.error('[Dashboard] Error fetching active challenges:', error); return; }
      if (!challenges || challenges.length === 0) { setActiveChallengesBase([]); return; }
      const goalIds = challenges.map(c => c.hiring_goal_id).filter(Boolean) as string[];
      let goalsMap: Record<string, string> = {};
      if (goalIds.length > 0) {
        const { data: goals } = await supabase.from('hiring_goal_drafts').select('id, role_title').in('id', goalIds);
        if (goals) goalsMap = goals.reduce((acc, g) => ({ ...acc, [g.id]: g.role_title || 'Untitled Goal' }), {});
      }
      setActiveChallengesBase(challenges.map(challenge => ({
        id: challenge.id, title: challenge.title, hiring_goal_id: challenge.hiring_goal_id,
        hiring_goal_title: challenge.hiring_goal_id ? goalsMap[challenge.hiring_goal_id] || null : null,
        created_at: challenge.created_at || '', start_at: challenge.start_at || null, end_at: challenge.end_at || null, status: challenge.status || 'active'
      })));
    } catch (err) { console.error('[Dashboard] Error loading active challenges:', err); } finally { setActiveChallengesLoading(false); }
  };

  const loadHiringGoalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('hiring_goal_drafts').select('id, status').eq('business_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) { console.error('[Dashboard] Error fetching hiring goal:', error); setHiringGoalStatus('none'); return; }
      if (!data) { setHiringGoalStatus('none'); setHiringGoalDraftId(null); }
      else if (data.status === 'completed') { setHiringGoalStatus('completed'); setHiringGoalDraftId(data.id); }
      else { setHiringGoalStatus('draft'); setHiringGoalDraftId(data.id); }
    } catch (err) { console.error('[Dashboard] Error loading hiring goal status:', err); setHiringGoalStatus('none'); setHiringGoalDraftId(null); } finally { setHiringGoalLoading(false); }
  };

  const loadDashboardStats = async () => {
    try {
      const { count: candidatesCount } = await supabase.from('assessment_results').select('*', { count: 'exact', head: true });
      let shortlistedCount = 0;
      if (hiringGoalDraftId && hiringGoalStatus === 'completed') {
        const { count } = await supabase.from('business_shortlists').select('*', { count: 'exact', head: true }).eq('business_id', user?.id).eq('hiring_goal_id', hiringGoalDraftId);
        shortlistedCount = count || 0;
      } else {
        const { count } = await supabase.from('business_shortlists').select('*', { count: 'exact', head: true }).eq('business_id', user?.id);
        shortlistedCount = count || 0;
      }
      const { count: activeChallengesCount } = await supabase.from('business_challenges').select('*', { count: 'exact', head: true }).eq('business_id', user?.id).gte('deadline', new Date().toISOString());
      const { data: businessChallenges } = await supabase.from('business_challenges').select('id').eq('business_id', user?.id);
      const cIds = businessChallenges?.map(c => c.id) || [];
      let completedCount = 0;
      if (cIds.length > 0) {
        const { count } = await supabase.from('candidate_challenges').select('*', { count: 'exact', head: true }).eq('status', 'completed').in('challenge_id', cIds);
        completedCount = count || 0;
      }
      setStats({ totalCandidates: candidatesCount || 0, shortlisted: shortlistedCount, activeChallenges: activeChallengesCount || 0, completedChallenges: completedCount || 0 });
    } catch (error) { console.error('Error loading dashboard stats:', error); } finally { setLoading(false); }
  };

  const loadCompanyProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('company_profiles').select('*').eq('company_id', user.id).maybeSingle();
      if (error && error.code !== 'PGRST116') console.error('Error loading company profile:', error);
      else setCompanyProfile(data);
    } catch (error) { console.error('Error loading company profile:', error); } finally { setProfileLoading(false); }
  };

  const handleGenerateProfile = async () => {
    if (!user?.id || !businessProfile) {
      toast({ title: t('business.dashboard.error'), description: t('business.dashboard.missing_info'), variant: 'destructive' });
      return;
    }
    setProfileLoading(true);
    toast({ title: t('business.dashboard.generating_profile'), description: t('business.dashboard.generating_profile_desc') });
    try {
      const { data, error } = await supabase.functions.invoke('generate-company-profile', {
        body: {
          company_id: user.id,
          company_name: businessProfile.company_name,
          website: businessProfile.website,
        }
      });
      if (error) throw error;
      toast({ title: t('business.dashboard.success'), description: t('business.dashboard.profile_generated') });
      await loadCompanyProfile();
    } catch (error: any) {
      console.error('Error generating profile:', error);
      toast({ title: t('business.dashboard.generation_failed'), description: error.message || t('business.dashboard.generation_failed_desc'), variant: 'destructive' });
    } finally { setProfileLoading(false); }
  };

  const pendingReviewsCount = useMemo(() => activeChallengesWithStats.reduce((sum, c) => sum + c.responses_count, 0), [activeChallengesWithStats]);
  const candidatesInPipelineCount = useMemo(() => activeChallengesWithStats.reduce((sum, c) => sum + c.invited_count, 0), [activeChallengesWithStats]);

  const attentionItems = useMemo(() => {
    const items: { type: 'review' | 'expiring' | 'followup'; count: number; label: string; link: string }[] = [];
    if (pendingReviewsCount > 0) {
      items.push({ type: 'review', count: pendingReviewsCount, label: t('business.command_center.attention.reviews_waiting', { count: pendingReviewsCount }), link: hiringGoalDraftId ? `/business/goals/${hiringGoalDraftId}/challenges` : '/business/challenges' });
    }
    const expiringChallenges = activeChallengesWithStats.filter(c => {
      if (!c.end_at) return false;
      const daysUntilEnd = (new Date(c.end_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 3 && daysUntilEnd > 0;
    });
    if (expiringChallenges.length > 0) {
      items.push({ type: 'expiring', count: expiringChallenges.length, label: t('business.command_center.attention.challenge_expiring', { count: expiringChallenges.length }), link: '/business/challenges' });
    }
    return items;
  }, [pendingReviewsCount, activeChallengesWithStats, hiringGoalDraftId, t]);

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('business.dashboard.loading')}</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Section 1: Company Identity Card (with collapsible AI profile) */}
        <CompanyIdentityCard
          businessProfile={businessProfile}
          companyProfile={companyProfile}
          profileStatus={profileLoading ? 'loading' : 'ready'}
          onGenerate={handleGenerateProfile}
        />

        {/* Discovered positions from website scan */}
        <DiscoveredPositionsBanner businessId={user?.id} />

        {/* Section 2: Hiring Pipeline */}
        <BusinessCommandCenter
          stats={{
            activeChallenges: stats.activeChallenges,
            pendingReviews: pendingReviewsCount,
            candidatesInPipeline: candidatesInPipelineCount,
            shortlisted: stats.shortlisted
          }}
          attentionItems={attentionItems}
          loading={loading || statsLoading}
          hiringGoalId={hiringGoalDraftId}
          onImportJob={() => setShowImportModal(true)}
        />

        {/* Import Job Modal */}
        <ImportJobModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImported={() => { navigate('/business/jobs'); }}
          businessId={user?.id || ''}
          companyName={businessProfile?.company_name || ''}
        />

        {/* Section 3: Team Intelligence + Candidate Engagement side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamIntelligenceCard
            businessId={user?.id}
            teamCulture={businessProfile?.team_culture || (businessProfile?.metadata as any)?.team_culture}
            recommendedXimatars={companyProfile?.recommended_ximatars || []}
          />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">{t('businessPortal.candidate_engagement_title', 'Candidate Engagement')}</h3>
            <CandidateEngagement />
          </div>
        </div>

        {/* Active Challenges Overview */}
        <ActiveChallengesOverview 
          challenges={activeChallengesWithStats} 
          loading={activeChallengesLoading || statsLoading} 
        />

        {/* DEV Debug Panel */}
        {isDev && activeChallengesBase.length > 0 && (
          <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-600 flex-wrap">
                <Bug className="h-3 w-3" />
                <span>DEV Challenge Stats:</span>
                {activeChallengesBase.slice(0, 3).map(c => {
                  const s = statsDebug[c.id];
                  return (
                    <span key={c.id} className="bg-amber-500/10 px-1 rounded">
                      {c.title.slice(0, 15)}... inv={s?.invCount || 0} sub={s?.subCount || 0}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hiring Goal Card */}
        {!hiringGoalLoading && hiringGoalStatus !== 'completed' && (
          <HiringGoalCard 
            key={hiringGoalDraftId || 'new'}
            draftId={hiringGoalDraftId}
            onComplete={() => loadHiringGoalStatus()} 
          />
        )}

        {!hiringGoalLoading && hiringGoalStatus === 'completed' && (
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{t('businessPortal.hiring_goal_saved_title')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('businessPortal.hiring_goal_saved_body')}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className="gap-2" onClick={() => navigate(`/business/candidates?fromGoal=${hiringGoalDraftId}`)}>
                      <Users className="h-4 w-4" />
                      {t('businessPortal.hiring_goal_generate_shortlist')}
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      if (hiringGoalDraftId) await supabase.from('hiring_goal_drafts').update({ status: 'draft' }).eq('id', hiringGoalDraftId);
                      await loadHiringGoalStatus();
                    }}>
                      {t('businessPortal.hiring_goal_edit')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hiring Goals Portfolio */}
        {(() => {
          const activeGoals = hiringGoals.filter(goal => goal.status === 'active');
          const hasActiveChallenges = activeChallengesWithStats.length > 0;
          const showEmptyState = activeGoals.length === 0 && !hasActiveChallenges && !activeChallengesLoading;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{t('businessPortal.hiring_goals_title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('businessPortal.hiring_goals_subtitle')}</p>
                </div>
                <Button onClick={async () => { const newGoal = await createGoal(); if (newGoal) toast({ title: t('business.goals.created'), description: t('business.goals.created_desc') }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('businessPortal.hiring_goals_new_cta')}
                </Button>
              </div>
              {activeGoals.length > 0 ? (
                <div className="space-y-3">
                  {activeGoals.map((goal) => (
                    <HiringGoalOverviewCard key={goal.id} goal={goal} onStatusChange={updateGoalStatus} />
                  ))}
                </div>
              ) : showEmptyState ? (
                <Card className="border-dashed border-2 border-muted-foreground/30">
                  <CardContent className="p-8 text-center">
                    <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t('business.goals.no_active_title')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t('business.goals.no_active_desc')}</p>
                    <Button onClick={async () => { const newGoal = await createGoal(); if (newGoal) toast({ title: t('business.goals.created'), description: t('business.goals.created_desc') }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('business.goals.create_first')}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          );
        })()}

        {/* Recommendation Debug Panel — DEV only */}
        {isDev && <RecommendationDebugPanel businessId={user?.id} hiringGoalId={hiringGoalDraftId} />}

        {/* How XIMA Works — interactive explainer */}
        <HowXimaWorksExplainer />
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;
