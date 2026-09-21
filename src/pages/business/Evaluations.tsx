import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { SubmissionDetailDrawer } from '@/components/business/SubmissionDetailDrawer';
import {
  useBusinessSubmissions,
  type BusinessSubmissionRow,
  type EvaluationStatus,
} from '@/hooks/useBusinessSubmissions';
import type { ReviewDecision } from '@/hooks/useChallengeResponsesData';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Filter = 'all' | EvaluationStatus;

const STATUS_STYLES: Record<EvaluationStatus, string> = {
  invited: 'border-[hsl(var(--xs-line))] bg-muted/40 text-muted-foreground',
  in_progress: 'border-[hsl(var(--xs-line))] bg-muted/40 text-foreground',
  submitted: 'border-primary/30 bg-primary/10 text-primary',
  reviewed: 'border-primary/30 bg-primary/10 text-primary',
  declined: 'border-[hsl(var(--xs-line))] bg-muted/40 text-muted-foreground',
  expired: 'border-[hsl(var(--xs-line))] bg-muted/40 text-muted-foreground',
};

const FILTERS: Filter[] = ['all', 'submitted', 'in_progress', 'invited', 'reviewed'];

const BusinessEvaluations = () => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { rows, loading, error, refetch, updateRowDecision } = useBusinessSubmissions(user?.id);
  const [filter, setFilter] = useState<Filter>('all');
  // The candidate shown in the right panel; the drawer opens on top of it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.evaluationStatus === filter)),
    [rows, filter],
  );

  // Keep a row selected whenever the list has one.
  useEffect(() => {
    if (visible.length === 0) return;
    if (!selectedId || !visible.some((r) => r.invitationId === selectedId)) {
      setSelectedId(visible[0].invitationId);
    }
  }, [visible, selectedId]);

  const selected = useMemo<BusinessSubmissionRow | null>(
    () => rows.find((r) => r.invitationId === selectedId) ?? null,
    [rows, selectedId],
  );

  const handleReviewSaved = useCallback(
    (decision: NonNullable<ReviewDecision>, followupQuestion?: string | null) => {
      if (selectedId) updateRowDecision(selectedId, decision, followupQuestion);
    },
    [selectedId, updateRowDecision],
  );

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const countFor = (f: Filter) => (f === 'all' ? rows.length : rows.filter((r) => r.evaluationStatus === f).length);
  const received = rows.filter((r) => r.evaluationStatus === 'submitted' || r.evaluationStatus === 'reviewed').length;
  const reviewed = countFor('reviewed');
  const challengeCount = new Set(rows.map((r) => r.challengeId)).size;

  const statusChip = (status: EvaluationStatus, className?: string) => (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status], className)}>
      {t(`businessPortal.evaluations_status_${status}`)}
    </span>
  );

  const canOpen = selected?.submissionStatus === 'submitted';
  const waiting = !selected || !canOpen;

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow={selected?.roleTitle ? `${t('businessPortal.nav_evaluations')} / ${selected.roleTitle}` : undefined}
        title={t('businessPortal.evaluations_page_title')}
        subtitle={t('businessPortal.evaluations_page_subtitle')}
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : error ? (
        <Panel className="space-y-4 text-center">
          <p className="text-muted-foreground">{t('businessPortal.evaluations_load_error')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('businessPortal.evaluations_retry')}
          </Button>
        </Panel>
      ) : rows.length === 0 ? (
        <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Eyebrow>{t('businessPortal.evaluations_empty_headline')}</Eyebrow>
            <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.5px] text-foreground">
              {t('businessPortal.evaluations_waiting_title')}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t('businessPortal.evaluations_empty_body')}</p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/business/challenges">{t('businessPortal.evaluations_empty_cta')}</Link>
          </Button>
        </Panel>
      ) : (
        <>
          {/* Counters line */}
          <p className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span><strong className="xs-num text-foreground">{rows.length}</strong> {t('businessPortal.evaluations_counter_invited')}</span>
            <span><strong className="xs-num text-foreground">{received}</strong> {t('businessPortal.evaluations_counter_received')}</span>
            <span><strong className="xs-num text-foreground">{reviewed}</strong> {t('businessPortal.evaluations_counter_reviewed')}</span>
          </p>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Left: challenges in play + candidate list */}
            <Panel className="!p-0">
              <div className="border-b border-[hsl(var(--xs-line))] px-6 py-5">
                <Eyebrow>{t('businessPortal.evaluations_active_challenges')}</Eyebrow>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  <strong className="xs-num text-foreground">{challengeCount}</strong>
                  {' · '}
                  <strong className="xs-num text-foreground">{rows.length}</strong> {t('businessPortal.evaluations_counter_invited')}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[17px] font-semibold text-foreground">
                    {t('businessPortal.evaluations_list_title')}{' '}
                    <span className="xs-eyebrow !inline">{String(visible.length).padStart(2, '0')}</span>
                  </h2>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    {t('businessPortal.evaluations_filter_label')}
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as Filter)}
                      className="rounded-md border border-[hsl(var(--xs-line))] bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {FILTERS.map((f) => (
                        <option key={f} value={f}>
                          {f === 'all' ? t('businessPortal.evaluations_filter_all_statuses') : t(`businessPortal.evaluations_filter_${f}`)} ({countFor(f)})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {visible.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t('businessPortal.evaluations_filter_empty')}</p>
              ) : (
                <ul className="divide-y divide-[hsl(var(--xs-line))]">
                  {visible.map((row) => {
                    const active = row.invitationId === selectedId;
                    return (
                      <li key={row.invitationId}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedId(row.invitationId)}
                          className={cn(
                            'flex w-full items-center gap-4 border-l-2 px-6 py-3.5 text-left transition-colors',
                            active ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/40',
                          )}
                        >
                          {row.ximatarArchetype && (
                            <img
                              src={`/ximatars/${row.ximatarArchetype}.webp`}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-foreground">{row.candidateName}</p>
                            <p className="truncate text-[13px] text-muted-foreground">
                              {row.challengeTitle}
                              {row.roleTitle ? ` · ${row.roleTitle}` : ''}
                            </p>
                          </div>
                          {statusChip(row.evaluationStatus, 'shrink-0')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="border-t border-[hsl(var(--xs-line))] px-6 py-3 text-xs text-muted-foreground">
                {t('businessPortal.evaluations_list_end', { count: visible.length })}
              </p>
            </Panel>

            {/* Right: selected candidate (the one translucent surface). */}
            <Panel glass className="lg:sticky lg:top-20 lg:self-start">
              <Eyebrow>{t('businessPortal.evaluations_selected_eyebrow')}</Eyebrow>
              {selected ? (
                <>
                  <div className="my-5 flex items-center gap-4">
                    {selected.ximatarArchetype && (
                      <img
                        src={`/ximatars/${selected.ximatarArchetype}.webp`}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-[19px] font-semibold leading-tight text-foreground">{selected.candidateName}</h2>
                      <div className="mt-1.5">{statusChip(selected.evaluationStatus)}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selected.challengeTitle}
                    {selected.roleTitle ? ` · ${selected.roleTitle}` : ''}
                  </p>

                  <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-[hsl(var(--xs-line))] py-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('businessPortal.evaluations_detail_response')}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">
                        {selected.submittedAt
                          ? t('businessPortal.evaluations_submitted_on', { date: formatDate(selected.submittedAt) })
                          : t('businessPortal.evaluations_response_pending')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('businessPortal.evaluations_detail_evaluation')}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">
                        {selected.evaluationStatus === 'reviewed' ? t('businessPortal.evaluations_evaluation_done') : '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <Eyebrow>
                      {waiting
                        ? t('businessPortal.evaluations_waiting_eyebrow')
                        : t('businessPortal.evaluations_received_eyebrow')}
                    </Eyebrow>
                    <h3 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
                      {waiting
                        ? t('businessPortal.evaluations_waiting_title')
                        : selected.evaluationStatus === 'reviewed'
                          ? t('businessPortal.evaluations_reviewed_title')
                          : t('businessPortal.evaluations_received_title')}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {waiting
                        ? t('businessPortal.evaluations_waiting_body')
                        : selected.evaluationStatus === 'reviewed'
                          ? t('businessPortal.evaluations_reviewed_body')
                          : t('businessPortal.evaluations_received_body')}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {canOpen ? (
                        <Button onClick={() => setDrawerOpen(true)}>
                          {t('businessPortal.evaluations_open_review')}
                        </Button>
                      ) : (
                        <Button disabled>{t('businessPortal.evaluations_open_review')}</Button>
                      )}
                      <Button variant="outline" asChild>
                        <Link to={`/business/hiring-goals/${selected.hiringGoalId}/challenges/${selected.challengeId}/responses`}>
                          {t('businessPortal.evaluations_view_challenge')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t('businessPortal.evaluations_select_hint')}</p>
              )}
            </Panel>
          </div>
        </>
      )}

      {/* Mounted only while open, as before, so the drawer's own fetches run on demand. */}
      {selected && user?.id && drawerOpen && (
        <SubmissionDetailDrawer
          open={drawerOpen}
          onOpenChange={(open) => {
            if (!open) setDrawerOpen(false);
          }}
          submission={selected}
          challenge={{
            id: selected.challengeId,
            title: selected.challengeTitle,
            description: selected.challengeDescription,
            successCriteria: selected.challengeSuccessCriteria,
            rubric: selected.challengeRubric,
          }}
          businessId={user.id}
          challengeId={selected.challengeId}
          hiringGoalId={selected.hiringGoalId}
          onSignalsGenerated={refetch}
          onReviewSaved={handleReviewSaved}
          onLevel2InviteSent={refetch}
          onLevel3InviteSent={refetch}
        />
      )}
    </BusinessLayout>
  );
};

export default BusinessEvaluations;
