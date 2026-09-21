import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { ShortlistView } from '@/components/business/ShortlistView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const WORK_MODEL_KEYS: Record<string, string> = { onsite: 'hiring_goal.onsite', remote: 'hiring_goal.remote', hybrid: 'hiring_goal.hybrid' };

const GoalShortlistPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { goals, loading } = useHiringGoals();
  const [directGoal, setDirectGoal] = React.useState<any>(null);
  const [directLoading, setDirectLoading] = React.useState(false);
  const currentGoal = goals.find((goal) => goal.id === goalId) || directGoal;

  React.useEffect(() => {
    if (!goalId || goals.some((goal) => goal.id === goalId)) return;
    setDirectLoading(true);
    const loadGoal = async () => {
      const { data } = await supabase
        .from('hiring_goal_drafts')
        .select('*')
        .eq('id', goalId)
        .maybeSingle();
      setDirectGoal(data);
      setDirectLoading(false);
    };
    loadGoal();
  }, [goalId, goals]);

  React.useEffect(() => {
    if (searchParams.get('challengeCreated') === '1') {
      toast({ title: t('business.shortlist.challenge_created_toast', 'Challenge created!') });
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('challengeCreated');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, t]);

  if (loading || directLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </BusinessLayout>
    );
  }

  if (!goalId || !currentGoal) {
    return (
      <BusinessLayout>
        <div className="p-6 text-center text-muted-foreground">{t('shortlist.goal_not_found', 'Hiring goal not found')}</div>
      </BusinessLayout>
    );
  }

  const roleTitle = currentGoal.role_title || t('business.goals.untitled');
  const workModel = currentGoal.work_model && WORK_MODEL_KEYS[currentGoal.work_model] ? t(WORK_MODEL_KEYS[currentGoal.work_model]) : currentGoal.work_model;
  const ralMin = currentGoal.ral_min ?? currentGoal.salary_min;
  const ralMax = currentGoal.ral_max ?? currentGoal.salary_max;
  let ral: string | null = null;
  if (ralMin || ralMax) {
    const fmt = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: currentGoal.salary_currency || 'EUR', maximumFractionDigits: 0 });
    ral = `${t('businessPortal.hiring_goal.gross_salary.ral_label', 'RAL')} ${ralMin && ralMax ? `${fmt.format(ralMin)}–${fmt.format(ralMax)}` : fmt.format(ralMin || ralMax)}`;
  }
  const goalLine = [currentGoal.city_region, workModel, ral].filter(Boolean) as string[];

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <GoalContextHeader currentGoal={currentGoal} allGoals={goals} onGoalSwitch={(newGoalId) => navigate(`/business/hiring-goals/${newGoalId}/shortlist`)} hideSettings />

        <PageHeader
          eyebrow={t('shortlist.page_eyebrow', 'Selection by goal')}
          title={t('shortlist.page_heading', 'Candidate shortlist')}
          subtitle={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
              <strong className="font-medium text-foreground">{roleTitle}</strong>
              {goalLine.map((part) => (
                <React.Fragment key={part}><span aria-hidden="true">·</span><span>{part}</span></React.Fragment>
              ))}
            </span>
          }
          actions={
            <Button variant="outline" onClick={() => navigate(`/business/hiring-goals/${goalId}/settings`)}>
              {t('shortlist.goal_requirements', 'Goal requirements')} <span aria-hidden="true">↗</span>
            </Button>
          }
        />

        <ShortlistView
          goalId={goalId}
          roleTitle={roleTitle}
          onViewProfile={() => toast({ title: t('anonymous.identity_hidden', 'Identity hidden — revealed at offer stage') })}
        />
      </div>
    </BusinessLayout>
  );
};

export default GoalShortlistPage;
