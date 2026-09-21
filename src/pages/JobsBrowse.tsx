import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { OpportunitiesTabs } from '@/components/candidate/OpportunitiesTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import Seo from '@/components/Seo';
import { cn } from '@/lib/utils';
import { log } from '@/lib/log';

interface JobFilters {
  location: string;
  work_mode: string;
  seniority: string;
}

interface NormalisedJob {
  id: string;
  title: string;
  company: string;
  description: string;
  narrative: string;
  matchScore: number | null;
  location: string | null;
  workMode: string | null;
  seniority: string | null;
  salary: string | null;
  rawTitle: string | null;
  createdAt: string | null;
}

const normalise = (job: any): NormalisedJob => ({
  id: job.id || job.job_id || job.job?.id,
  title: job.role_title || job.title || job.job?.title || '',
  company: job.company_name || job.company || job.job?.company || '',
  description: job.description || '',
  narrative: job.xima_narrative || '',
  matchScore: typeof job.match_score === 'number' ? job.match_score : null,
  location: job.location || job.job?.location || null,
  workMode: job.work_mode || job.job?.work_mode || null,
  seniority: job.seniority || job.job?.seniority || null,
  salary: job.salary_range || job.salary || job.job?.salary || null,
  rawTitle: job.raw_title || job.original_title || null,
  createdAt: job.created_at || null,
});

const fieldClass = 'h-11 w-full rounded-md border border-[hsl(var(--xs-line))] bg-background px-3 text-[14px] text-foreground';

/** One row of the suggestions / all listings list. */
const JobRow: React.FC<{ job: NormalisedJob; selected: boolean; onSelect: () => void }> = ({ job, selected, onSelect }) => {
  const { t } = useTranslation();
  const initial = (job.company || job.title || '—').charAt(0).toUpperCase();
  const line = job.narrative || job.description || t('jobs.no_description', 'No description available.');

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'block w-full border-b border-[hsl(var(--xs-line))] px-5 py-4 text-left transition-colors last:border-b-0',
        selected ? 'bg-primary/[0.06]' : 'hover:bg-[hsl(var(--xs-page))]/60',
      )}
    >
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--xs-line))] font-mono text-[11px] text-foreground" aria-hidden="true">{initial}</span>
        {job.company || '—'}
      </span>
      <span className="mt-1.5 block text-[16px] font-semibold leading-snug text-foreground">{job.title || t('jobs.untitled', 'Position')}</span>
      <span className="mt-1 line-clamp-1 block text-[13px] text-muted-foreground">{line}</span>
      <span className="mt-2.5 flex items-center justify-between gap-3">
        <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {job.matchScore !== null ? t('jobs.affinity_value', { value: job.matchScore, defaultValue: '{{value}}% affinity' }) : t('jobs.affinity_unknown', 'Affinity —')}
        </span>
        <span className="text-[13px] font-semibold text-primary">{t('jobs.view_details', 'Details')} →</span>
      </span>
    </button>
  );
};

const JobsBrowse = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [filters, setFilters] = useState<JobFilters>({ location: '', work_mode: '', seniority: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Fetch all active hiring goals
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-browse', filters],
    queryFn: async () => {
      const query = supabase
        .from('hiring_goal_drafts' as any)
        .select('id, role_title, description, created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data } = await query;
      return (data || []) as any[];
    },
  });

  // Fetch matched jobs for logged-in user
  const { data: matches } = useQuery({
    queryKey: ['jobs-matches', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('recommend-jobs', {
          body: { user_id: user?.id, limit: 10 },
        });
        if (error) {
          log.warn('[jobs-browse] recommend-jobs failed:', error);
          return [];
        }
        return data?.recommendations || data?.opportunities || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 120000,
  });

  const suggestions: NormalisedJob[] = (matches || []).map(normalise);
  const allJobs: NormalisedJob[] = (jobs || []).map(normalise);
  const everything = [...suggestions, ...allJobs];
  const selected = everything.find(j => j.id === selectedId) || suggestions[0] || allJobs[0] || null;

  useEffect(() => {
    if (!selectedId && selected) setSelectedId(selected.id);
  }, [selectedId, selected]);

  const facts: Array<{ label: string; value: string | null }> = selected ? [
    { label: t('jobs.fact_location', 'Location'), value: selected.location },
    { label: t('jobs.fact_work_mode', 'Work mode'), value: selected.workMode },
    { label: t('jobs.fact_experience', 'Experience'), value: selected.seniority },
    { label: t('jobs.fact_salary', 'Salary'), value: selected.salary },
  ] : [];

  return (
    <CandidateLayout breadcrumb={<span className="block truncate">{t('nav.candidate_area', 'Your space')} / {t('jobs.hero_title', 'Your opportunities')}</span>}>
      <Seo
        title="Job Opportunities — Browse Open Roles | XIMA"
        description="Browse open job opportunities matched to your XIMAtar profile. Discover roles aligned with your behavioral strengths and growth path."
        path="/jobs"
      />
      <EmailVerificationBanner slim />
      <PageHeader
        eyebrow={t('dashboard.eyebrow', 'Your personal space')}
        title={t('jobs.hero_title', 'Your opportunities')}
        subtitle={t('jobs.hero_subtitle', 'Explore the listings and follow the proposals from companies.')}
      />
      <OpportunitiesTabs active="jobs" />

      {/* Filters */}
      <Panel className="!py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground">{t('jobs.filter_location', 'City or country')}</span>
            <Input
              value={filters.location}
              onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
              placeholder={t('jobs.location_placeholder', 'Search a location')}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground">{t('jobs.filter_work_mode', 'Work mode')}</span>
            <select value={filters.work_mode} onChange={e => setFilters(f => ({ ...f, work_mode: e.target.value }))} className={fieldClass}>
              <option value="">{t('jobs.any_work_mode', 'Any work mode')}</option>
              <option value="remote">{t('profile_completion.work_remote', 'Remote')}</option>
              <option value="hybrid">{t('profile_completion.work_hybrid', 'Hybrid')}</option>
              <option value="onsite">{t('profile_completion.work_onsite', 'On-site')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground">{t('jobs.filter_experience', 'Experience')}</span>
            <select value={filters.seniority} onChange={e => setFilters(f => ({ ...f, seniority: e.target.value }))} className={fieldClass}>
              <option value="">{t('jobs.any_seniority', 'Any seniority')}</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </label>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Suggestions for you */}
          {suggestions.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-[19px] font-semibold tracking-[-0.3px] text-foreground">
                  {t('jobs.suggestions_title', 'Suggestions for you')} <span className="xs-num font-mono text-[13px] text-muted-foreground">{suggestions.length}</span>
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t('jobs.affinity_exploratory', 'Exploratory affinity')}</span>
              </div>
              <Panel className="!p-0">
                {suggestions.map(job => (
                  <JobRow key={job.id} job={job} selected={selected?.id === job.id} onSelect={() => setSelectedId(job.id)} />
                ))}
              </Panel>
            </section>
          )}

          {/* All listings */}
          <section>
            <h2 className="mb-2 text-[19px] font-semibold tracking-[-0.3px] text-foreground">
              {t('jobs.all_jobs', 'All listings')} <span className="xs-num font-mono text-[13px] text-muted-foreground">{allJobs.length}</span>
            </h2>
            {jobsLoading ? (
              <Panel className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </Panel>
            ) : allJobs.length === 0 ? (
              <Panel className="py-10 text-center">
                <p className="text-[15px] font-semibold text-foreground">{t('jobs.no_results', 'No listing matches your filters')}</p>
                <Button variant="outline" className="mt-4" onClick={() => setFilters({ location: '', work_mode: '', seniority: '' })}>
                  {t('jobs.reset_filters', 'Clear filters')}
                </Button>
              </Panel>
            ) : (
              <Panel className="!p-0">
                {allJobs.map(job => (
                  <JobRow key={job.id} job={job} selected={selected?.id === job.id} onSelect={() => setSelectedId(job.id)} />
                ))}
              </Panel>
            )}
          </section>
        </div>

        {/* Selected listing detail */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {selected ? (
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <Eyebrow>{t('jobs.detail_eyebrow', 'Listing record')}</Eyebrow>
                {facts.some(f => !f.value) && (
                  <span className="shrink-0 rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {t('jobs.partial_info', 'Partial information')}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-foreground">{selected.title || t('jobs.untitled', 'Position')}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{selected.company || '—'}</p>

              <div className="mt-4">
                <div className="flex items-baseline gap-3">
                  <strong className="xs-num font-mono text-[22px] font-medium text-primary">
                    {selected.matchScore !== null ? `${selected.matchScore}%` : '—'}
                  </strong>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-[hsl(var(--xs-line))]">
                    <div className="h-full bg-primary" style={{ width: `${selected.matchScore ?? 0}%` }} />
                  </div>
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">{t('jobs.affinity_note', 'Indicative affinity · to be explored')}</p>
              </div>

              {(selected.narrative || selected.description) && (
                <div className="mt-4 border-t border-[hsl(var(--xs-line))] pt-4">
                  <strong className="text-[14px] font-semibold text-foreground">{t('jobs.why_match', 'Why it is suggested')}</strong>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{selected.narrative || selected.description}</p>
                </div>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[hsl(var(--xs-line))] pt-4">
                {facts.map(fact => (
                  <div key={fact.label}>
                    <dt className="text-[12px] text-muted-foreground">{fact.label}</dt>
                    <dd className="text-[14px] font-medium text-foreground">{fact.value || '—'}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[12px] text-muted-foreground">{t('jobs.dash_note', '— means the data is not available.')}</p>

              {selected.rawTitle && (
                <div className="mt-4 border-t border-[hsl(var(--xs-line))] pt-3">
                  <button type="button" onClick={() => setImportOpen(o => !o)} aria-expanded={importOpen} className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    {t('jobs.import_data', 'Import data')}
                    <ChevronDown size={14} className={cn('transition-transform', importOpen && 'rotate-180')} aria-hidden="true" />
                  </button>
                  {importOpen && <p className="mt-2 text-[13px] text-muted-foreground">{t('jobs.original_title', 'Original title')}: {selected.rawTitle}</p>}
                </div>
              )}

              <Button className="mt-5 w-full" onClick={() => navigate(`/opportunity/${selected.id}`)}>
                {t('jobs.open_listing', 'Open the listing')} →
              </Button>
            </Panel>
          ) : (
            <Panel className="py-10 text-center">
              <p className="text-[14px] text-muted-foreground">{t('jobs.select_hint', 'Select a listing to see its record.')}</p>
            </Panel>
          )}
        </aside>
      </div>
    </CandidateLayout>
  );
};

export default JobsBrowse;
