import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Panel, Eyebrow, Stat } from '@/components/layout/PageHeader';
import { Chip } from '@/components/business/XsBits';
import { getChallengeTimeInfo } from '@/utils/challengeTimeUtils';
import { cn } from '@/lib/utils';

const isDev = import.meta.env.DEV;

interface ActiveChallenge {
  id: string;
  title: string;
  hiring_goal_id: string | null;
  hiring_goal_title: string | null;
  invited_count: number;
  responses_count: number;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
}

interface ActiveChallengesOverviewProps {
  challenges: ActiveChallenge[];
  loading?: boolean;
}

/**
 * The one glass surface of the dashboard: the selection in progress.
 * Every active challenge is a block inside it; the first is the hero.
 */
export const ActiveChallengesOverview: React.FC<ActiveChallengesOverviewProps> = ({ challenges, loading = false }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Panel glass accent aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-32 rounded bg-muted/60" />
          <div className="h-7 w-2/3 rounded bg-muted/60" />
          <div className="h-16 w-1/2 rounded bg-muted/60" />
        </div>
      </Panel>
    );
  }

  if (challenges.length === 0) return null;

  return (
    <Panel glass accent className="divide-y divide-[hsl(var(--xs-line))]">
      {challenges.map((challenge, index) => {
        const timeInfo = getChallengeTimeInfo(challenge.start_at, challenge.end_at, challenge.status);
        const responsesPath = challenge.hiring_goal_id
          ? `/business/hiring-goals/${challenge.hiring_goal_id}/challenges/${challenge.id}/responses`
          : `/business/challenges/${challenge.id}/responses`;
        const statusLine = challenge.responses_count > 0
          ? t('businessPortal.attention_responses_waiting', { count: challenge.responses_count })
          : challenge.invited_count > 0
            ? t('businessPortal.overview_waiting_first_response', 'Waiting for the first response')
            : t('businessPortal.overview_no_invites_yet', 'No candidates invited yet');

        return (
          <div key={challenge.id} className={cn(index > 0 && 'pt-6', index < challenges.length - 1 && 'pb-6')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Eyebrow>{t('businessPortal.overview_selection_in_progress', 'Selection in progress')}</Eyebrow>
              <div className="flex items-center gap-2">
                {timeInfo.isExpiringSoon && <Chip>{t('business.dashboard.expiring_soon')}</Chip>}
                <Chip tone="status">{t('businessPortal.overview_challenge_active_chip', 'Active challenge')}</Chip>
              </div>
            </div>

            <h2 className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.4px] text-foreground sm:text-[25px]">{challenge.title}</h2>
            {challenge.hiring_goal_title && (
              <p className="mt-1.5 text-sm text-muted-foreground">{challenge.hiring_goal_title}</p>
            )}

            <div className="my-5 flex divide-x divide-[hsl(var(--xs-line))]">
              <Stat value={challenge.invited_count} label={t('businessPortal.overview_stat_invited', 'Invited')} className="pr-6" />
              <Stat value={challenge.responses_count} label={t('businessPortal.overview_stat_responses', 'Responses received')} className="pl-6" />
              {isDev && (
                <span className="self-end pl-6 font-mono text-[11px] text-amber-600">
                  inv={challenge.invited_count} resp={challenge.responses_count}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                {statusLine}
                <br />
                <span className="pl-3">{timeInfo.remainingText || t('businessPortal.overview_no_deadline', 'No deadline')}</span>
              </p>
              <Button onClick={() => navigate(responsesPath)} className="w-full sm:w-auto">
                {t('businessPortal.challenge_view_responses')} <span aria-hidden="true">↗</span>
              </Button>
            </div>
          </div>
        );
      })}
    </Panel>
  );
};
