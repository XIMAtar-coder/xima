import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { ShortlistView } from '@/components/business/ShortlistView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Users } from 'lucide-react';

const GoalShortlistPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const handleGoalSwitch = (newGoalId: string) => {
    navigate(`/business/goals/${newGoalId}/shortlist`);
  };

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

  return (
    <BusinessLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <GoalContextHeader currentGoal={currentGoal} allGoals={goals} onGoalSwitch={handleGoalSwitch} />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('shortlist.page_title', 'AI Shortlist')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('shortlist.page_subtitle', 'The 12 candidates matched to this hiring goal and your company DNA.')}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/business/candidates')} className="gap-2">
            <Users className="h-4 w-4" />
            {t('candidate_pool.title', 'Candidate Pool')}
          </Button>
        </div>

        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t('shortlist.explanation_title', 'Shortlist and Pool are separate')}</p>
              <p className="text-sm text-muted-foreground">
                {t('shortlist.explanation_desc', 'This page is goal-specific: XIMA ranks candidates against the role requirements, company DNA, growth trajectory, engagement, location and credentials. The Candidate Pool remains the full browseable talent base.')}
              </p>
            </div>
          </CardContent>
        </Card>

        <ShortlistView
          goalId={goalId}
          roleTitle={currentGoal.role_title || t('business.goals.untitled')}
          onInviteToChallenge={() => toast({ title: t('shortlist.invite_from_pipeline', 'Open the challenge pipeline to invite candidates') })}
          onViewProfile={() => toast({ title: t('anonymous.identity_hidden', 'Identity hidden — revealed at offer stage') })}
        />
      </div>
    </BusinessLayout>
  );
};

export default GoalShortlistPage;