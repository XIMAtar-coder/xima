import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Users,
  MessageSquare,
  Plus,
  CheckCircle,
  Clock,
  Sparkles,
  Building2,
  ChevronRight,
  FileText,
  AlertCircle,
  Briefcase,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useBusinessLocale } from '@/hooks/useBusinessLocale';

interface PipelineStats {
  activeGoals: number;
  activeChallenges: number;
  pendingReviews: number;
  candidatesEngaged: number;
}

interface RecentActivity {
  id: string;
  type: 'invitation' | 'submission' | 'shortlist';
  description: string;
  timestamp: string;
}

interface NextAction {
  id: string;
  label: string;
  completed: boolean;
  route: string;
}

export const BusinessCommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { locale } = useBusinessLocale();
  const { goals, loading: goalsLoading } = useHiringGoals();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PipelineStats>({
    activeGoals: 0,
    activeChallenges: 0,
    pendingReviews: 0,
    candidatesEngaged: 0
  });
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Load all data on mount
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadBusinessProfile(),
        loadCompanyProfile(),
        loadRecentActivity()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      // Active hiring goals
      const { count: goalsCount } = await supabase
        .from('hiring_goal_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user.id)
        .in('status', ['active', 'completed']);

      // Active challenges
      const { count: challengesCount } = await supabase
        .from('business_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user.id)
        .eq('status', 'active');

      // Pending reviews (submissions with 'submitted' status)
      const { count: pendingCount } = await supabase
        .from('challenge_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user.id)
        .eq('status', 'submitted');

      // Candidates engaged (invited in last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { count: engagedCount } = await supabase
        .from('challenge_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user.id)
        .gte('created_at', twoWeeksAgo.toISOString());

      setStats({
        activeGoals: goalsCount || 0,
        activeChallenges: challengesCount || 0,
        pendingReviews: pendingCount || 0,
        candidatesEngaged: engagedCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBusinessProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setBusinessProfile(data);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
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

      if (!error && data) {
        setCompanyProfile(data);
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
    }
  };

  const loadRecentActivity = async () => {
    if (!user?.id) return;

    try {
      // Get recent invitations
      const { data: invitations } = await supabase
        .from('challenge_invitations')
        .select('id, created_at, candidate_profile_id')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent submissions
      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('id, submitted_at, candidate_profile_id')
        .eq('business_id', user.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];

      if (invitations) {
        invitations.forEach(inv => {
          activities.push({
            id: inv.id,
            type: 'invitation',
            description: t('business.command_center.activity_invited'),
            timestamp: inv.created_at
          });
        });
      }

      if (submissions) {
        submissions.forEach(sub => {
          if (sub.submitted_at) {
            activities.push({
              id: sub.id,
              type: 'submission',
              description: t('business.command_center.activity_submitted'),
              timestamp: sub.submitted_at
            });
          }
        });
      }

      // Sort by timestamp and take top 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleGenerateProfile = async () => {
    if (!user?.id || !businessProfile?.website) {
      toast({
        title: t('business.command_center.error'),
        description: t('business.command_center.website_required'),
        variant: 'destructive'
      });
      return;
    }

    setProfileLoading(true);
    toast({
      title: t('business.command_center.generating'),
      description: t('business.command_center.generating_desc'),
    });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-company-profile', {
        body: {
          website: businessProfile.website,
          locale: locale
        }
      });

      if (error) throw error;

      toast({
        title: t('business.command_center.success'),
        description: t('business.command_center.profile_generated')
      });

      await loadCompanyProfile();
    } catch (error: any) {
      console.error('Error generating profile:', error);
      toast({
        title: t('business.command_center.generation_failed'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Compute next best actions
  const nextActions = useMemo((): NextAction[] => {
    const actions: NextAction[] = [];

    // Check if has goals
    const hasGoals = stats.activeGoals > 0;
    if (!hasGoals) {
      actions.push({
        id: 'create-goal',
        label: t('business.command_center.action_create_goal'),
        completed: false,
        route: '/business/dashboard'
      });
    }

    // Check if has challenges
    const hasChallenges = stats.activeChallenges > 0;
    if (hasGoals && !hasChallenges) {
      actions.push({
        id: 'create-challenge',
        label: t('business.command_center.action_create_challenge'),
        completed: false,
        route: '/business/challenges/new'
      });
    }

    // Check if has invitations but no pending reviews
    if (hasChallenges && stats.candidatesEngaged === 0) {
      actions.push({
        id: 'invite-candidates',
        label: t('business.command_center.action_invite_candidates'),
        completed: false,
        route: '/business/candidates'
      });
    }

    // Check if has pending reviews
    if (stats.pendingReviews > 0) {
      actions.push({
        id: 'review-submissions',
        label: t('business.command_center.action_review_submissions', { count: stats.pendingReviews }),
        completed: false,
        route: '/business/evaluations'
      });
    }

    return actions;
  }, [stats, t]);

  // Profile completeness
  const profileCompleteness = useMemo(() => {
    let score = 0;
    const total = 4;

    if (businessProfile?.company_name) score++;
    if (businessProfile?.website) score++;
    if (businessProfile?.hr_contact_email) score++;
    if (companyProfile) score++;

    return { score, total, percentage: Math.round((score / total) * 100) };
  }, [businessProfile, companyProfile]);

  const companyName = businessProfile?.company_name || t('business.command_center.your_company');

  if (loading || goalsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('business.command_center.welcome', { company: companyName })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('business.command_center.subtitle')}
          </p>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/business/dashboard')} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('business.command_center.quick_create_goal')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/business/challenges/new')} className="gap-2">
          <Target className="h-4 w-4" />
          {t('business.command_center.quick_create_challenge')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/business/evaluations')} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('business.command_center.quick_view_responses')}
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Snapshot Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              {t('business.command_center.pipeline_snapshot')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-3xl font-bold text-foreground">{stats.activeGoals}</div>
                <div className="text-sm text-muted-foreground">{t('business.command_center.stat_goals')}</div>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="text-3xl font-bold text-foreground">{stats.activeChallenges}</div>
                <div className="text-sm text-muted-foreground">{t('business.command_center.stat_challenges')}</div>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-3xl font-bold text-foreground">{stats.pendingReviews}</div>
                <div className="text-sm text-muted-foreground">{t('business.command_center.stat_pending')}</div>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-3xl font-bold text-foreground">{stats.candidatesEngaged}</div>
                <div className="text-sm text-muted-foreground">{t('business.command_center.stat_engaged')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Best Actions Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-primary" />
              {t('business.command_center.next_actions')}
            </CardTitle>
            <CardDescription>
              {t('business.command_center.next_actions_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextActions.length > 0 ? (
              nextActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 ${action.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                      {action.completed && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-foreground">{action.label}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(action.route)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('business.command_center.all_caught_up')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Profile Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              {t('business.command_center.company_profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('business.command_center.profile_status')}</span>
              <Badge variant={profileCompleteness.percentage === 100 ? 'default' : 'secondary'} className={profileCompleteness.percentage === 100 ? 'bg-green-500' : ''}>
                {profileCompleteness.percentage === 100 
                  ? t('business.command_center.status_complete')
                  : t('business.command_center.status_incomplete')
                }
              </Badge>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('business.command_center.completeness')}</span>
                <span className="font-medium text-foreground">{profileCompleteness.percentage}%</span>
              </div>
              <Progress value={profileCompleteness.percentage} className="h-2" />
            </div>

            {/* Last Generated */}
            {companyProfile?.updated_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('business.command_center.last_generated')}: {new Date(companyProfile.updated_at).toLocaleDateString()}
              </div>
            )}

            {/* AI Profile Notice */}
            {!companyProfile && businessProfile?.website && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">{t('business.command_center.profile_not_generated')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('business.command_center.profile_not_generated_desc')}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {businessProfile?.website && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateProfile}
                  disabled={profileLoading}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {companyProfile 
                    ? t('business.command_center.regenerate_profile')
                    : t('business.command_center.generate_profile')
                  }
                </Button>
              )}
              <Link to="/business/settings">
                <Button variant="outline" size="sm">
                  {t('business.command_center.edit_profile')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              {t('business.command_center.recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'invitation' ? 'bg-blue-500/20' :
                      activity.type === 'submission' ? 'bg-green-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      {activity.type === 'invitation' && <Users className="h-4 w-4 text-blue-500" />}
                      {activity.type === 'submission' && <FileText className="h-4 w-4 text-green-500" />}
                      {activity.type === 'shortlist' && <CheckCircle className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('business.command_center.no_activity')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('business.command_center.no_activity_hint')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTA to full dashboard */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-background">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-foreground">{t('business.command_center.full_dashboard_title')}</h3>
            <p className="text-sm text-muted-foreground">{t('business.command_center.full_dashboard_desc')}</p>
          </div>
          <Button onClick={() => navigate('/business/dashboard')} className="gap-2">
            {t('business.command_center.go_to_dashboard')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
