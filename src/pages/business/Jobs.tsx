import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';

import BusinessLayout from '@/components/business/BusinessLayout';
import { PageHeader, Panel } from '@/components/layout/PageHeader';
import { StatusTabs } from '@/components/layout/StatusTabs';
import { Button } from '@/components/ui/button';
import {
  Plus,
  MapPin,
  FileUp,
  Target,
  Loader2,
  Archive,
  Link2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import PdfImportModal from '@/components/business/PdfImportModal';
import JobPostDetailDrawer from '@/components/business/JobPostDetailDrawer';
import { format } from 'date-fns';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';

interface JobPost {
  id: string;
  title: string;
  status: string;
  locale: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements_must: string | null;
  requirements_nice: string | null;
  benefits: string | null;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  department: string | null;
  salary_range: string | null;
  created_at: string;
  updated_at: string;
  linkedChallengesCount?: number;
}

type StatusFilter = 'all' | 'draft' | 'active' | 'archived';
type Column = Exclude<StatusFilter, 'all'>;

const COLUMNS: Column[] = ['draft', 'active', 'archived'];

/** Column a post belongs to. The detail drawer writes 'published' where the
 *  creation form writes 'active'; both are live posts. */
const columnOf = (status: string): Column =>
  status === 'archived' ? 'archived' : status === 'active' || status === 'published' ? 'active' : 'draft';

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: roleLoading } = useBusinessRole();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Handle jobPostId from URL query param (for redirect after PDF import)
  useEffect(() => {
    const jobPostIdFromUrl = searchParams.get('jobPostId');
    if (jobPostIdFromUrl && !loading && jobs.length > 0) {
      setSelectedJobId(jobPostIdFromUrl);
      // Clean up URL
      searchParams.delete('jobPostId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, loading, jobs]);

  useEffect(() => {
    if (!roleLoading && !isBusiness) {
      navigate('/login');
    }
  }, [isBusiness, roleLoading, navigate]);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch job posts
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('business_id', user.id)
        .order('updated_at', { ascending: false });

      if (jobsError) throw jobsError;

      const jobIds = (jobsData || []).map(j => j.id);

      // Fetch linked challenges count
      const challengeCounts: Record<string, number> = {};
      if (jobIds.length > 0) {
        const { data: challenges, error: challengesError } = await supabase
          .from('business_challenges')
          .select('job_post_id')
          .in('job_post_id', jobIds);

        if (!challengesError && challenges) {
          challenges.forEach(c => {
            if (c.job_post_id) {
              challengeCounts[c.job_post_id] = (challengeCounts[c.job_post_id] || 0) + 1;
            }
          });
        }
      }

      // Merge counts
      const jobsWithCounts = (jobsData || []).map(job => ({
        ...job,
        linkedChallengesCount: challengeCounts[job.id] || 0
      }));

      setJobs(jobsWithCounts);
    } catch (error) {
      log.error('Error fetching jobs:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (isAuthenticated && isBusiness && user?.id) {
      fetchJobs();
    }
  }, [isAuthenticated, isBusiness, user?.id, fetchJobs]);

  const statusCounts: Record<StatusFilter, number> = {
    all: jobs.length,
    draft: jobs.filter(j => columnOf(j.status) === 'draft').length,
    active: jobs.filter(j => columnOf(j.status) === 'active').length,
    archived: jobs.filter(j => columnOf(j.status) === 'archived').length
  };

  const handleArchiveJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('business_id', user?.id ?? '');

      if (error) throw error;

      toast.success(t('jobs.job_archived'));
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  const columnLabel: Record<Column, string> = {
    draft: t('businessPortal.jobs_filter_draft'),
    active: t('businessPortal.jobs_filter_published'),
    archived: t('businessPortal.jobs_filter_archived'),
  };
  const columnEmpty: Record<Column, { title: string; hint: string }> = {
    draft: { title: t('businessPortal.jobs_col_draft_empty'), hint: t('businessPortal.jobs_col_draft_hint') },
    active: { title: t('businessPortal.jobs_col_published_empty'), hint: t('businessPortal.jobs_col_published_hint') },
    archived: { title: t('businessPortal.jobs_col_archived_empty'), hint: t('businessPortal.jobs_col_archived_hint') },
  };
  const visibleColumns = statusFilter === 'all' ? COLUMNS : COLUMNS.filter(c => c === statusFilter);

  if (roleLoading || loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <PageHeader
        title={t('businessPortal.jobs_page_title')}
        subtitle={t('businessPortal.jobs_page_subtitle')}
        actions={(
          <div className="flex items-baseline gap-2">
            <span className="xs-num text-[28px] font-semibold leading-none text-foreground">{jobs.length}</span>
            <span className="text-[13px] leading-tight text-muted-foreground">{t('businessPortal.jobs_total_label')}</span>
          </div>
        )}
      />

      {/* Control deck: filters + actions in one bar. */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <StatusTabs
          label={t('businessPortal.jobs_filter_label')}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          className="md:flex-1"
          items={[
            { value: 'all', label: t('businessPortal.jobs_filter_all'), count: statusCounts.all },
            { value: 'draft', label: t('businessPortal.jobs_filter_draft'), count: statusCounts.draft },
            { value: 'active', label: t('businessPortal.jobs_filter_published'), count: statusCounts.active },
            { value: 'archived', label: t('businessPortal.jobs_filter_archived'), count: statusCounts.archived },
          ]}
        />
        <div className="flex shrink-0 flex-wrap gap-2 md:pb-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowPdfImport(true)}>
            <FileUp className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('businessPortal.jobs_import_pdf')}
          </Button>
          <Button size="sm" onClick={() => navigate('/business/jobs/new')}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('businessPortal.jobs_page_create_cta')}
          </Button>
        </div>
      </div>

      <PdfImportModal
        open={showPdfImport}
        onOpenChange={setShowPdfImport}
        onSuccess={fetchJobs}
      />

      {/* Status board */}
      <div className={cn('grid gap-4', visibleColumns.length === 3 && 'lg:grid-cols-3')}>
        {visibleColumns.map((column) => {
          const items = jobs.filter(j => columnOf(j.status) === column);
          return (
            <section key={column} aria-label={columnLabel[column]} className="xs-panel !p-0">
              <header className="flex items-center justify-between border-b border-[hsl(var(--xs-line))] px-5 py-3">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  <span
                    className={cn('h-2 w-2 rounded-full', column === 'active' ? 'bg-primary' : column === 'draft' ? 'bg-muted-foreground/60' : 'bg-muted-foreground/30')}
                    aria-hidden="true"
                  />
                  {columnLabel[column]}
                </span>
                <span className="xs-num text-sm text-muted-foreground">{items.length}</span>
              </header>

              {items.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">{columnEmpty[column].title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{columnEmpty[column].hint}</p>
                </div>
              ) : (
                <ul className="divide-y divide-[hsl(var(--xs-line))]">
                  {items.map((job) => (
                    <li key={job.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedJobId(job.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedJobId(job.id); } }}
                        className="group cursor-pointer px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-foreground">{job.title}</h3>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                          {job.department && <span>{job.department}</span>}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {job.location}
                            </span>
                          )}
                          {job.employment_type && <span>{job.employment_type}</span>}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t('jobs.updated_at', { date: format(new Date(job.updated_at), 'MMM d, yyyy') })}
                            {job.linkedChallengesCount !== undefined && job.linkedChallengesCount > 0 && (
                              <span className="ml-3 inline-flex items-center gap-1">
                                <Link2 className="h-3 w-3" aria-hidden="true" />
                                {job.linkedChallengesCount} {t('jobs.linked_challenges')}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/business/challenges/select?from_listing=${job.id}`);
                              }}
                            >
                              <Target className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="ml-1">{t('business.challenges.create_from_listing')}</span>
                            </Button>
                            {columnOf(job.status) !== 'archived' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                aria-label={t('challenges.archive')}
                                title={t('challenges.archive')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveJob(job.id);
                                }}
                              >
                                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <Panel className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-foreground">{t('businessPortal.jobs_page_empty_headline')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('businessPortal.jobs_page_empty_body')}</p>
          </div>
          <Button onClick={() => navigate('/business/jobs/new')} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('businessPortal.jobs_create_first_cta')}
          </Button>
        </Panel>
      )}

      {/* Detail Drawer */}
      <JobPostDetailDrawer
        job={selectedJob}
        open={!!selectedJobId}
        onOpenChange={(open) => !open && setSelectedJobId(null)}
        onUpdate={fetchJobs}
      />
    </BusinessLayout>
  );
}
