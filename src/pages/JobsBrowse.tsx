import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Sparkles, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface JobFilters {
  location: string;
  work_mode: string;
  seniority: string;
}

const JobsBrowse = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [filters, setFilters] = useState<JobFilters>({
    location: '',
    work_mode: '',
    seniority: '',
  });

  // Fetch all active hiring goals
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-browse', filters],
    queryFn: async () => {
      let query = supabase
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
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['jobs-matches', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('recommend-jobs', {
          body: { user_id: user?.id, limit: 10 },
        });
        if (error) {
          console.warn('[jobs-browse] recommend-jobs failed:', error);
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

  const hasMatches = matches && matches.length > 0;

  return (
    <MainLayout requireAuth>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t('jobs.title', 'Offerte di Lavoro')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('jobs.subtitle', 'Esplora tutte le opportunità disponibili sulla piattaforma XIMA')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl border bg-secondary/20">
          <Input
            value={filters.location}
            onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
            placeholder={t('jobs.location_placeholder', 'Città o paese')}
            className="flex-1 min-w-[180px]"
          />
          <select
            value={filters.work_mode}
            onChange={e => setFilters(f => ({ ...f, work_mode: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm bg-background"
          >
            <option value="">{t('jobs.any_work_mode', 'Qualsiasi modalità')}</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
          <select
            value={filters.seniority}
            onChange={e => setFilters(f => ({ ...f, seniority: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm bg-background"
          >
            <option value="">{t('jobs.any_seniority', 'Qualsiasi seniority')}</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </select>
        </div>

        {/* Matched jobs */}
        {hasMatches && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('jobs.matches_for_you', 'Match per te')}
            </h2>
            <div className="space-y-3">
              {matches.map((job: any) => (
                <JobBrowseCard key={job.id || job.job_id || job.job?.id} job={job} isMatch t={t} navigate={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* All jobs */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            {t('jobs.all_jobs', 'Tutte le opportunità')} {jobs ? `(${jobs.length})` : ''}
          </h2>

          {jobsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : !jobs?.length ? (
            <div className="text-center py-12 rounded-xl border bg-secondary/10">
              <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {t('jobs.no_results', 'Nessuna opportunità corrisponde ai tuoi filtri')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job: any) => (
                <JobBrowseCard key={job.id} job={job} isMatch={false} t={t} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

const JobBrowseCard = ({ job, isMatch, t, navigate }: { job: any; isMatch: boolean; t: any; navigate: any }) => {
  const title = job.role_title || job.title || job.job?.title || 'Position';
  const company = job.company_name || job.company || job.job?.company || '';
  const description = job.description || job.xima_narrative || '';

  return (
    <Card className={`hover:shadow-md transition-shadow ${isMatch ? 'border-primary/30 bg-primary/5' : ''}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">{title}</h3>
            {company && (
              <p className="text-sm text-muted-foreground">{company}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            {isMatch && job.match_score && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {job.match_score}% match
              </span>
            )}
          </div>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        {isMatch && job.xima_narrative && (
          <div className="mt-3 p-3 rounded-lg bg-background border text-sm">
            <p className="font-medium text-xs text-primary mb-1">
              {t('jobs.why_match', 'Perché è un match')}
            </p>
            <p className="text-muted-foreground text-xs">{job.xima_narrative}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {job.created_at && new Date(job.created_at).toLocaleDateString()}
          </span>
          <Button size="sm" variant="outline" onClick={() => navigate(`/opportunity/${job.id}`)}>
            {t('jobs.view_details', 'Dettagli')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobsBrowse;
