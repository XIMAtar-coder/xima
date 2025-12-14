import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Target, CheckCircle, TrendingUp, Plus, ArrowRight, Briefcase, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { CandidateEngagement } from '@/components/business/CandidateEngagement';
import { CompanyProfileCard } from '@/components/business/CompanyProfileCard';
import { HiringGoalCard } from '@/components/business/HiringGoalCard';

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [hasCompletedHiringGoal, setHasCompletedHiringGoal] = useState(false);
  const [hiringGoalLoading, setHiringGoalLoading] = useState(true);

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

    loadDashboardStats();
    loadCompanyProfile();
    loadBusinessProfile();
    loadHiringGoalStatus();
  }, [isAuthenticated, isBusiness, businessLoading, navigate, toast, t]);

  const loadHiringGoalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('hiring_goal_drafts')
        .select('status')
        .eq('business_id', user.id)
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle();
      
      setHasCompletedHiringGoal(!!data);
    } catch (err) {
      console.error('Error loading hiring goal status:', err);
    } finally {
      setHiringGoalLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const { count: candidatesCount } = await supabase
        .from('assessment_results')
        .select('*', { count: 'exact', head: true });

      const { count: shortlistedCount } = await supabase
        .from('candidate_shortlist')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user?.id);

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
        shortlisted: shortlistedCount || 0,
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
          website: businessProfile.website
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

  // DEV LOG: Confirm banner rendering
  console.log('[Dashboard] Profile completeness banner rendering:', {
    percentage: profileCompleteness.percentage,
    businessProfile: !!businessProfile,
    companyProfile: !!companyProfile,
    profileLoading
  });

  return (
    <BusinessLayout>
      <div className="space-y-8">
         {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">{t('business.dashboard.welcome')}</h1>
          <p className="text-muted-foreground">
            {t('business.dashboard.subtitle')}
          </p>
        </div>

        {/* Profile Completeness Banner - ALWAYS VISIBLE */}
        <Card className={profileCompleteness.percentage === 100 ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${profileCompleteness.percentage === 100 ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                {profileCompleteness.percentage === 100 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {profileCompleteness.percentage === 100 
                    ? t('business.dashboard.profile_complete_title')
                    : t('business.dashboard.complete_profile_title')}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {profileCompleteness.percentage === 100 
                    ? t('business.dashboard.profile_complete_desc')
                    : t('business.dashboard.complete_profile_desc')}
                </p>
                <div className="flex items-center gap-4 mb-3">
                  <Progress value={profileCompleteness.percentage} className="flex-1 h-2" />
                  <span className="text-sm font-medium text-foreground">
                    {profileCompleteness.percentage}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className={businessProfile?.company_name ? 'text-green-500' : ''}>
                    {businessProfile?.company_name ? '✓' : '○'} {t('business.dashboard.company_name')}
                  </span>
                  <span className={businessProfile?.website ? 'text-green-500' : ''}>
                    {businessProfile?.website ? '✓' : '○'} {t('business.dashboard.website')}
                  </span>
                  <span className={businessProfile?.hr_contact_email ? 'text-green-500' : ''}>
                    {businessProfile?.hr_contact_email ? '✓' : '○'} {t('business.dashboard.hr_contact')}
                  </span>
                  <span className={companyProfile ? 'text-green-500' : ''}>
                    {companyProfile ? '✓' : '○'} {t('business.dashboard.ai_profile')}
                  </span>
                </div>
              </div>
              <Link to="/business/settings">
                <Button variant="outline" size="sm" className="shrink-0">
                  {t('business.dashboard.edit_profile')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Hiring Goal Card - Show for first-time/empty-state */}
        {!hiringGoalLoading && !hasCompletedHiringGoal && (
          <HiringGoalCard onComplete={() => setHasCompletedHiringGoal(true)} />
        )}

        {/* Company Profile Section */}
        <CompanyProfileCard
          profile={companyProfile}
          loading={profileLoading}
          onGenerate={handleGenerateProfile}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card
              key={index}
              className="bg-gradient-to-br from-card to-card/80 border-primary/20 hover:border-primary/40 transition-all hover:scale-105"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <div className={stat.color}>{stat.icon}</div>
                  </div>
                  <Link to={stat.link}>
                    <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                      <ArrowRight size={18} className="text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">{stat.value}</h3>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="text-foreground">{t('business.dashboard.find_talent_title')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('business.dashboard.find_talent_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/business/candidates">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  <Users size={18} className="mr-2" />
                  {t('business.dashboard.browse_candidates')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="text-foreground">{t('business.dashboard.launch_challenge_title')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('business.dashboard.launch_challenge_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/business/challenges/new">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-primary hover:opacity-90">
                  <Plus size={18} className="mr-2" />
                  {t('business.dashboard.create_challenge')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-foreground">{t('business.dashboard.getting_started')}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('business.dashboard.getting_started_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle className="text-green-500" size={20} />
              <span className="text-foreground">{t('business.dashboard.account_created')}</span>
            </div>
            <Link to="/business/candidates">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                <span className="text-muted-foreground">{t('business.dashboard.browse_shortlist')}</span>
              </div>
            </Link>
            <Link to="/business/challenges/new">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                <span className="text-muted-foreground">{t('business.dashboard.create_first_challenge')}</span>
              </div>
            </Link>
          </CardContent>
        </Card>

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
