import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Panel } from '@/components/layout/PageHeader';
import { Chip } from '@/components/business/XsBits';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';

interface CandidateEngagementData {
  totalViews: number;
  totalApplications: number;
  totalChallenges: number;
  recentCandidates: Array<{
    id: string;
    name: string;
    avatar: string;
    ximatar: string;
    status: string | null;
  }>;
}

/** "Attività dei candidati": three totals and the recent activity, or an honest empty state. */
export const CandidateEngagement = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<CandidateEngagementData>({
    totalViews: 0,
    totalApplications: 0,
    totalChallenges: 0,
    recentCandidates: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementData();
  }, []);

  const fetchEngagementData = async () => {
    try {
      // Fetch candidate challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('candidate_challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (challengesError) throw challengesError;

      // Fetch profiles for candidates
      const candidateIds = challenges?.map(c => c.candidate_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, ximatar')
        .in('user_id', candidateIds);

      if (profilesError) throw profilesError;

      // Fetch user job links for views and applications
      const { data: jobLinks, error: jobLinksError } = await supabase
        .from('user_job_links')
        .select('status');

      if (jobLinksError) throw jobLinksError;

      const views = jobLinks?.filter(link => link.status === 'viewed').length || 0;
      const applications = jobLinks?.filter(link => link.status === 'applied').length || 0;

      // Create a map of profiles
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform candidate data
      const recentCandidates = challenges?.slice(0, 5).map(challenge => {
        const profile = profileMap.get(challenge.candidate_id);
        return {
          id: challenge.candidate_id,
          name: profile?.name || 'Unknown',
          avatar: '',
          ximatar: profile?.ximatar || 'wolf',
          status: challenge.status,
          // No match score here. This widget used to show a number generated
          // with Math.random() (80-99) labelled "% match" to paying businesses.
          // The real ranking lives in shortlist_results.total_score; until this
          // card reads that, it shows nothing rather than an invented figure.
        };
      }) || [];

      setData({
        totalViews: views,
        totalApplications: applications,
        totalChallenges: challenges?.length || 0,
        recentCandidates
      });
    } catch (error) {
      log.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cells = [
    { label: t('businessPortal.engagement_profile_views_title'), value: data.totalViews },
    { label: t('businessPortal.engagement_applications_title'), value: data.totalApplications },
    { label: t('businessPortal.engagement_active_challenges_body'), value: data.totalChallenges },
  ];

  return (
    <Panel aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-semibold tracking-[-0.45px] text-foreground">{t('businessPortal.candidate_engagement_title')}</h2>
        <span className="text-xs text-muted-foreground">{t('businessPortal.overview_total', 'Total')}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-0">
            <p className={cn('font-mono text-[24px] leading-tight tabular-nums text-foreground', loading && 'animate-pulse text-muted-foreground')}>{loading ? '–' : cell.value}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{cell.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4">
        {data.recentCandidates.length === 0 ? (
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--xs-line))] text-muted-foreground" aria-hidden="true">↳</span>
            <div>
              <p className="text-xs font-semibold text-foreground">{t('businessPortal.overview_no_recent_activity', 'No recent activity')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('businessPortal.overview_recent_activity_hint', 'New candidate updates will appear here.')}</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-foreground">{t('businessPortal.recent_activity_title')}</p>
            {data.recentCandidates.map((candidate) => (
              <div key={candidate.id} className="xs-row !py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={`/ximatars/${candidate.ximatar}.webp`} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">XIMAtar: {candidate.ximatar}</p>
                  </div>
                </div>
                {candidate.status && <Chip>{candidate.status}</Chip>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
};
