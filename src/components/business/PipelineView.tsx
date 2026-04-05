import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Eye, Gift, Loader2 } from 'lucide-react';
import { getDisplayName, getArchetypeEmoji, canRevealIdentity, PIPELINE_STAGES } from '@/utils/anonymousDisplay';
import { MakeOfferModal } from './MakeOfferModal';

interface PipelineViewProps {
  hiringGoalId: string;
  onInviteToL1?: (candidateUserId: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ hiringGoalId, onInviteToL1 }) => {
  const { t } = useTranslation();
  const [offerCandidate, setOfferCandidate] = useState<any>(null);

  const { data: pipeline, isLoading, refetch } = useQuery({
    queryKey: ['pipeline', hiringGoalId],
    queryFn: async () => {
      const { data } = await supabase
        .from('shortlist_results')
        .select('*')
        .eq('hiring_goal_id', hiringGoalId)
        .order('total_score', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!hiringGoalId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipeline || pipeline.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>{t('anonymous.no_pipeline', 'No candidates in pipeline yet. Generate a shortlist first.')}</p>
        </CardContent>
      </Card>
    );
  }

  // Condensed stage summary
  const stageCounts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: pipeline.filter(c => c.pipeline_stage === stage.key).length,
  })).filter(s => s.count > 0);

  return (
    <div className="space-y-4">
      {/* Stage summary bar */}
      <div className="flex flex-wrap gap-2">
        {stageCounts.map(stage => (
          <Badge key={stage.key} variant="secondary" className="text-xs gap-1">
            <span className="font-bold">{stage.count}</span>
            {t(stage.labelKey, stage.key.replace(/_/g, ' '))}
          </Badge>
        ))}
      </div>

      {/* Candidate list */}
      <div className="space-y-2">
        {pipeline.map(candidate => {
          const emoji = getArchetypeEmoji(candidate.ximatar_archetype);
          const displayName = getDisplayName(candidate);
          const showReveal = canRevealIdentity(candidate.pipeline_stage);

          return (
            <Card key={candidate.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {candidate.total_score} · {(candidate.pipeline_stage || 'shortlisted').replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {candidate.identity_revealed && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
                      {t('anonymous.identity_revealed', 'Identity revealed')}
                    </Badge>
                  )}

                  {candidate.pipeline_stage === 'shortlisted' && onInviteToL1 && (
                    <Button size="sm" variant="outline" onClick={() => onInviteToL1(candidate.candidate_user_id)}>
                      <Send className="w-3.5 h-3.5 mr-1" />
                      L1
                    </Button>
                  )}

                  {showReveal && !candidate.identity_revealed && (
                    <Button size="sm" onClick={() => setOfferCandidate(candidate)}>
                      <Gift className="w-3.5 h-3.5 mr-1" />
                      {t('anonymous.make_offer', 'Make Offer')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Make Offer Modal */}
      {offerCandidate && (
        <MakeOfferModal
          open={!!offerCandidate}
          onOpenChange={(val) => !val && setOfferCandidate(null)}
          candidate={offerCandidate}
          hiringGoalId={hiringGoalId}
          onComplete={() => { setOfferCandidate(null); refetch(); }}
        />
      )}
    </div>
  );
};
