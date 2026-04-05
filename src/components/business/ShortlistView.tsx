import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShortlistCard } from './ShortlistCard';
import { ShortlistFilters, type ShortlistFilterValues } from './ShortlistFilters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Sparkles, Info, Users, Zap } from 'lucide-react';

interface ShortlistCandidate {
  candidate_user_id: string;
  total_score: number;
  identity_score: number;
  trajectory_score: number;
  engagement_score: number;
  location_score: number;
  credential_score: number;
  ximatar_archetype: string;
  ximatar_level: number;
  pillar_scores: Record<string, number>;
  trajectory_summary: string;
  engagement_level: string;
  location_match: string;
  availability: string;
  status: string;
}

interface ShortlistViewProps {
  goalId: string;
  roleTitle: string;
  onInviteToChallenge: (candidateUserIds: string[]) => void;
  onViewProfile: (candidateUserId: string) => void;
}

export const ShortlistView: React.FC<ShortlistViewProps> = ({ goalId, roleTitle, onInviteToChallenge, onViewProfile }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [shortlist, setShortlist] = useState<ShortlistCandidate[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [filters, setFilters] = useState<ShortlistFilterValues>({});

  const generateShortlist = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-shortlist', {
        body: { hiring_goal_id: goalId, filters },
      });
      if (error) throw error;
      setShortlist(data.shortlist || []);
      setTotalEvaluated(data.total_candidates_evaluated || 0);
      setGenerated(true);
      if (data.shortlist?.length === 0) {
        toast({ title: t('shortlist.no_results_title', 'No matches found'), description: t('shortlist.no_results_desc', 'Try removing filters or wait for more candidates to join XIMA.') });
      }
    } catch (err: any) {
      toast({ title: t('shortlist.error_title', 'Error'), description: err.message || t('shortlist.error_desc', 'Failed to generate shortlist'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [goalId, filters, toast, t]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('shortlist.header_title', 'Shortlist for: {{role}}', { role: roleTitle })}
          </h2>
          {generated && (
            <p className="text-sm text-muted-foreground mt-1">
              {t('shortlist.header_subtitle', '{{count}} candidates from {{total}} evaluated', { count: shortlist.length, total: totalEvaluated })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={generateShortlist} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {generated ? t('shortlist.refresh', 'Refresh Shortlist') : t('shortlist.generate', 'Generate Shortlist')}
          </Button>
          {shortlist.length >= 5 && (
            <Button variant="outline" onClick={() => onInviteToChallenge(shortlist.slice(0, 5).map(c => c.candidate_user_id))} className="gap-2">
              <Zap className="w-4 h-4" />
              {t('shortlist.invite_top_5', 'Invite Top 5')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <ShortlistFilters filters={filters} onChange={setFilters} />

      {/* Scoring explanation */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">{t('shortlist.scoring_title', 'How XIMA scores candidates:')}</p>
            <p>{t('shortlist.scoring_desc', 'Identity match (40%) · Growth trajectory (20%) · Platform engagement (15%) · Location fit (15%) · Credentials (10%, optional)')}</p>
            <p className="italic">{t('shortlist.anonymous_note', 'Candidates are anonymous — identity revealed only at hire/offer stage.')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">{t('shortlist.generating', 'Evaluating candidates...')}</p>
        </div>
      )}

      {!loading && generated && shortlist.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-2">
            <Users className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">{t('shortlist.empty_title', 'No matching candidates')}</p>
            <p className="text-sm text-muted-foreground">{t('shortlist.empty_desc', 'Try broadening your filters or check back as more candidates join XIMA.')}</p>
          </CardContent>
        </Card>
      )}

      {!loading && shortlist.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortlist.map((candidate, index) => (
            <ShortlistCard
              key={candidate.candidate_user_id}
              candidate={candidate}
              rank={index + 1}
              onInviteToChallenge={(id) => onInviteToChallenge([id])}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}

      {!loading && !generated && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-primary mx-auto" />
            <p className="font-medium text-foreground">{t('shortlist.ready_title', 'Ready to build your shortlist')}</p>
            <p className="text-sm text-muted-foreground">{t('shortlist.ready_desc', 'Click "Generate Shortlist" to find the best-matched candidates for this role using XIMA\'s multi-signal scoring engine.')}</p>
            <Button onClick={generateShortlist} className="gap-2 mt-2">
              <Sparkles className="w-4 h-4" />
              {t('shortlist.generate', 'Generate Shortlist')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
