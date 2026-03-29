import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamIntelligenceCardProps {
  businessId: string | undefined;
  teamCulture: string | null | undefined;
  recommendedXimatars: string[];
}

const CULTURE_INSIGHT: Record<string, string> = {
  high_performance: 'Wolves and Lions thrive in high-performance environments with clear targets.',
  collaborative: 'Dolphins and Elephants excel in trust-based, team-oriented cultures.',
  innovation_first: 'Foxes and Cats bring the creative disruption innovation cultures need.',
  people_centered: 'Bears and Horses flourish where growth and balance are prioritized.',
  mission_driven: 'Bees and Elephants align naturally with purpose-driven organizations.',
};

export const TeamIntelligenceCard: React.FC<TeamIntelligenceCardProps> = ({
  businessId,
  teamCulture,
  recommendedXimatars,
}) => {
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

  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Team Intelligence</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pipeline by XIMAtar */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Pipeline by XIMAtar</p>
            {pipelineByArchetype.length > 0 ? (
              <div className="space-y-2">
                {pipelineByArchetype.slice(0, 8).map((item) => (
                  <div key={item.archetype} className="flex items-center gap-2">
                    <img
                      src={`/ximatars/${item.archetype}.png`}
                      className="w-5 h-5"
                      alt=""
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-sm w-20 capitalize text-foreground truncate">{item.archetype}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-6 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Create challenges to see your pipeline composition
              </p>
            )}
          </div>

          {/* Culture fit insights */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Culture Fit Insights</p>
            <div className="space-y-3">
              {recommendedXimatars.length > 0 && (
                <div className="p-3 rounded-lg bg-green-500/10 dark:bg-green-950/20 border border-green-500/20">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Best fit for your culture
                  </p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {recommendedXimatars.slice(0, 3).map((x) => (
                      <span key={x} className="text-sm capitalize text-foreground">{x}</span>
                    ))}
                  </div>
                  {teamCulture && CULTURE_INSIGHT[teamCulture] && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {CULTURE_INSIGHT[teamCulture]}
                    </p>
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/20">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Diversity opportunity
                </p>
                <p className="text-xs text-muted-foreground">
                  Consider adding archetypes different from your natural fit — they bring perspectives your team might be missing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
