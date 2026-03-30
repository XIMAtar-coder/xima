import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  Users, 
  MessageSquare, 
  Plus, 
  ChevronRight, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download
} from 'lucide-react';

interface CommandCenterProps {
  stats: {
    activeChallenges: number;
    pendingReviews: number;
    candidatesInPipeline: number;
    shortlisted: number;
  };
  attentionItems: {
    type: 'review' | 'expiring' | 'followup';
    count: number;
    label: string;
    link: string;
  }[];
  loading?: boolean;
  hiringGoalId?: string | null;
  onImportJob?: () => void;
}

export const BusinessCommandCenter: React.FC<CommandCenterProps> = ({
  stats,
  attentionItems,
  loading = false,
  hiringGoalId,
  onImportJob,
}) => {
  const { t } = useTranslation();

  const kpiCards = [
    {
      key: 'active_challenges',
      labelKey: 'businessPortal.pipeline_stat_challenges',
      value: stats.activeChallenges,
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      link: '/business/challenges'
    },
    {
      key: 'pending_reviews',
      labelKey: 'businessPortal.pipeline_stat_evaluations',
      value: stats.pendingReviews,
      icon: MessageSquare,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      link: hiringGoalId ? `/business/goals/${hiringGoalId}/challenges` : '/business/challenges'
    },
    {
      key: 'pipeline_candidates',
      labelKey: 'businessPortal.pipeline_stat_pipeline',
      value: stats.candidatesInPipeline,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/business/candidates'
    },
    {
      key: 'shortlisted',
      labelKey: 'businessPortal.pipeline_stat_shortlist',
      value: stats.shortlisted,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/business/candidates'
    }
  ];

  const actionButtons = [
    {
      key: 'create_challenge',
      labelKey: 'businessPortal.quick_action_create_challenge',
      icon: Plus,
      primary: true,
      link: '/business/challenges/new'
    },
    {
      key: 'invite_candidates',
      labelKey: 'businessPortal.quick_action_invite_candidates',
      icon: Users,
      primary: false,
      link: '/business/candidates'
    },
    {
      key: 'review_responses',
      labelKey: 'businessPortal.quick_action_evaluate',
      icon: MessageSquare,
      primary: false,
      link: hiringGoalId ? `/business/goals/${hiringGoalId}/challenges` : '/business/challenges'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('businessPortal.quick_actions_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3">
            {actionButtons.map((action) => (
              <Link key={action.key} to={action.link}>
                <Button variant={action.primary ? 'default' : 'outline'} className="gap-2">
                  <action.icon className="h-4 w-4" />
                  {t(action.labelKey)}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.key} to={kpi.link}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{t(kpi.labelKey)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Attention Needed */}
      {attentionItems.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              {t('businessPortal.attention_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {attentionItems.map((item, index) => (
                <Link 
                  key={index} 
                  to={item.link}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'review' && <MessageSquare className="h-4 w-4 text-amber-500" />}
                    {item.type === 'expiring' && <Clock className="h-4 w-4 text-orange-500" />}
                    {item.type === 'followup' && <Users className="h-4 w-4 text-blue-500" />}
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
