import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronDown, Briefcase, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HiringGoal } from '@/hooks/useHiringGoals';

interface GoalContextHeaderProps {
  currentGoal: HiringGoal | null;
  allGoals: HiringGoal[];
  onGoalSwitch: (goalId: string) => void;
  loading?: boolean;
}

export const GoalContextHeader: React.FC<GoalContextHeaderProps> = ({
  currentGoal,
  allGoals,
  onGoalSwitch,
  loading
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const displayTitle = currentGoal?.role_title || 
    currentGoal?.task_description?.slice(0, 40) || 
    t('business.goals.untitled');

  const isOnSettingsPage = location.pathname.includes('/settings');

  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/business/dashboard')}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('business.goals.back_to_dashboard')}
        </Button>

        <div className="h-6 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="max-w-[200px] truncate">{displayTitle}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-popover border-border">
            {allGoals.map((goal) => (
              <DropdownMenuItem
                key={goal.id}
                onClick={() => onGoalSwitch(goal.id)}
                className={goal.id === currentGoal?.id ? 'bg-accent' : ''}
              >
                <span className="truncate">
                  {goal.role_title || goal.task_description?.slice(0, 40) || t('business.goals.untitled')}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {currentGoal && !isOnSettingsPage && (
        <Link to={`/business/goals/${currentGoal.id}/settings`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            {t('eligibility.title')}
          </Button>
        </Link>
      )}
    </div>
  );
};
