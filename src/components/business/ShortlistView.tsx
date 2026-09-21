import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Panel, WithContext } from '@/components/layout/PageHeader';
import { Chip } from '@/components/business/XsBits';
import { ShortlistCard } from './ShortlistCard';
import { parseReasons, reasonText, getArchetypeImageUrl, archetypeDisplayName, type ShortlistCandidate } from './shortlistHelpers';
import { ShortlistFilters, type ShortlistFilterValues } from './ShortlistFilters';
import { formatRoundedScore } from './PillarScoreBar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { useBusinessEntitlements } from '@/hooks/useBusinessEntitlements';
import { useChallengeStatsMap } from '@/hooks/useChallengeResponsesData';
import { getChallengeTimeInfo } from '@/utils/challengeTimeUtils';
import { RefreshCw, Loader2, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortlistViewProps {
  goalId: string;
  roleTitle: string;
  onViewProfile: (candidateUserId: string) => void;
}

interface ActiveChallengeInfo {
  id: string;
  title: string;
  end_at: string | null;
}

const FREE_VISIBLE = 5;

export const ShortlistView: React.FC<ShortlistViewProps> = ({ goalId, roleTitle, onViewProfile }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useUser();
  // null while loading. Inviting needs an active XIMA Core challenge on this
  // goal; the RPC only said so after the click ("Invite failed").
  const [hasActiveChallenge, setHasActiveChallenge] = useState<boolean | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengeInfo | null>(null);
  const pendingInviteKey = `xima_pending_invite_${goalId}`;
  const [pendingInvite, setPendingInvite] = useState<string | null>(() => {
    try { return sessionStorage.getItem(`xima_pending_invite_${goalId}`); } catch { return null; }
  });
  const { planTier } = useBusinessEntitlements();
  const [shortlist, setShortlist] = useState<ShortlistCandidate[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [filters, setFilters] = useState<ShortlistFilterValues>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyPillars, setCompanyPillars] = useState<Record<string, unknown> | null>(null);
  const locksAfterFive = !['growth', 'enterprise'].includes(String(planTier));

  const activeChallengeIds = useMemo(() => (activeChallenge ? [activeChallenge.id] : []), [activeChallenge]);
  const { statsMap } = useChallengeStatsMap(user?.id, activeChallengeIds);
  const challengeStats = activeChallenge ? statsMap.get(activeChallenge.id) : undefined;

  const fetchPersistedShortlist = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shortlist_results')
        .select('candidate_user_id,total_score,identity_score,performance_score,match_narrative,trajectory_score,engagement_score,location_score,credential_score,ximatar_archetype,ximatar_level,pillar_scores,trajectory_summary,engagement_level,location_match,availability,status,anonymous_label,identity_revealed,pipeline_stage')
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
        credential_score: row.credential_score ?? null,
        performance_score: row.performance_score == null ? null : Number(row.performance_score),
        match_narrative: row.match_narrative ?? null,
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

  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;
    supabase
      .from('business_challenges')
      .select('id, title, end_at')
      .eq('hiring_goal_id', goalId)
      .eq('level', 1)
      .eq('status', 'active')
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return;
        // On a read error, fall back to letting the RPC decide.
        setHasActiveChallenge(error ? true : (data?.length ?? 0) > 0);
        setActiveChallenge(!error && data?.[0] ? { id: data[0].id, title: data[0].title, end_at: data[0].end_at ?? null } : null);
      });
    return () => { cancelled = true; };
  }, [goalId]);

  // The company's five pillars, drawn as tick marks on each candidate's bars.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('company_profiles')
      .select('pillar_vector')
      .eq('company_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCompanyPillars((data?.pillar_vector as Record<string, unknown> | null) ?? null);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const visibleCandidates = useMemo(
    () => (locksAfterFive ? shortlist.slice(0, FREE_VISIBLE) : shortlist),
    [shortlist, locksAfterFive],
  );
  const hiddenCount = shortlist.length - visibleCandidates.length;

  // Keep a candidate selected: the current one if still visible, else the first.
  useEffect(() => {
    if (visibleCandidates.length === 0) { setSelectedId(null); return; }
    setSelectedId((current) => (current && visibleCandidates.some(c => c.candidate_user_id === current) ? current : visibleCandidates[0].candidate_user_id));
  }, [visibleCandidates]);

  const selected = useMemo(() => visibleCandidates.find(c => c.candidate_user_id === selectedId) ?? null, [visibleCandidates, selectedId]);
  const selectedRank = selected ? shortlist.findIndex(c => c.candidate_user_id === selected.candidate_user_id) + 1 : 0;

  const goCreateChallenge = useCallback((candidateUserId?: string) => {
    if (candidateUserId) {
      try { sessionStorage.setItem(pendingInviteKey, candidateUserId); } catch { /* storage unavailable */ }
    }
    navigate(`/business/challenges/xima-core?goal=${goalId}&returnTo=shortlist`);
  }, [goalId, navigate, pendingInviteKey]);

  const clearPendingInvite = useCallback(() => {
    try { sessionStorage.removeItem(pendingInviteKey); } catch { /* storage unavailable */ }
    setPendingInvite(null);
  }, [pendingInviteKey]);

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
    if (hasActiveChallenge === false) {
      goCreateChallenge(candidateUserId);
      return;
    }
    const ok = await inviteOne(candidateUserId);
    if (ok) {
      toast({ title: t('shortlist.invited_title', 'Invited to L1 Core Challenge') });
    }
  }, [inviteOne, toast, t, hasActiveChallenge, goCreateChallenge]);

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

  const responsesPath = activeChallenge ? `/business/hiring-goals/${goalId}/challenges/${activeChallenge.id}/responses` : null;
  const selectedInvited = !!selected && invitedIds.has(selected.candidate_user_id);
  const selectedInviting = !!selected && invitingIds.has(selected.candidate_user_id);
  const canInviteTop5 = shortlist.length >= 5 && hasActiveChallenge !== false && shortlist.slice(0, 5).some(c => !invitedIds.has(c.candidate_user_id));

  const rowGrid = 'grid grid-cols-[22px_minmax(0,1fr)_44px] items-center gap-x-2 gap-y-2 sm:grid-cols-[28px_minmax(110px,1.1fr)_56px_minmax(120px,1.3fr)] sm:gap-x-3';

  const challengeBar = hasActiveChallenge === null ? (
    <div className="h-[62px] animate-pulse rounded-lg border border-[hsl(var(--xs-line))] bg-card" aria-busy="true" />
  ) : hasActiveChallenge && activeChallenge ? (
    <div className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--xs-line))] border-l-[3px] border-l-primary bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between" aria-label={t('businessPortal.active_challenges_title')}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
          <span className="truncate">{activeChallenge.title}</span>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('businessPortal.overview_challenge_active_chip', 'Active challenge')} · {getChallengeTimeInfo(null, activeChallenge.end_at, 'active').remainingText || t('businessPortal.overview_no_deadline', 'No deadline')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span><b className="mr-1 font-mono text-lg font-medium tabular-nums text-foreground">{challengeStats?.invited ?? invitedIds.size}</b>{t('businessPortal.challenge_invited_label')}</span>
        <span><b className="mr-1 font-mono text-lg font-medium tabular-nums text-foreground">{challengeStats?.responses ?? 0}</b>{t('businessPortal.challenge_responses_label')}</span>
        {responsesPath && (
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to={responsesPath}>{t('businessPortal.challenge_view_responses')} <span aria-hidden="true">↗</span></Link>
          </Button>
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--xs-line))] border-l-[3px] border-l-primary bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('business.shortlist.create_challenge_banner.title')}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('business.shortlist.create_challenge_banner.description')}</p>
      </div>
      <Button onClick={() => goCreateChallenge()} size="sm" className="shrink-0">
        {t('business.shortlist.create_challenge_banner.cta')}
      </Button>
    </div>
  );

  const listing = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-base font-semibold text-foreground" aria-label={t('shortlist.header_title', { role: roleTitle })}>{t('shortlist.candidates_heading', 'Candidates')}</h2>
          {generated && (
            <span className="text-xs text-muted-foreground">
              {t('shortlist.visible_count', { visible: visibleCandidates.length, total: shortlist.length, defaultValue: '{{visible}} visible · {{total}} in the shortlist' })}
            </span>
          )}
          <Link to="/business/candidates" className="text-xs text-primary underline underline-offset-[3px]">
            {t('shortlist.all_candidates_link', 'All candidates')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            aria-expanded={filtersOpen}
            aria-controls="shortlist-filters"
            onClick={() => setFiltersOpen(v => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {t('shortlist.filters_toggle', 'Advanced filters')}
          </Button>
          <Button variant="outline" size="sm" onClick={generateShortlist} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
            {generated ? t('shortlist.refresh', 'Refresh Shortlist') : t('shortlist.generate', 'Generate Shortlist')}
          </Button>
          {shortlist.length >= 5 && hasActiveChallenge !== false && (
            <Button variant="outline" size="sm" onClick={handleInviteTop5} disabled={!canInviteTop5}>
              {t('shortlist.invite_top_5', 'Invite Top 5')} <span aria-hidden="true">↗</span>
            </Button>
          )}
        </div>
      </div>

      <ShortlistFilters filters={filters} onChange={setFilters} open={filtersOpen} />

      {loading && (
        <Panel className="flex flex-col items-center justify-center gap-3 py-16" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('shortlist.generating', 'Evaluating candidates...')}</p>
        </Panel>
      )}

      {!loading && generated && shortlist.length === 0 && (
        <Panel className="py-10 text-center">
          <p className="font-medium text-foreground">{t('shortlist.empty_title', 'No matching candidates')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('shortlist.empty_desc', 'Try broadening your filters or check back as more candidates join XIMA.')}</p>
        </Panel>
      )}

      {!loading && !generated && (
        <Panel className="py-10 text-center">
          <p className="font-medium text-foreground">{t('shortlist.ready_title', 'Ready to build your shortlist')}</p>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{t('shortlist.ready_desc')}</p>
          <Button onClick={generateShortlist} className="mt-4">
            {t('shortlist.generate', 'Generate Shortlist')}
          </Button>
        </Panel>
      )}

      {!loading && shortlist.length > 0 && (
        <Panel className="overflow-hidden p-0">
          <div className={cn(rowGrid, 'bg-[hsl(var(--xs-page))] px-3 py-3 text-[10px] uppercase tracking-[0.07em] text-muted-foreground sm:px-4')} aria-hidden="true">
            <span>{t('shortlist.col_rank', 'No.')}</span>
            <span>{t('shortlist.col_candidate', 'Candidate')}</span>
            <span>{t('shortlist.col_score', 'Out of 100')}</span>
            <span className="hidden sm:block">{t('shortlist.col_summary', 'In short')}</span>
          </div>
          <div role="list">
            {visibleCandidates.map((candidate, index) => {
              const isSelected = candidate.candidate_user_id === selectedId;
              const invited = invitedIds.has(candidate.candidate_user_id);
              const firstReason = parseReasons(candidate.match_narrative).map(r => reasonText(t, r)).find(Boolean);
              const name = archetypeDisplayName(t, candidate.ximatar_archetype);
              const score = formatRoundedScore(candidate.total_score);
              return (
                <button
                  key={candidate.candidate_user_id}
                  type="button"
                  role="listitem"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(candidate.candidate_user_id)}
                  className={cn(
                    rowGrid,
                    'w-full border-t border-[hsl(var(--xs-line))] px-3 py-3.5 text-left text-xs transition-colors sm:px-4 sm:py-5',
                    isSelected ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'hover:bg-[hsl(var(--xs-page))]',
                  )}
                  aria-label={t('shortlist.select_row_aria', { name, rank: index + 1, score, defaultValue: 'Select {{name}}, rank {{rank}}, score {{score}}' })}
                >
                  <span className="font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                    <img src={getArchetypeImageUrl(candidate.ximatar_archetype)} alt="" className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                    <span className="min-w-0">
                      <strong className="block truncate text-[13px] font-semibold text-foreground">{name}</strong>
                      <small className="block text-[11px] text-muted-foreground">
                        {candidate.anonymous_label ? `#${candidate.anonymous_label}` : `L${candidate.ximatar_level}`}
                      </small>
                    </span>
                  </span>
                  <span>
                    <span className="block font-mono text-[21px] font-medium leading-none tracking-[-0.8px] tabular-nums text-foreground">{score}</span>
                    <span className="mt-1.5 block h-[3px] w-[43px] bg-[hsl(var(--xs-line))]"><i className="block h-full bg-primary" style={{ width: `${score}%` }} /></span>
                  </span>
                  <span className="col-span-3 pl-[30px] text-[11px] text-muted-foreground sm:col-span-1 sm:pl-0">
                    {firstReason && <span className="line-clamp-2">{firstReason}</span>}
                    <span className="mt-1.5 block">
                      {invited
                        ? <Chip tone="status">{t('shortlist.invited', 'Invited')}</Chip>
                        : <Chip>{t('shortlist.to_invite', 'To invite')}</Chip>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="border-t border-[hsl(var(--xs-line))] px-4 py-3 text-[11px] text-muted-foreground">
            {t('shortlist.list_meta', { count: visibleCandidates.length, defaultValue: 'Ordered by compatibility with the goal · {{count}} profiles accessible' })}
            {totalEvaluated > shortlist.length && <> · {t('shortlist.evaluated_count', { count: totalEvaluated, defaultValue: '{{count}} evaluated' })}</>}
          </p>
          {hiddenCount > 0 && (
            <div className="flex flex-col gap-3 border-t border-[hsl(var(--xs-line))] px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong className="block text-[13px] font-medium text-foreground">{t('shortlist.locked_more', { count: hiddenCount, defaultValue: '{{count}} more candidates in the shortlist' })}</strong>
                {t('shortlist.locked_plan_note', { count: FREE_VISIBLE, defaultValue: 'Your plan shows the first {{count}} profiles.' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => navigate('/contact-sales', { state: { desiredTier: planTier === 'starter' ? 'growth' : 'enterprise' } })}
              >
                {t('shortlist.explore_plans', 'Explore the plans')} <span aria-hidden="true">↗</span>
              </Button>
            </div>
          )}
        </Panel>
      )}

      <details className="border-b border-[hsl(var(--xs-line))] text-xs text-muted-foreground">
        <summary className="cursor-pointer py-2.5 text-foreground">{t('shortlist.method_summary', 'How compatibility is calculated')}</summary>
        <div className="max-w-[870px] space-y-2 pb-3 leading-relaxed">
          <p>{t('shortlist.scoring_desc')}</p>
          <p>{t('shortlist.dash_means_unavailable', '— means the data is not available, not zero.')} {t('shortlist.anonymous_note', 'Candidates are anonymous — identity revealed only at hire/offer stage.')}</p>
          <p>{t('shortlist.explanation_desc')}</p>
        </div>
      </details>
    </>
  );

  const context = selected ? (
    <ShortlistCard
      candidate={selected}
      rank={selectedRank}
      invited={selectedInvited}
      companyPillars={companyPillars}
      onViewProfile={onViewProfile}
    />
  ) : (
    <Panel className="text-sm text-muted-foreground">
      {t('shortlist.no_selection', 'Select a candidate to see the detail.')}
    </Panel>
  );

  return (
    <div className="space-y-5">
      {challengeBar}

      {hasActiveChallenge && pendingInvite && !invitedIds.has(pendingInvite) && shortlist.some(c => c.candidate_user_id === pendingInvite) && (
        <Panel accent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            {t('shortlist.pending_invite', {
              rank: shortlist.findIndex(c => c.candidate_user_id === pendingInvite) + 1,
              defaultValue: 'The challenge is ready. Invite candidate #{{rank}}, the one you selected?',
            })}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={async () => { const id = pendingInvite; clearPendingInvite(); await handleInviteSingle(id); }}>
              {t('shortlist.invite_to_challenge', 'Invite to Challenge')}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearPendingInvite}>{t('common.dismiss', 'Dismiss')}</Button>
          </div>
        </Panel>
      )}

      <WithContext context={context}>
        {listing}
      </WithContext>

      {selected && (
        <div className="xs-glass sticky bottom-4 z-10 flex items-center justify-between gap-3 !px-4 !py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={getArchetypeImageUrl(selected.ximatar_archetype)} alt="" className="hidden h-9 w-9 object-contain sm:block" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
            <div className="min-w-0">
              <strong className="block truncate text-[13px] text-foreground">
                {selected.anonymous_label ? `#${selected.anonymous_label} · ` : `${selectedRank}. `}{archetypeDisplayName(t, selected.ximatar_archetype)}
              </strong>
              <small className="block text-[11px] text-muted-foreground">
                {selectedInvited
                  ? t('shortlist.selected_invited', 'Invited to the active challenge')
                  : t('shortlist.selected_for_challenge', 'Selected for the challenge')}
              </small>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => onViewProfile(selected.candidate_user_id)}>
              {t('shortlist.anonymous_profile', 'Anonymous profile')}
            </Button>
            <Button
              size="sm"
              onClick={() => handleInviteSingle(selected.candidate_user_id)}
              disabled={selectedInvited || selectedInviting}
              title={hasActiveChallenge === false && !selectedInvited ? t('shortlist.invite_disabled_tooltip', 'Create a challenge for this role first') : undefined}
            >
              {selectedInvited
                ? t('shortlist.already_invited', 'Already invited')
                : selectedInviting
                  ? t('shortlist.inviting', 'Inviting…')
                  : hasActiveChallenge === false
                    ? t('shortlist.create_challenge_to_invite', 'Create challenge to invite')
                    : t('shortlist.invite_to_challenge', 'Invite to Challenge')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
