import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Users, MessageSquare, ChevronRight, Zap } from 'lucide-react';

interface ActiveChallenge {
  id: string;
  title: string;
  hiring_goal_id: string | null;
  hiring_goal_title: string | null;
  invited_count: number;
  responses_count: number;
  created_at: string;
}

interface ActiveChallengesOverviewProps {
  challenges: ActiveChallenge[];
  loading?: boolean;
}

export const ActiveChallengesOverview: React.FC<ActiveChallengesOverviewProps> = ({
  challenges,
  loading = false
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            {t('business.dashboard.active_challenges_overview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted/50 rounded-lg" />
            <div className="h-16 bg-muted/50 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (challenges.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            {t('business.dashboard.active_challenges_overview')}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {challenges.length} {t('business.dashboard.active')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {challenges.map((challenge) => (
          <div 
            key={challenge.id}
            className="p-4 rounded-lg border border-border/50 bg-card/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <h4 className="font-medium text-foreground truncate">{challenge.title}</h4>
                </div>
                {challenge.hiring_goal_title && (
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {challenge.hiring_goal_title}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {challenge.invited_count} {t('business.dashboard.invited')}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {challenge.responses_count} {t('business.dashboard.responses')}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  if (challenge.hiring_goal_id) {
                    navigate(`/business/goals/${challenge.hiring_goal_id}/challenges`);
                  } else {
                    navigate('/business/challenges');
                  }
                }}
              >
                {t('business.dashboard.view_responses')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
