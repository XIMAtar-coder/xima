import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase } from 'lucide-react';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { HiringGoalOverviewCard } from '@/components/business/HiringGoalOverviewCard';

const BusinessHiringGoals = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { goals: hiringGoals, loading: hiringGoalsLoading, updateGoalStatus } = useHiringGoals();

  // Show all non-closed goals (drafts included, so in-progress wizard drafts are reopenable)
  const visibleGoals = hiringGoals.filter(g => g.status !== 'closed');

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.hiring_goals_page_title')}</h1>
          <p className="text-muted-foreground">{t('businessPortal.hiring_goals_page_subtitle')}</p>
        </div>

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
          ) : visibleGoals.length > 0 ? (
            <div className="space-y-3">
              {visibleGoals.map((goal) => (
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
