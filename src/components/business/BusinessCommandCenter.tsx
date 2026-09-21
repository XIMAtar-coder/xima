import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Panel, Eyebrow } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

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
  /** Where "invited" and "responses" lead: the responses of the active challenge. */
  responsesLink?: string | null;
}

/**
 * The counter strip of the dashboard: one panel, four cells separated by
 * hairlines, each a link to where the number comes from. Attention items
 * (responses waiting, challenges expiring) follow as plain rows.
 */
export const BusinessCommandCenter: React.FC<CommandCenterProps> = ({
  stats,
  attentionItems,
  loading = false,
  hiringGoalId,
  responsesLink,
}) => {
  const { t } = useTranslation();

  const cells = [
    {
      key: 'active_challenges',
      label: t('businessPortal.pipeline_stat_challenges'),
      value: stats.activeChallenges,
      hint: stats.activeChallenges > 0
        ? t('businessPortal.overview_hint_selection_open', 'Selection open')
        : t('businessPortal.overview_hint_no_challenge', 'No challenge yet'),
      link: '/business/challenges',
    },
    {
      key: 'pending_reviews',
      label: t('businessPortal.pipeline_stat_evaluations'),
      value: stats.pendingReviews,
      hint: stats.pendingReviews > 0
        ? t('businessPortal.overview_hint_responses_to_read', 'Responses to read')
        : t('businessPortal.overview_hint_no_responses', 'No response submitted'),
      link: responsesLink || (hiringGoalId ? `/business/hiring-goals/${hiringGoalId}/challenges` : '/business/challenges'),
    },
    {
      key: 'pipeline_candidates',
      label: t('businessPortal.pipeline_stat_pipeline'),
      value: stats.candidatesInPipeline,
      hint: t('businessPortal.overview_hint_invited_to_challenge', 'Invited to the challenge'),
      // Invited candidates are waited on in the challenge, not in the pool.
      link: responsesLink || '/business/challenges',
    },
    {
      key: 'shortlisted',
      label: t('businessPortal.pipeline_stat_shortlist'),
      value: stats.shortlisted,
      hint: t('businessPortal.overview_hint_suggested_profiles', 'Suggested profiles'),
      link: '/business/candidates',
    },
  ];

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden p-0" aria-label={t('businessPortal.overview_counters_aria', 'Selection summary')}>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {cells.map((cell, i) => (
            <Link
              key={cell.key}
              to={cell.link}
              className={cn(
                'block border-[hsl(var(--xs-line))] px-5 py-4 transition-colors hover:bg-[hsl(var(--xs-page))] lg:px-6 lg:py-5',
                i % 2 === 0 && 'border-r',
                i === 1 && 'lg:border-r',
                i < 2 && 'border-b lg:border-b-0',
              )}
            >
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{cell.label}</p>
                  <p className="my-1.5 font-mono text-[26px] font-medium leading-none tabular-nums tracking-[-1px] text-foreground lg:text-[30px]">{cell.value}</p>
                  <p className="text-xs text-muted-foreground">{cell.hint}</p>
                </>
              )}
            </Link>
          ))}
        </div>
      </Panel>

      {attentionItems.length > 0 && (
        <Panel className="py-2">
          <Eyebrow className="pt-3">{t('businessPortal.attention_title')}</Eyebrow>
          {attentionItems.map((item, index) => (
            <Link key={index} to={item.link} className="xs-row text-sm text-foreground hover:text-primary">
              <span>{item.label}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{item.count}</span>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  );
};

interface QuickActionsProps {
  hiringGoalId?: string | null;
  onImportJob?: () => void;
  onCreateChallenge?: () => void;
}

/** The row of outline buttons at the end of the dashboard. */
export const BusinessQuickActions: React.FC<QuickActionsProps> = ({ hiringGoalId, onImportJob, onCreateChallenge }) => {
  const { t } = useTranslation();

  const actions = [
    { key: 'import_job', label: t('businessPortal.quick_action_import_listing', 'Import a listing'), onClick: onImportJob },
    {
      key: 'create_challenge',
      label: t('businessPortal.quick_action_create_challenge'),
      link: hiringGoalId ? `/business/challenges/select?goal=${hiringGoalId}` : undefined,
      onClick: hiringGoalId ? undefined : onCreateChallenge,
    },
    { key: 'invite_candidates', label: t('businessPortal.quick_action_invite_candidates'), link: '/business/candidates' },
    {
      key: 'review_responses',
      label: t('businessPortal.quick_action_evaluate'),
      link: hiringGoalId ? `/business/hiring-goals/${hiringGoalId}/challenges` : '/business/challenges',
    },
  ];

  return (
    <Panel className="px-5 py-4">
      <Eyebrow className="mb-3">{t('businessPortal.quick_actions_title')}</Eyebrow>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action.link ? (
            <Button key={action.key} asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link to={action.link}>{action.label} <span aria-hidden="true">↗</span></Link>
            </Button>
          ) : (
            <Button key={action.key} variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={action.onClick}>
              {action.label} <span aria-hidden="true">↗</span>
            </Button>
          ),
        )}
      </div>
    </Panel>
  );
};
