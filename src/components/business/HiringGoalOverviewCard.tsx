import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Settings, ChevronRight, Briefcase, Play, Pause, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HiringGoal } from '@/hooks/useHiringGoals';

interface HiringGoalOverviewCardProps {
  goal: HiringGoal;
  onStatusChange: (goalId: string, status: string) => Promise<void>;
}

export const HiringGoalOverviewCard: React.FC<HiringGoalOverviewCardProps> = ({
  goal,
  onStatusChange
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t('business.goals.status_active')}</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{t('business.goals.status_paused')}</Badge>;
      case 'closed':
        return <Badge className="bg-muted text-muted-foreground">{t('business.goals.status_closed')}</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{t('business.goals.status_draft')}</Badge>;
    }
  };

  const displayTitle = goal.role_title || goal.task_description?.slice(0, 50) || t('business.goals.untitled');
  const displayArea = goal.function_area || goal.work_model || '';

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-foreground truncate">{displayTitle}</h3>
              {getStatusBadge(goal.status)}
            </div>
            
            {displayArea && (
              <p className="text-sm text-muted-foreground mb-3 truncate">{displayArea}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {goal.candidate_count || 0} {t('business.goals.candidates')}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                {goal.challenge_count || 0} {t('business.goals.challenges')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/business/goals/${goal.id}/candidates`)}
            >
              <Users className="h-4 w-4 mr-1" />
              {t('business.goals.view_candidates')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/business/goals/${goal.id}/challenges`)}
            >
              <Target className="h-4 w-4 mr-1" />
              {t('business.goals.manage_challenges')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem onClick={() => navigate(`/business/goals/${goal.id}/edit`)}>
                  {t('business.goals.edit_goal')}
                </DropdownMenuItem>
                {goal.status !== 'active' && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'active')}>
                    <Play className="h-4 w-4 mr-2" />
                    {t('business.goals.activate')}
                  </DropdownMenuItem>
                )}
                {goal.status === 'active' && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'paused')}>
                    <Pause className="h-4 w-4 mr-2" />
                    {t('business.goals.pause')}
                  </DropdownMenuItem>
                )}
                {goal.status !== 'closed' && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'closed')}>
                    <Archive className="h-4 w-4 mr-2" />
                    {t('business.goals.close')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
