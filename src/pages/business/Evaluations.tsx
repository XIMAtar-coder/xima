import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/UserContext';
import { SubmissionDetailDrawer } from '@/components/business/SubmissionDetailDrawer';
import {
  useBusinessSubmissions,
  type BusinessSubmissionRow,
  type EvaluationStatus,
} from '@/hooks/useBusinessSubmissions';
import type { ReviewDecision } from '@/hooks/useChallengeResponsesData';
import { FileText, Loader2 } from 'lucide-react';

type Filter = 'all' | EvaluationStatus;

const STATUS_STYLES: Record<EvaluationStatus, string> = {
  invited: 'bg-muted text-muted-foreground',
  in_progress: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  submitted: 'bg-primary/15 text-primary',
  reviewed: 'bg-green-500/15 text-green-700 dark:text-green-400',
  declined: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};

const FILTERS: Filter[] = ['all', 'submitted', 'in_progress', 'invited', 'reviewed'];

const BusinessEvaluations = () => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { rows, loading, error, refetch, updateRowDecision } = useBusinessSubmissions(user?.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo<BusinessSubmissionRow | null>(
    () => rows.find((r) => r.invitationId === selectedId) ?? null,
    [rows, selectedId],
  );

  const visible = filter === 'all' ? rows : rows.filter((r) => r.evaluationStatus === filter);

  const handleReviewSaved = useCallback(
    (decision: NonNullable<ReviewDecision>, followupQuestion?: string | null) => {
      if (selectedId) updateRowDecision(selectedId, decision, followupQuestion);
    },
    [selectedId, updateRowDecision],
  );

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const countFor = (f: Filter) => (f === 'all' ? rows.length : rows.filter((r) => r.evaluationStatus === f).length);

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.evaluations_page_title')}</h1>
          <p className="text-muted-foreground">{t('businessPortal.evaluations_page_subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[40vh]" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">{t('common.loading')}</span>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">{t('businessPortal.evaluations_load_error')}</p>
              <Button variant="outline" onClick={() => refetch()}>
                {t('businessPortal.evaluations_retry')}
              </Button>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto mb-4 text-muted-foreground" size={48} aria-hidden="true" />
              <p className="text-foreground text-lg mb-2">{t('businessPortal.evaluations_empty_headline')}</p>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                {t('businessPortal.evaluations_empty_body')}
              </p>
              <Button asChild>
                <Link to="/business/challenges">{t('businessPortal.evaluations_empty_cta')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="flex-wrap h-auto">
                {FILTERS.map((f) => (
                  <TabsTrigger key={f} value={f}>
                    {t(`businessPortal.evaluations_filter_${f}`)} ({countFor(f)})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('businessPortal.evaluations_filter_empty')}
              </p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {visible.map((row) => {
                      const canOpen = row.submissionStatus === 'submitted';
                      return (
                        <li
                          key={row.invitationId}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium text-foreground truncate">{row.candidateName}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {row.challengeTitle}
                              {row.roleTitle ? ` · ${row.roleTitle}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.submittedAt
                                ? t('businessPortal.evaluations_submitted_on', { date: formatDate(row.submittedAt) })
                                : t('businessPortal.evaluations_invited_on', { date: formatDate(row.invitedAt) })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge className={STATUS_STYLES[row.evaluationStatus]} variant="secondary">
                              {t(`businessPortal.evaluations_status_${row.evaluationStatus}`)}
                            </Badge>
                            {canOpen ? (
                              <Button size="sm" onClick={() => setSelectedId(row.invitationId)}>
                                {row.evaluationStatus === 'reviewed'
                                  ? t('businessPortal.evaluations_open_review')
                                  : t('businessPortal.evaluations_review')}
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/business/hiring-goals/${row.hiringGoalId}/challenges/${row.challengeId}/responses`}>
                                  {t('businessPortal.evaluations_view_challenge')}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {selected && user?.id && (
          <SubmissionDetailDrawer
            open={!!selected}
            onOpenChange={(open) => {
              if (!open) setSelectedId(null);
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
      </div>
    </BusinessLayout>
  );
};

export default BusinessEvaluations;
