import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '@/components/layout/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TeamIntelligenceCardProps {
  businessId: string | undefined;
  recommendedXimatars: string[];
  /** Counts across the active challenges: invited, responded, challenges completed. */
  pipeline: { invited: number; responded: number; completed: number };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Composizione del percorso": from invitation to evaluation, plus the split by XIMAtar. */
export const TeamIntelligenceCard: React.FC<TeamIntelligenceCardProps> = ({ businessId, recommendedXimatars, pipeline }) => {
  const { t } = useTranslation();

  const { data: pipelineByArchetype = [] } = useQuery({
    queryKey: ['pipelineArchetypes', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data: invitations } = await supabase
        .from('challenge_invitations')
        .select('candidate_profile_id')
        .eq('business_id', businessId);

      if (!invitations?.length) return [];

      const profileIds = [...new Set(invitations.map((i) => i.candidate_profile_id))];

      const { data: results } = await supabase
        .from('assessment_results')
        .select('ximatar_id')
        .in('user_id', profileIds);

      const counts: Record<string, number> = {};
      results?.forEach((r) => {
        const archetype = (r.ximatar_id as string) || 'unknown';
        counts[archetype] = (counts[archetype] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([archetype, count]) => ({ archetype, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!businessId,
    staleTime: 60_000,
  });

  const maxCount = Math.max(...pipelineByArchetype.map((i) => i.count), 1);
  const archetypeName = (id: string) => t(`about.archetypes.name_${id}`, capitalize(id));
  const recommendedNames = recommendedXimatars.slice(0, 3).map(archetypeName);

  const cells = [
    { label: t('businessPortal.overview_stat_invited', 'Invited'), value: pipeline.invited },
    { label: t('businessPortal.overview_stat_responded', 'Responded'), value: pipeline.responded },
    { label: t('businessPortal.overview_stat_completed', 'Challenges completed'), value: pipeline.completed },
  ];

  return (
    <Panel>
      <h2 className="text-[19px] font-semibold tracking-[-0.45px] text-foreground">{t('businessPortal.overview_pipeline_title', 'Pipeline composition')}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t('businessPortal.overview_pipeline_subtitle', 'From invitation to evaluation')}</p>

      <div className="my-5 grid grid-cols-3">
        {cells.map((cell, i) => (
          <div key={cell.label} className={cn('min-w-0', i > 0 && 'border-l border-[hsl(var(--xs-line))] pl-4')}>
            <p className="font-mono text-[26px] leading-tight tabular-nums text-foreground">{cell.value}</p>
            <p className="text-[11px] text-muted-foreground">{cell.label}</p>
          </div>
        ))}
      </div>

      {recommendedNames.length > 0 && (
        <div className="border-l-2 border-primary bg-[hsl(var(--xs-page))] px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">{t('businessPortal.overview_insight_title', 'Affinity and different perspectives')}</p>
          <p className="mt-0.5">
            {t('businessPortal.overview_insight_body', {
              names: recommendedNames.join(', '),
              defaultValue: '{{names}} are close to the company profile. Consider other archetypes too, to widen the points of view in the team.',
            })}
          </p>
        </div>
      )}

      {pipelineByArchetype.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{t('businessPortal.overview_by_ximatar', 'Candidates in the pipeline by XIMAtar')}</p>
          {pipelineByArchetype.slice(0, 8).map((item) => (
            <div key={item.archetype} className="flex items-center gap-2 text-xs">
              <img
                src={`/ximatars/${item.archetype}.webp`}
                className="h-5 w-5 object-contain"
                alt=""
                loading="lazy"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="w-24 truncate text-foreground">{archetypeName(item.archetype)}</span>
              <div className="h-[5px] flex-1 overflow-hidden rounded-sm bg-[hsl(var(--xs-line))]">
                <div className="h-full rounded-sm bg-primary" style={{ width: `${(item.count / maxCount) * 100}%` }} />
              </div>
              <span className="w-6 text-right font-mono tabular-nums text-muted-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {pipeline.invited > 0
            ? t('businessPortal.overview_by_ximatar_pending', { count: pipeline.invited, defaultValue: '{{count}} candidate(s) in the pipeline. The split by XIMAtar is not available yet.' })
            : t('businessPortal.overview_by_ximatar_empty', 'Invite candidates to a challenge to see the split by XIMAtar.')}
        </p>
      )}
    </Panel>
  );
};
