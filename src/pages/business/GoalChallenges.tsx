import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Target, Play, Pause, Archive, Edit, Copy, Clock, CheckCircle, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  status: string;
  difficulty: number | null;
  time_estimate_minutes: number | null;
  created_at: string;
  updated_at: string;
}

const GoalChallenges: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { goals, loading: goalsLoading } = useHiringGoals();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const currentGoal = goals.find(g => g.id === goalId) || null;

  const fetchChallenges = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('business_challenges')
        .select('*')
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching challenges:', error);
        return;
      }

      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleGoalSwitch = (newGoalId: string) => {
    navigate(`/business/goals/${newGoalId}/challenges`);
  };

  const updateChallengeStatus = async (challengeId: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !goalId) return;

    // If activating, archive other active challenges for this goal
    if (newStatus === 'active') {
      await supabase
        .from('business_challenges')
        .update({ status: 'archived' })
        .eq('business_id', user.id)
        .eq('hiring_goal_id', goalId)
        .eq('status', 'active');
    }

    const { error } = await supabase
      .from('business_challenges')
      .update({ status: newStatus })
      .eq('id', challengeId);

    if (error) {
      toast({
        title: t('business.challenges.error'),
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: t('business.challenges.status_updated'),
      description: t('business.challenges.status_updated_desc')
    });

    await fetchChallenges();
  };

  const duplicateChallenge = async (challenge: Challenge) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !goalId) return;

    const { error } = await supabase
      .from('business_challenges')
      .insert({
        business_id: user.id,
        hiring_goal_id: goalId,
        title: `${challenge.title} (copy)`,
        description: challenge.description,
        difficulty: challenge.difficulty,
        time_estimate_minutes: challenge.time_estimate_minutes,
        status: 'draft'
      });

    if (error) {
      toast({
        title: t('business.challenges.error'),
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: t('business.challenges.duplicated'),
      description: t('business.challenges.duplicated_desc')
    });

    await fetchChallenges();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t('business.challenges.status_active')}</Badge>;
      case 'archived':
        return <Badge className="bg-muted text-muted-foreground">{t('business.challenges.status_archived')}</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{t('business.challenges.status_draft')}</Badge>;
    }
  };

  if (goalsLoading || loading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </BusinessLayout>
    );
  }

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const draftChallenges = challenges.filter(c => c.status === 'draft');
  const archivedChallenges = challenges.filter(c => c.status === 'archived');

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
            <h1 className="text-3xl font-bold text-foreground">{t('business.challenges.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('business.challenges.subtitle')}
            </p>
          </div>
          <Link to={`/business/challenges/new?goal=${goalId}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('business.challenges.create')}
            </Button>
          </Link>
        </div>

        {/* Active challenges */}
        {activeChallenges.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {t('business.challenges.active_section')} ({activeChallenges.length})
            </h2>
            <div className="space-y-3">
              {activeChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  goalId={goalId!}
                  onStatusChange={updateChallengeStatus}
                  onDuplicate={duplicateChallenge}
                  getStatusBadge={getStatusBadge}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Draft challenges */}
        {draftChallenges.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              {t('business.challenges.draft_section')} ({draftChallenges.length})
            </h2>
            <div className="space-y-3">
              {draftChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  goalId={goalId!}
                  onStatusChange={updateChallengeStatus}
                  onDuplicate={duplicateChallenge}
                  getStatusBadge={getStatusBadge}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived challenges */}
        {archivedChallenges.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
              <Archive className="h-5 w-5" />
              {t('business.challenges.archived_section')} ({archivedChallenges.length})
            </h2>
            <div className="space-y-3">
              {archivedChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  goalId={goalId!}
                  onStatusChange={updateChallengeStatus}
                  onDuplicate={duplicateChallenge}
                  getStatusBadge={getStatusBadge}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {challenges.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('business.challenges.empty_title')}</h3>
              <p className="text-muted-foreground mb-4">{t('business.challenges.empty_desc')}</p>
              <Link to={`/business/challenges/new?goal=${goalId}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('business.challenges.create_first')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </BusinessLayout>
  );
};

interface ChallengeCardProps {
  challenge: Challenge;
  goalId: string;
  onStatusChange: (id: string, status: string) => void;
  onDuplicate: (challenge: Challenge) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  t: (key: string) => string;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  goalId,
  onStatusChange,
  onDuplicate,
  getStatusBadge,
  t
}) => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{challenge.title}</h3>
              {getStatusBadge(challenge.status)}
            </div>
            {challenge.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {challenge.description}
              </p>
            )}
            {challenge.time_estimate_minutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {challenge.time_estimate_minutes} min
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('business.challenges.actions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem onClick={() => navigate(`/business/goals/${goalId}/challenges/${challenge.id}/responses`)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('business.dashboard.view_responses')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(challenge)}>
                <Copy className="h-4 w-4 mr-2" />
                {t('business.challenges.duplicate')}
              </DropdownMenuItem>
              {challenge.status !== 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange(challenge.id, 'active')}>
                  <Play className="h-4 w-4 mr-2" />
                  {t('business.challenges.activate')}
                </DropdownMenuItem>
              )}
              {challenge.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange(challenge.id, 'draft')}>
                  <Pause className="h-4 w-4 mr-2" />
                  {t('business.challenges.deactivate')}
                </DropdownMenuItem>
              )}
              {challenge.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onStatusChange(challenge.id, 'archived')}>
                  <Archive className="h-4 w-4 mr-2" />
                  {t('business.challenges.archive')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalChallenges;
