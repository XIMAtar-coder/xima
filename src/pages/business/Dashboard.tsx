import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Target, CheckCircle, TrendingUp, Plus, Briefcase, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CandidateEngagement } from '@/components/business/CandidateEngagement';
import { HiringGoalCard } from '@/components/business/HiringGoalCard';
import { HiringGoalOverviewCard } from '@/components/business/HiringGoalOverviewCard';
import { ActiveChallengesOverview } from '@/components/business/ActiveChallengesOverview';
import { BusinessCommandCenter } from '@/components/business/BusinessCommandCenter';
import { ProfileToolsCard } from '@/components/business/ProfileToolsCard';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useChallengeStatsMap } from '@/hooks/useChallengeResponsesData';

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
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [hiringGoalStatus, setHiringGoalStatus] = useState<'none' | 'draft' | 'completed'>('none');
  const [hiringGoalDraftId, setHiringGoalDraftId] = useState<string | null>(null);
  const [hiringGoalLoading, setHiringGoalLoading] = useState(true);
  const [activeChallengesBase, setActiveChallengesBase] = useState<{id: string; title: string; hiring_goal_id: string | null; hiring_goal_title: string | null; created_at: string; start_at: string | null; end_at: string | null; status: string}[]>([]);
  const [activeChallengesLoading, setActiveChallengesLoading] = useState(true);
  
  // Hiring Goals portfolio
  const { goals: hiringGoals, loading: hiringGoalsLoading, updateGoalStatus, createGoal, refetch: refetchGoals } = useHiringGoals();

  // Get challenge IDs for the shared stats hook
  const challengeIds = useMemo(() => activeChallengesBase.map(c => c.id), [activeChallengesBase]);
  
  // Use shared invitation-driven stats hook
  const { statsMap, loading: statsLoading, debug: statsDebug } = useChallengeStatsMap(user?.id, challengeIds);

  // Combine base challenges with stats from the shared hook
  const activeChallengesWithStats: ActiveChallengeWithStats[] = useMemo(() => {
    return activeChallengesBase.map(challenge => {
      const stats = statsMap.get(challenge.id);
      return {
        id: challenge.id,
        title: challenge.title,
        hiring_goal_id: challenge.hiring_goal_id,
        hiring_goal_title: challenge.hiring_goal_title,
        invited_count: stats?.invited || 0,
        responses_count: stats?.responses || 0,
        created_at: challenge.created_at,
        start_at: challenge.start_at,
        end_at: challenge.end_at,
        status: challenge.status,
      };
    });
  }, [activeChallengesBase, statsMap]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/business/login');
      return;
    }

    if (businessLoading) return;

    if (!isBusiness) {
      toast({
        title: t('business.dashboard.access_denied'),
        description: t('business.dashboard.no_access'),
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    loadCompanyProfile();
    loadBusinessProfile();
    loadHiringGoalStatus();
    loadActiveChallengesBase();
  }, [isAuthenticated, isBusiness, businessLoading, navigate, toast, t]);

  // Load dashboard stats after hiring goal status is determined
  useEffect(() => {
    if (!hiringGoalLoading && user?.id) {
      loadDashboardStats();
    }
  }, [hiringGoalLoading, hiringGoalDraftId, hiringGoalStatus, user?.id]);

  const loadActiveChallengesBase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active challenges for this business (base data only - stats come from hook)
      const { data: challenges, error } = await supabase
        .from('business_challenges')
        .select(`
          id,
          title,
          hiring_goal_id,
          created_at,
          start_at,
          end_at,
          status
        `)
        .eq('business_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Dashboard] Error fetching active challenges:', error);
        return;
      }

      if (!challenges || challenges.length === 0) {
        setActiveChallengesBase([]);
        return;
      }

      // Get hiring goal titles for each challenge
      const goalIds = challenges.map(c => c.hiring_goal_id).filter(Boolean) as string[];
      let goalsMap: Record<string, string> = {};
      
      if (goalIds.length > 0) {
        const { data: goals } = await supabase
          .from('hiring_goal_drafts')
          .select('id, role_title')
          .in('id', goalIds);
        
        if (goals) {
          goalsMap = goals.reduce((acc, g) => ({ ...acc, [g.id]: g.role_title || 'Untitled Goal' }), {});
        }
      }

      // Set base challenges (stats will be merged via useMemo)
      setActiveChallengesBase(challenges.map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        hiring_goal_id: challenge.hiring_goal_id,
        hiring_goal_title: challenge.hiring_goal_id ? goalsMap[challenge.hiring_goal_id] || null : null,
        created_at: challenge.created_at || '',
        start_at: challenge.start_at || null,
        end_at: challenge.end_at || null,
        status: challenge.status || 'active'
      })));
    } catch (err) {
      console.error('[Dashboard] Error loading active challenges:', err);
    } finally {
      setActiveChallengesLoading(false);
    }
  };

  const loadHiringGoalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch the most recent hiring goal draft (by updated_at)
      const { data, error } = await supabase
        .from('hiring_goal_drafts')
        .select('id, status')
        .eq('business_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[Dashboard] Error fetching hiring goal:', error);
        setHiringGoalStatus('none');
        return;
      }
      
      console.log('[Dashboard] Hiring goal loaded:', { id: data?.id, status: data?.status });
      
      if (!data) {
        // No rows exist
        setHiringGoalStatus('none');
        setHiringGoalDraftId(null);
      } else if (data.status === 'completed') {
        setHiringGoalStatus('completed');
        setHiringGoalDraftId(data.id);
      } else {
        // Status is 'draft' or any unknown value → show card (safe fallback)
        setHiringGoalStatus('draft');
        setHiringGoalDraftId(data.id);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading hiring goal status:', err);
      // Fallback: show card if we can't determine status
      setHiringGoalStatus('none');
      setHiringGoalDraftId(null);
    } finally {
      setHiringGoalLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const { count: candidatesCount } = await supabase
        .from('assessment_results')
        .select('*', { count: 'exact', head: true });

      // Get shortlisted count from business_shortlists for latest completed hiring goal
      let shortlistedCount = 0;
      if (hiringGoalDraftId && hiringGoalStatus === 'completed') {
        const { count } = await supabase
          .from('business_shortlists')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', hiringGoalDraftId);
        shortlistedCount = count || 0;
      } else {
        // Fallback: count all shortlists for this business
        const { count } = await supabase
          .from('business_shortlists')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', user?.id);
        shortlistedCount = count || 0;
      }

      const { count: activeChallengesCount } = await supabase
        .from('business_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user?.id)
        .gte('deadline', new Date().toISOString());

      const { data: businessChallenges } = await supabase
        .from('business_challenges')
        .select('id')
        .eq('business_id', user?.id);

      const challengeIds = businessChallenges?.map(c => c.id) || [];

      let completedCount = 0;
      if (challengeIds.length > 0) {
        const { count } = await supabase
          .from('candidate_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .in('challenge_id', challengeIds);
        completedCount = count || 0;
      }

      setStats({
        totalCandidates: candidatesCount || 0,
        shortlisted: shortlistedCount,
        activeChallenges: activeChallengesCount || 0,
        completedChallenges: completedCount || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company profile:', error);
      } else {
        setCompanyProfile(data);
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadBusinessProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading business profile:', error);
      } else {
        setBusinessProfile(data);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
  };

  const handleGenerateProfile = async () => {
    if (!user?.id || !businessProfile) {
      toast({
        title: t('business.dashboard.error'),
        description: t('business.dashboard.missing_info'),
        variant: 'destructive'
      });
      return;
    }

    setProfileLoading(true);
    
    toast({
      title: t('business.dashboard.generating_profile'),
      description: t('business.dashboard.generating_profile_desc'),
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-company-profile', {
        body: {
          website: businessProfile.website,
          locale: i18n.language?.split('-')[0] || 'en'
        }
      });

      if (error) throw error;

      toast({
        title: t('business.dashboard.success'),
        description: t('business.dashboard.profile_generated')
      });

      await loadCompanyProfile();
    } catch (error: any) {
      console.error('Error generating profile:', error);
      toast({
        title: t('business.dashboard.generation_failed'),
        description: error.message || t('business.dashboard.generation_failed_desc'),
        variant: 'destructive'
      });
    } finally {
      setProfileLoading(false);
    }
  };

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

  const statCards = [
    {
      title: t('business.dashboard.available_candidates'),
      value: stats.totalCandidates,
      icon: <Users size={24} />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/business/candidates'
    },
    {
      title: t('business.dashboard.shortlisted'),
      value: stats.shortlisted,
      icon: <CheckCircle size={24} />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/business/candidates'
    },
    {
      title: t('business.dashboard.active_challenges'),
      value: stats.activeChallenges,
      icon: <Target size={24} />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      link: '/business/challenges'
    },
    {
      title: t('business.dashboard.completed'),
      value: stats.completedChallenges,
      icon: <TrendingUp size={24} />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      link: '/business/evaluations'
    }
  ];

  // Calculate profile completeness - always calculate with safe defaults
  const calculateProfileCompleteness = () => {
    let score = 0;
    const total = 4;
    
    if (businessProfile?.company_name) score++;
    if (businessProfile?.website) score++;
    if (businessProfile?.hr_contact_email) score++;
    if (companyProfile) score++;
    
    return { score, total, percentage: Math.round((score / total) * 100) };
  };
  
  const profileCompleteness = calculateProfileCompleteness();

  // Compute pending reviews count from active challenges stats
  const pendingReviewsCount = useMemo(() => {
    return activeChallengesWithStats.reduce((sum, c) => sum + c.responses_count, 0);
  }, [activeChallengesWithStats]);

  // Compute candidates in pipeline (unique invited)
  const candidatesInPipelineCount = useMemo(() => {
    return activeChallengesWithStats.reduce((sum, c) => sum + c.invited_count, 0);
  }, [activeChallengesWithStats]);

  // Build attention items
  const attentionItems = useMemo(() => {
    const items: { type: 'review' | 'expiring' | 'followup'; count: number; label: string; link: string }[] = [];
    
    if (pendingReviewsCount > 0) {
      items.push({
        type: 'review',
        count: pendingReviewsCount,
        label: t('business.command_center.attention.reviews_waiting', { count: pendingReviewsCount }),
        link: hiringGoalDraftId ? `/business/goals/${hiringGoalDraftId}/challenges` : '/business/challenges'
      });
    }
    
    // Check for expiring challenges
    const expiringChallenges = activeChallengesWithStats.filter(c => {
      if (!c.end_at) return false;
      const daysUntilEnd = (new Date(c.end_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 3 && daysUntilEnd > 0;
    });
    
    if (expiringChallenges.length > 0) {
      items.push({
        type: 'expiring',
        count: expiringChallenges.length,
        label: t('business.command_center.attention.challenge_expiring', { count: expiringChallenges.length }),
        link: '/business/challenges'
      });
    }
    
    return items;
  }, [pendingReviewsCount, activeChallengesWithStats, hiringGoalDraftId, t]);

  // DEV LOG: Confirm banner rendering
  console.log('[Dashboard] Profile completeness:', {
    percentage: profileCompleteness.percentage,
    businessProfile: !!businessProfile,
    companyProfile: !!companyProfile,
    profileLoading
  });

  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* Command Center - TOP OF DASHBOARD */}
        <BusinessCommandCenter
          companyName={businessProfile?.company_name || null}
          profileStatus={profileLoading ? 'loading' : (profileCompleteness.percentage === 100 ? 'ready' : 'incomplete')}
          lastGenerated={companyProfile?.updated_at || null}
          stats={{
            activeChallenges: stats.activeChallenges,
            pendingReviews: pendingReviewsCount,
            candidatesInPipeline: candidatesInPipelineCount,
            shortlisted: stats.shortlisted
          }}
          attentionItems={attentionItems}
          loading={loading || statsLoading}
          hiringGoalId={hiringGoalDraftId}
        />

        {/* Active Challenges Overview - Operational Activity Priority */}
        <ActiveChallengesOverview 
          challenges={activeChallengesWithStats} 
          loading={activeChallengesLoading || statsLoading} 
        />

        {/* DEV Debug Panel for Challenge Stats */}
        {isDev && activeChallengesBase.length > 0 && (
          <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs font-mono text-yellow-600 flex-wrap">
                <Bug className="h-3 w-3" />
                <span>DEV Challenge Stats:</span>
                {activeChallengesBase.slice(0, 3).map(c => {
                  const s = statsDebug[c.id];
                  return (
                    <span key={c.id} className="bg-yellow-500/10 px-1 rounded">
                      {c.title.slice(0, 15)}... inv={s?.invCount || 0} sub={s?.subCount || 0}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hiring Goal Card - Show for first-time (none) or draft state */}
        {!hiringGoalLoading && hiringGoalStatus !== 'completed' && (
          <HiringGoalCard 
            key={hiringGoalDraftId || 'new'}
            draftId={hiringGoalDraftId}
            onComplete={() => {
              console.log('[Dashboard] HiringGoalCard completed, refetching status...');
              loadHiringGoalStatus();
            }} 
          />
        )}

        {/* Next Step Panel - Show after hiring goal is completed */}
        {!hiringGoalLoading && hiringGoalStatus === 'completed' && (
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {t('business.hiring_goal.completed_title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('business.hiring_goal.completed_desc')}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      className="gap-2"
                      onClick={() => navigate(`/business/candidates?fromGoal=${hiringGoalDraftId}`)}
                    >
                      <Users className="h-4 w-4" />
                      {t('business.hiring_goal.generate_shortlist')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        console.log('[Dashboard] Edit Goal clicked, updating status to draft...');
                        if (hiringGoalDraftId) {
                          await supabase
                            .from('hiring_goal_drafts')
                            .update({ status: 'draft' })
                            .eq('id', hiringGoalDraftId);
                        }
                        await loadHiringGoalStatus();
                      }}
                    >
                      {t('business.hiring_goal.edit_goal')}
                    </Button>
                  </div>
                </div>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground font-mono">
                  [DEV] draftId: {hiringGoalDraftId || 'null'} | status: {hiringGoalStatus}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dev logging for draft/none states */}
        {process.env.NODE_ENV === 'development' && !hiringGoalLoading && hiringGoalStatus !== 'completed' && (
          <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
            [DEV] Hiring Goal: draftId={hiringGoalDraftId || 'null'} | status={hiringGoalStatus}
          </div>
        )}

        {/* Hiring Goals Portfolio - ONLY ACTIVE GOALS */}
        {(() => {
          const activeGoals = hiringGoals.filter(goal => goal.status === 'active');
          const hasActiveChallenges = activeChallengesWithStats.length > 0;
          const showEmptyState = activeGoals.length === 0 && !hasActiveChallenges && !activeChallengesLoading;
          
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{t('business.goals.portfolio_title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('business.goals.portfolio_desc')}</p>
                </div>
                <Button 
                  onClick={async () => {
                    const newGoal = await createGoal();
                    if (newGoal) {
                      toast({ title: t('business.goals.created'), description: t('business.goals.created_desc') });
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('business.goals.new_goal')}
                </Button>
              </div>
              
              {activeGoals.length > 0 ? (
                <div className="space-y-3">
                  {activeGoals.map((goal) => (
                    <HiringGoalOverviewCard
                      key={goal.id}
                      goal={goal}
                      onStatusChange={updateGoalStatus}
                    />
                  ))}
                </div>
              ) : showEmptyState ? (
                <Card className="border-dashed border-2 border-muted-foreground/30">
                  <CardContent className="p-8 text-center">
                    <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t('business.goals.no_active_title')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('business.goals.no_active_desc')}
                    </p>
                    <Button 
                      onClick={async () => {
                        const newGoal = await createGoal();
                        if (newGoal) {
                          toast({ title: t('business.goals.created'), description: t('business.goals.created_desc') });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('business.goals.create_first')}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          );
        })()}

        {/* Profile Tools Card - MOVED DOWN AND COLLAPSED */}
        <ProfileToolsCard
          companyProfile={companyProfile}
          businessProfile={businessProfile}
          profileLoading={profileLoading}
          onGenerateProfile={handleGenerateProfile}
        />

        {/* Candidate Engagement */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('business.dashboard.candidate_engagement')}</h2>
          <CandidateEngagement />
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;
