import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShortlistCard } from './ShortlistCard';
import { ShortlistFilters, type ShortlistFilterValues } from './ShortlistFilters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBusinessEntitlements } from '@/hooks/useBusinessEntitlements';
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
  subscriber_code?: string | null;
}

interface ShortlistViewProps {
  goalId: string;
  roleTitle: string;
  onViewProfile: (candidateUserId: string) => void;
}

export const ShortlistView: React.FC<ShortlistViewProps> = ({ goalId, roleTitle, onViewProfile }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { planTier } = useBusinessEntitlements();
  const [shortlist, setShortlist] = useState<ShortlistCandidate[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [filters, setFilters] = useState<ShortlistFilterValues>({});
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const locksAfterFive = !['growth', 'enterprise'].includes(String(planTier));

  const fetchPersistedShortlist = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shortlist_results')
        .select('candidate_user_id,total_score,identity_score,trajectory_score,engagement_score,location_score,credential_score,ximatar_archetype,ximatar_level,pillar_scores,trajectory_summary,engagement_level,location_match,availability,status,anonymous_label,identity_revealed,pipeline_stage')
        .eq('hiring_goal_id', goalId)
        .order('total_score', { ascending: false })
        .limit(12);
      if (error) throw error;

      const candidateIds = (data || []).map((r: any) => r.candidate_user_id).filter(Boolean);
      const codeMap = new Map<string, string>();
      if (candidateIds.length > 0) {
        const { data: codes } = await supabase.rpc('get_member_codes', { _user_ids: candidateIds } as any);
        ((codes as any[]) || []).forEach((row: any) => {
          if (row?.user_id && row?.subscriber_code) {
            codeMap.set(row.user_id, row.subscriber_code);
          }
        });
      }

      // Detect already-invited candidates for this goal (any L1 invite)
      const { data: existingInvites } = await supabase
        .from('challenge_invitations')
        .select('candidate_profile_id, profiles!challenge_invitations_candidate_profile_id_fkey(user_id)')
        .eq('hiring_goal_id', goalId);
      const alreadyInvited = new Set<string>();
      ((existingInvites as any[]) || []).forEach((row: any) => {
        const uid = row?.profiles?.user_id;
        if (uid) alreadyInvited.add(uid);
      });
      setInvitedIds(alreadyInvited);

      const rows = (data || []).map((row: any) => ({
        ...row,
        total_score: row.total_score || 0,
        identity_score: row.identity_score || 0,
        trajectory_score: row.trajectory_score || 0,
        engagement_score: row.engagement_score || 0,
        location_score: row.location_score || 0,
        credential_score: row.credential_score || 0,
        ximatar_archetype: row.ximatar_archetype || 'chameleon',
        ximatar_level: row.ximatar_level || 1,
        pillar_scores: (row.pillar_scores || {}) as Record<string, number>,
        trajectory_summary: row.trajectory_summary || '',
        engagement_level: row.engagement_level || 'low',
        location_match: row.location_match || 'no_match',
        availability: row.availability || 'unknown',
        status: row.status || 'shortlisted',
        subscriber_code: codeMap.get(row.candidate_user_id) ?? null,
      }));
      setShortlist(rows);
      setGenerated(rows.length > 0);
      setTotalEvaluated(rows.length);
    } catch (err: any) {
      toast({ title: t('shortlist.error_title', 'Error'), description: err.message || t('shortlist.error_desc', 'Failed to generate shortlist'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [goalId, toast, t]);

  useEffect(() => {
    fetchPersistedShortlist();
  }, [fetchPersistedShortlist]);

  const inviteOne = useCallback(async (candidateUserId: string): Promise<boolean> => {
    if (!goalId || invitedIds.has(candidateUserId)) return false;
    setInvitingIds(prev => new Set(prev).add(candidateUserId));
    try {
      const { error } = await supabase.rpc('invite_candidate_to_l1', {
        p_candidate_user_id: candidateUserId,
        p_hiring_goal_id: goalId,
      } as any);
      if (error) throw error;
      setInvitedIds(prev => new Set(prev).add(candidateUserId));
      return true;
    } catch (err: any) {
      toast({
        title: t('shortlist.invite_failed_title', 'Invite failed'),
        description: err?.message || t('shortlist.invite_failed_desc', 'Could not send invitation'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setInvitingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateUserId);
        return next;
      });
    }
  }, [goalId, invitedIds, toast, t]);

  const handleInviteSingle = useCallback(async (candidateUserId: string) => {
    const ok = await inviteOne(candidateUserId);
    if (ok) {
      toast({ title: t('shortlist.invited_title', 'Invited to L1 Core Challenge') });
    }
  }, [inviteOne, toast, t]);

  const handleInviteTop5 = useCallback(async () => {
    const targets = shortlist.slice(0, 5).map(c => c.candidate_user_id).filter(id => !invitedIds.has(id));
    let success = 0;
    for (const id of targets) {
      const ok = await inviteOne(id);
      if (ok) success += 1;
    }
    if (success > 0) {
      toast({
        title: t('shortlist.invited_top5_title', 'Invitations sent'),
        description: t('shortlist.invited_top5_desc', '{{count}} candidate(s) invited to L1 Core Challenge', { count: success }),
      });
    }
  }, [shortlist, invitedIds, inviteOne, toast, t]);

  const generateShortlist = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-shortlist', {
        body: { hiring_goal_id: goalId, filters },
      });
      if (error) throw error;
      await fetchPersistedShortlist();
      setTotalEvaluated(data.total_candidates_evaluated || 0);
      const wasGenerated = generated;
      setGenerated(true);
      if (data.shortlist?.length === 0) {
        toast({ title: t('shortlist.no_results_title', 'No matches found'), description: t('shortlist.no_results_desc', 'Try removing filters or wait for more candidates to join XIMA.') });
      } else if (wasGenerated) {
        toast({ title: t('shortlist.refresh_success_title', 'Shortlist updated'), description: t('shortlist.refresh_success_desc', 'The shortlist has been refreshed with the latest candidates.') });
      }
    } catch (err: any) {
      toast({ title: t('shortlist.error_title', 'Error'), description: err.message || t('shortlist.error_desc', 'Failed to generate shortlist'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [goalId, filters, toast, t, fetchPersistedShortlist, generated]);

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
            <Button variant="outline" onClick={handleInviteTop5} className="gap-2">
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
              onInviteToChallenge={handleInviteSingle}
              onViewProfile={onViewProfile}
              locked={locksAfterFive && index >= 5}
              invited={invitedIds.has(candidate.candidate_user_id)}
              inviting={invitingIds.has(candidate.candidate_user_id)}
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
