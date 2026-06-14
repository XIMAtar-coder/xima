import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, CheckCircle, Users } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { HiringGoalCard } from '@/components/business/HiringGoalCard';
import { HiringGoalOverviewCard } from '@/components/business/HiringGoalOverviewCard';

const BusinessHiringGoals = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const [hiringGoalStatus, setHiringGoalStatus] = useState<'none' | 'draft' | 'active'>('none');
  const [hiringGoalDraftId, setHiringGoalDraftId] = useState<string | null>(null);
  const [hiringGoalLoading, setHiringGoalLoading] = useState(true);

  const { goals: hiringGoals, loading: hiringGoalsLoading, updateGoalStatus } = useHiringGoals();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/business/login'); return; }
    if (businessLoading) return;
    if (!isBusiness) {
      toast({ title: t('business.dashboard.access_denied'), description: t('business.dashboard.no_access'), variant: 'destructive' });
      navigate('/login');
      return;
    }
    loadHiringGoalStatus();
  }, [isAuthenticated, isBusiness, businessLoading, navigate, toast, t]);

  const loadHiringGoalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('hiring_goal_drafts')
        .select('id, status')
        .eq('business_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { setHiringGoalStatus('none'); return; }
      if (!data) { setHiringGoalStatus('none'); setHiringGoalDraftId(null); }
      else if (['active', 'paused', 'filled', 'closed'].includes(data.status)) {
        setHiringGoalStatus('active'); setHiringGoalDraftId(data.id);
      } else { setHiringGoalStatus('draft'); setHiringGoalDraftId(data.id); }
    } catch (err) {
      setHiringGoalStatus('none'); setHiringGoalDraftId(null);
    } finally { setHiringGoalLoading(false); }
  };

  const activeGoals = hiringGoals.filter(g => g.status === 'active');

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.hiring_goals_page_title')}</h1>
          <p className="text-muted-foreground">{t('businessPortal.hiring_goals_page_subtitle')}</p>
        </div>

        {/* Wizard / current draft editor */}
        {!hiringGoalLoading && hiringGoalStatus !== 'active' && (
          <HiringGoalCard
            key={hiringGoalDraftId || 'new'}
            draftId={hiringGoalDraftId}
            onComplete={() => loadHiringGoalStatus()}
          />
        )}

        {!hiringGoalLoading && hiringGoalStatus === 'active' && (
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

        {/* Portfolio */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t('businessPortal.hiring_goals_title')}</h2>
              <p className="text-sm text-muted-foreground">{t('businessPortal.hiring_goals_subtitle')}</p>
            </div>
            <Button onClick={() => navigate('/business/hiring-goals/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('businessPortal.hiring_goals_new_cta')}
            </Button>
          </div>

          {hiringGoalsLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">…</CardContent></Card>
          ) : activeGoals.length > 0 ? (
            <div className="space-y-3">
              {activeGoals.map((goal) => (
                <HiringGoalOverviewCard key={goal.id} goal={goal} onStatusChange={updateGoalStatus} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/30">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('business.goals.no_active_title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('business.goals.no_active_desc')}</p>
                <Button onClick={() => navigate('/business/hiring-goals/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('business.goals.create_first')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessHiringGoals;
