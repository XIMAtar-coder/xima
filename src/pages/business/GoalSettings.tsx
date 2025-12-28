import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { RoleRequirementsForm } from '@/components/business/RoleRequirementsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const GoalSettings: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const { t } = useTranslation();
  const { goals, loading } = useHiringGoals();

  const currentGoal = goals.find(g => g.id === goalId) || null;

  if (loading) {
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
      <div className="space-y-6 max-w-4xl mx-auto">
        <GoalContextHeader
          currentGoal={currentGoal}
          allGoals={goals}
          onGoalSwitch={(newGoalId) => window.location.href = `/business/goals/${newGoalId}/settings`}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('eligibility.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('eligibility.subtitle')}
            </p>
          </div>
          <Link to={`/business/goals/${goalId}/candidates`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('eligibility.title')}
            </CardTitle>
            <CardDescription>
              {t('eligibility.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {goalId && <RoleRequirementsForm hiringGoalId={goalId} />}
          </CardContent>
        </Card>
      </div>
    </BusinessLayout>
  );
};

export default GoalSettings;