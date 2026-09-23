import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { PageHeader, Panel, Stat } from '@/components/layout/PageHeader';
import { StatusTabs } from '@/components/layout/StatusTabs';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useChallengeStatsMap } from '@/hooks/useChallengeResponsesData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/lib/data/useSupabaseQuery';
import { Plus, Loader2, ArrowUpRight } from 'lucide-react';
import ChallengeContextSelector from '@/components/business/ChallengeContextSelector';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  status: string;
  hiring_goal_id: string | null;
  role_title: string | null;
  deadline: string | null;
  end_at: string | null;
  updated_at: string;
  created_at: string;
}

type Filter = 'all' | 'active' | 'archived';

const BusinessChallenges = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contextSelectorOpen, setContextSelectorOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
    }
  }, [isAuthenticated, isBusiness, businessLoading, navigate]);

  // Data-layer query: business challenges + hiring goal role titles.
  const enabled = !!user?.id && !businessLoading && isBusiness;
  const { data: challenges = [], isLoading: loading, refetch } = useSupabaseQuery<Challenge[]>(
    ['business_challenges', user?.id],
    async () => {
      const { data: challengesData, error } = await supabase
        .from('business_challenges')
        .select('id, title, description, status, hiring_goal_id, deadline, end_at, updated_at, created_at')
        .eq('business_id', user?.id ?? '')
        .order('updated_at', { ascending: false });
      if (error) return { data: null, error };

      const goalIds = [...new Set((challengesData || []).map(c => c.hiring_goal_id).filter((id): id is string => !!id))];
      const goalsMap: Record<string, string> = {};
      if (goalIds.length > 0) {
        const { data: goalsData } = await supabase
          .from('hiring_goal_drafts')
          .select('id, role_title')
          .in('id', goalIds);
        goalsData?.forEach((g: any) => { goalsMap[g.id] = g.role_title || ''; });
      }

      const enriched: Challenge[] = (challengesData || []).map((c: any) => ({
        ...c,
        role_title: c.hiring_goal_id ? goalsMap[c.hiring_goal_id] || null : null,
      }));
      return { data: enriched, error: null };
    },
    {
      enabled,
      staleTime: 30_000,
    }
  );

  // Invited / responses per challenge: same hook the dashboard uses.
  const challengeIds = useMemo(() => (challenges ?? []).map(c => c.id), [challenges]);
  const { statsMap } = useChallengeStatsMap(user?.id, challengeIds);

  const loadChallenges = () => { refetch(); };

  const handleActivate = async (challengeId: string, hiringGoalId: string | null) => {
    setActionLoading(challengeId);
    try {
      // If there's a hiring goal, archive other active challenges for the same goal
      if (hiringGoalId) {
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', user?.id ?? '')
          .eq('hiring_goal_id', hiringGoalId)
          .eq('status', 'active')
          .neq('id', challengeId);
      }

      // Activate this challenge
      const { error } = await supabase
        .from('business_challenges')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: t('challenges.activated'),
        description: t('challenges.activated_desc')
      });

      loadChallenges();
    } catch (error) {
      log.error('Error activating challenge:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.activate_error'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (challengeId: string) => {
    setActionLoading(challengeId);
    try {
      const { error } = await supabase
        .from('business_challenges')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: t('challenges.archived'),
        description: t('challenges.archived_desc')
      });

      loadChallenges();
    } catch (error) {
      log.error('Error archiving challenge:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.archive_error'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (challenge: Challenge) => {
    setActionLoading(challenge.id);
    try {
      // Get full challenge data
      const { data: fullChallenge, error: fetchError } = await supabase
        .from('business_challenges')
        .select('*')
        .eq('id', challenge.id)
        .single();

      if (fetchError) throw fetchError;

      // Create a duplicate
      const { error } = await supabase
        .from('business_challenges')
        .insert({
          business_id: user?.id ?? '',
          hiring_goal_id: fullChallenge.hiring_goal_id,
          title: `${fullChallenge.title} (Copy)`,
          description: fullChallenge.description,
          success_criteria: fullChallenge.success_criteria,
          time_estimate_minutes: fullChallenge.time_estimate_minutes,
          rubric: fullChallenge.rubric,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: t('challenges.duplicated'),
        description: t('challenges.duplicated_desc')
      });

      loadChallenges();
    } catch (error) {
      log.error('Error duplicating challenge:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.duplicate_error'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const responsesPath = (challenge: Challenge) => challenge.hiring_goal_id
    ? `/business/hiring-goals/${challenge.hiring_goal_id}/challenges/${challenge.id}/responses`
    : `/business/challenges/${challenge.id}/responses`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('businessPortal.challenge_status_active');
      case 'draft': return t('businessPortal.challenge_status_draft');
      case 'archived': return t('businessPortal.challenge_status_archived');
      default: return status;
    }
  };

  const statusChip = (status: string) => (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        status === 'active'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-[hsl(var(--xs-line))] bg-muted/40 text-muted-foreground',
      )}
    >
      {status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
      {statusLabel(status)}
    </span>
  );

  const list = challenges ?? [];
  const counts = {
    all: list.length,
    active: list.filter(c => c.status === 'active').length,
    archived: list.filter(c => c.status === 'archived').length,
  };
  const totals = list.reduce(
    (acc, c) => {
      const s = statsMap.get(c.id);
      acc.invited += s?.invited || 0;
      acc.responses += s?.responses || 0;
      return acc;
    },
    { invited: 0, responses: 0 },
  );
  const visible = filter === 'all' ? list : list.filter(c => c.status === filter);

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      </BusinessLayout>
    );
  }

  const cellLabel = 'text-[11px] uppercase tracking-wide text-muted-foreground md:hidden';

  return (
    <BusinessLayout>
      <PageHeader
        title={t('businessPortal.challenges_page_title')}
        subtitle={t('businessPortal.challenges_page_subtitle')}
        actions={(
          <Button onClick={() => setContextSelectorOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('businessPortal.challenges_new_cta')}
          </Button>
        )}
      />

      {/* Counters strip: the one translucent surface of this page. */}
      <Panel glass className="mb-6 grid grid-cols-3 gap-4 !py-5">
        <Stat value={counts.active} label={t('businessPortal.challenges_stat_active')} />
        <Stat value={totals.invited} label={<span className="capitalize">{t('businessPortal.challenge_invited_label')}</span>} />
        <Stat value={totals.responses} label={<span className="capitalize">{t('businessPortal.challenge_responses_label')}</span>} />
      </Panel>

      <StatusTabs
        label={t('businessPortal.challenges_filter_label')}
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        className="mb-4"
        items={[
          { value: 'all', label: t('businessPortal.challenges_filter_all'), count: counts.all },
          { value: 'active', label: t('businessPortal.challenges_filter_active'), count: counts.active },
          { value: 'archived', label: t('businessPortal.challenges_filter_archived'), count: counts.archived },
        ]}
      />

      <section aria-label={t('businessPortal.challenges_page_title')} className="xs-panel !p-0">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_90px_90px_150px] gap-4 border-b border-[hsl(var(--xs-line))] px-6 py-2.5 md:grid" aria-hidden="true">
          <span className="xs-eyebrow">{t('businessPortal.challenges_col_title')}</span>
          <span className="xs-eyebrow">{t('businessPortal.challenges_col_status')}</span>
          <span className="xs-eyebrow capitalize">{t('businessPortal.challenge_invited_label')}</span>
          <span className="xs-eyebrow capitalize">{t('businessPortal.challenge_responses_label')}</span>
          <span className="xs-eyebrow">{t('businessPortal.challenges_col_deadline')}</span>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">{t('challenges.no_challenges')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('challenges.no_challenges_desc')}</p>
            </div>
            <Button onClick={() => setContextSelectorOpen(true)} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('challenges.create_first')}
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t('businessPortal.challenges_filter_empty')}</p>
        ) : (
          <ul className="divide-y divide-[hsl(var(--xs-line))]">
            {visible.map((challenge) => {
              const stats = statsMap.get(challenge.id);
              const deadline = challenge.deadline || challenge.end_at;
              const busy = actionLoading === challenge.id;
              return (
                <li key={challenge.id} className="px-6 py-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_90px_90px_150px] md:items-center md:gap-4">
                    <div className="min-w-0">
                      <h2 className="text-[16px] font-semibold leading-snug text-foreground">
                        <button
                          type="button"
                          className="rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => navigate(responsesPath(challenge))}
                        >
                          {challenge.title}
                        </button>
                      </h2>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-muted-foreground">
                        {challenge.role_title && <span>{challenge.role_title}</span>}
                        <span>{t('businessPortal.challenges_created_on', { date: formatDate(challenge.created_at) })}</span>
                      </p>
                    </div>
                    <div>{statusChip(challenge.status)}</div>
                    <div className="flex items-baseline gap-2 md:block">
                      <span className={cellLabel}>{t('businessPortal.challenge_invited_label')}</span>
                      <span className="xs-num text-[15px] font-medium text-foreground">{stats?.invited ?? 0}</span>
                    </div>
                    <div className="flex items-baseline gap-2 md:block">
                      <span className={cellLabel}>{t('businessPortal.challenge_responses_label')}</span>
                      <span className="xs-num text-[15px] font-medium text-foreground">{stats?.responses ?? 0}</span>
                    </div>
                    <div className="flex items-baseline gap-2 md:block">
                      <span className={cellLabel}>{t('businessPortal.challenges_col_deadline')}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {deadline ? formatDate(deadline) : t('businessPortal.challenges_no_deadline')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Button variant="link" size="sm" className="h-auto gap-1 px-0 text-primary" onClick={() => navigate(responsesPath(challenge))}>
                      {t('businessPortal.challenge_view_responses')}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/business/challenges/${challenge.id}/edit`)} disabled={busy}>
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(challenge)} disabled={busy}>
                        {t('challenges.duplicate')}
                      </Button>
                      {challenge.status !== 'active' && (
                        <Button variant="outline" size="sm" onClick={() => handleActivate(challenge.id, challenge.hiring_goal_id)} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('challenges.activate')}
                        </Button>
                      )}
                      {challenge.status !== 'archived' && (
                        <Button variant="outline" size="sm" onClick={() => handleArchive(challenge.id)} disabled={busy}>
                          {t('challenges.archive')}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {list.length > 0 && (
        <p className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span>{t('businessPortal.challenges_legend_total', { count: list.length })}</span>
          <span>{t('businessPortal.challenges_legend_note')}</span>
        </p>
      )}

      <ChallengeContextSelector
        open={contextSelectorOpen}
        onOpenChange={setContextSelectorOpen}
      />
    </BusinessLayout>
  );
};

export default BusinessChallenges;
