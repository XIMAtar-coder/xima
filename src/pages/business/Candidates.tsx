import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { PageHeader, Panel, WithContext, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { XIMATAR_PROFILES } from '@/lib/ximatarTaxonomy';
import { PILLAR_KEYS, readPillar } from '@/lib/pillarKeys';
import { PoolCandidateDetail } from '@/components/business/PoolCandidateDetail';
import { archetypeName, archetypeTitle, poolSignals, type PoolCandidate } from '@/components/business/poolBits';
import { ArchetypeChip } from '@/components/business/ArchetypeChip';
import { MemberCodeBadge } from '@/components/business/MemberCodeBadge';
import { Chip } from '@/components/business/XsBits';
import { Users, ChevronLeft, ChevronRight, X, Filter, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { log } from '@/lib/log';

const PAGE_SIZE = 20;

interface Filters {
  archetype: string;
  location: string;
  work_mode: string;
  seniority: string;
  industry: string;
  engagement: string;
  availability: string;
  min_level: number;
}

const INITIAL_FILTERS: Filters = {
  archetype: '', location: '', work_mode: '', seniority: '',
  industry: '', engagement: '', availability: '', min_level: 1,
};

const SELECT_CLASS =
  'w-full rounded-lg border border-[hsl(var(--xs-line))] bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

/**
 * Candidate pool, "talent register" layout: one row per person with the five
 * pillars on the same scale, and the selected person opened in the context
 * column. The previous grid of identical cards made twelve "Owl · L1" look
 * interchangeable and left the buttons at different heights.
 */
const BusinessCandidates = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [planLimit, setPlanLimit] = useState(5);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const fetchSeq = useRef(0);

  // Hiring goal selector for invite flow
  const [hiringGoals, setHiringGoals] = useState<{ id: string; role_title: string | null }[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  // Set of hiring_goal_ids that already have an active L1 (XIMA Core) challenge.
  // L1 invitations must bind a goal-scoped challenge — goals not in this set show a "create challenge first" gate.
  const [l1ReadyGoalIds, setL1ReadyGoalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
    }
  }, [isAuthenticated, isBusiness, businessLoading, navigate]);

  // Load this business's hiring goals + which ones already have an active L1 XIMA Core challenge
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [{ data: goals }, { data: l1s }] = await Promise.all([
        supabase
          .from('hiring_goal_drafts')
          .select('id, role_title')
          .eq('business_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('business_challenges')
          .select('hiring_goal_id')
          .eq('business_id', user.id)
          .eq('level', 1)
          .eq('status', 'active'),
      ]);
      setHiringGoals((goals || []) as any);
      setL1ReadyGoalIds(new Set((l1s || []).map((r: any) => r.hiring_goal_id).filter(Boolean)));
    })();
  }, [user?.id]);

  const fetchCandidates = useCallback(async () => {
    if (!user?.id) return;
    const seq = fetchSeq.current + 1;
    fetchSeq.current = seq;
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.functions.invoke('browse-candidate-pool', {
        body: { filters, page, page_size: PAGE_SIZE },
      });
      if (seq !== fetchSeq.current) return;
      if (error) throw error;
      if (data?.error) throw new Error(data.error_message || data.error);
      const nextCandidates = Array.isArray(data?.candidates) ? data.candidates : [];
      const nextTotal = Math.max(0, Number(data?.total_count ?? 0));
      setCandidates(nextCandidates);
      setTotalCount(nextTotal);
      setPlanLimit(Number(data?.plan_limit ?? 5));
      setIsRestricted(Boolean(data?.is_restricted));
      setSelectedId(nextCandidates[0]?.id ?? null);
    } catch (err) {
      log.error('[Pool] Fetch error:', err);
      if (seq !== fetchSeq.current) return;
      setCandidates([]);
      setTotalCount(0);
      setSelectedId(null);
      setLoadError(t('business.candidates.fetch_error', 'Errore nel caricamento dei candidati. Riprova.'));
    } finally {
      if (seq === fetchSeq.current) setIsLoading(false);
    }
  }, [user?.id, filters, page, t]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleInvite = async (candidate: PoolCandidate) => {
    // Defensive guard: synthetic placeholders are not invitable
    if (candidate?.is_synthetic) return;
    if (!user?.id) return;
    if (!selectedGoalId) {
      toast({
        title: t('candidate_pool.pick_goal_title', 'Seleziona prima un obiettivo di assunzione'),
        description: t('candidate_pool.pick_goal_desc', 'Scegli uno dei tuoi obiettivi per inviare l\'invito.'),
        variant: 'destructive',
      });
      return;
    }
    // Pre-check: the selected goal must already have an active L1 XIMA Core challenge.
    if (!l1ReadyGoalIds.has(selectedGoalId)) {
      toast({
        title: t('candidate_pool.no_l1_title', 'Crea prima una sfida XIMA Core'),
        description: t('candidate_pool.no_l1_desc', 'Questo obiettivo non ha ancora una sfida XIMA Core attiva. Creala per inviare candidati.'),
      });
      navigate(`/business/challenges/xima-core?goal=${selectedGoalId}`);
      return;
    }
    try {
      const { error } = await supabase.rpc('invite_candidate_to_l1', {
        p_candidate_user_id: candidate.id,
        p_hiring_goal_id: selectedGoalId,
      } as any);
      if (error) throw error;
      toast({ title: t('business.candidates.invitation_sent', 'Invito inviato') });
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Backstop: the RPC guarantees no NULL-challenge invitation can be written.
      if (msg.includes('no_xima_core_challenge')) {
        toast({
          title: t('candidate_pool.no_l1_title', 'Crea prima una sfida XIMA Core'),
          description: t('candidate_pool.no_l1_desc', 'Questo obiettivo non ha ancora una sfida XIMA Core attiva. Creala per inviare candidati.'),
        });
        navigate(`/business/challenges/xima-core?goal=${selectedGoalId}`);
        return;
      }
      toast({
        title: t('common.error', 'Errore'),
        description: msg || t('candidate_pool.invite_failed', 'Impossibile inviare l\'invito'),
        variant: 'destructive',
      });
    }
  };

  const handleSave = (candidate: PoolCandidate) => {
    setSavedIds((s) => new Set(s).add(candidate.id));
    toast({ title: t('candidate_pool.saved', 'Candidate saved'), description: t('candidate_pool.saved_desc', 'Added to your saved list') });
  };

  const clearFilters = () => { setFilters(INITIAL_FILTERS); setPage(0); };
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k === 'min_level' ? v > 1 : Boolean(v));
  const maxPage = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  const displayedPage = Math.min(page + 1, maxPage);
  const selected = candidates.find((c) => c.id === selectedId) || null;

  const setFilter = (patch: Partial<Filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0); };

  const goalPanel = (
    <Panel className="!p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('candidate_pool.invite_goal_label', 'Invite candidates to a hiring goal')}
        </div>
        <select
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value)}
          className={cn(SELECT_CLASS, 'md:flex-1')}
          aria-label={t('candidate_pool.invite_goal_label', 'Invite candidates to a hiring goal')}
        >
          <option value="">{t('candidate_pool.select_goal', 'Choose a hiring goal…')}</option>
          {hiringGoals.map((g) => {
            const ready = l1ReadyGoalIds.has(g.id);
            const title = g.role_title || t('business.goals.untitled', 'Untitled role');
            return (
              <option key={g.id} value={g.id}>
                {ready ? title : `${title} — ${t('candidate_pool.no_l1_tag', 'crea sfida XIMA Core')}`}
              </option>
            );
          })}
        </select>
        {hiringGoals.length === 0 && (
          <Button size="sm" variant="outline" onClick={() => navigate('/business/hiring-goals/new')}>
            {t('candidate_pool.create_goal', 'Crea Obiettivo di Assunzione')}
          </Button>
        )}
      </div>
    </Panel>
  );

  const filterPanel = (
    <Panel className="!p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t('candidate_pool.filters', 'Filtri')}
        </button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="mr-1 h-3 w-3" aria-hidden="true" />
            {t('candidate_pool.clear_filters', 'Cancella tutti')}
          </Button>
        )}
      </div>
      {(filtersOpen || hasActiveFilters) && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('candidate_pool.work_mode', 'Modalità')}</span>
            <select value={filters.work_mode} onChange={(e) => setFilter({ work_mode: e.target.value })} className={SELECT_CLASS}>
              <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
              <option value="remote">{t('candidate_pool.remote', 'Remote')}</option>
              <option value="hybrid">{t('candidate_pool.hybrid', 'Ibrido')}</option>
              <option value="on-site">{t('candidate_pool.onsite', 'In sede')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('candidate_pool.location', 'Località')}</span>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilter({ location: e.target.value })}
              placeholder={t('candidate_pool.location_placeholder', 'Città o paese')}
              className={SELECT_CLASS}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('candidate_pool.seniority', 'Seniority')}</span>
            <select value={filters.seniority} onChange={(e) => setFilter({ seniority: e.target.value })} className={SELECT_CLASS}>
              <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
              <option value="junior">Junior (0-2)</option>
              <option value="mid">Mid (3-5)</option>
              <option value="senior">Senior (6-10)</option>
              <option value="lead">Lead (10-15)</option>
              <option value="executive">Executive (15+)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('candidate_pool.industry', 'Settore')}</span>
            <input
              type="text"
              value={filters.industry}
              onChange={(e) => setFilter({ industry: e.target.value })}
              placeholder={t('candidate_pool.industry_placeholder', 'es. Tech')}
              className={SELECT_CLASS}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('candidate_pool.activity', 'Attività')}</span>
            <select value={filters.engagement} onChange={(e) => setFilter({ engagement: e.target.value })} className={SELECT_CLASS}>
              <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
              <option value="highly_active">{t('candidate_pool.highly_active', 'Molto attivo')}</option>
              <option value="active">{t('candidate_pool.active', 'Attivo')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('candidate_pool.availability', 'Disponibilità')}</span>
            <select value={filters.availability} onChange={(e) => setFilter({ availability: e.target.value })} className={SELECT_CLASS}>
              <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
              <option value="immediately">{t('candidate_pool.now', 'Ora')}</option>
              <option value="1_month">{t('candidate_pool.month', '1 mese')}</option>
              <option value="3_months">{t('candidate_pool.three_months', '3 mesi')}</option>
            </select>
          </label>
        </div>
      )}
    </Panel>
  );

  const table = (
    <Panel className="!p-0">
      {/* Column head: the five pillars on one scale, so rows can be compared at a glance */}
      <div className="hidden border-b border-[hsl(var(--xs-line))] px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_repeat(5,58px)_112px] lg:gap-3">
        <span className="font-mono">{t('candidate_pool.table_candidate', 'Anonymous candidate')}</span>
        {PILLAR_KEYS.map((k) => (
          <span key={k} className="text-center font-mono" title={t(`shortlist.pillar.${k}`)}>
            {t(`candidate_pool.pillar_short.${k}`)}
          </span>
        ))}
        <span className="text-right font-mono">{t('candidate_pool.table_actions', 'Actions')}</span>
      </div>

      <ul className="divide-y divide-[hsl(var(--xs-line))]">
        {candidates.map((c) => {
          const profile = XIMATAR_PROFILES[c.ximatar_archetype];
          const active = c.id === selectedId;
          const signals = poolSignals(c, t);
          return (
            <li key={c.id}>
              <div
                className={cn(
                  'grid grid-cols-1 gap-3 px-4 py-3 transition-colors lg:grid-cols-[minmax(0,1fr)_repeat(5,58px)_112px] lg:items-center',
                  active ? 'bg-primary/5' : 'hover:bg-muted/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={active}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <img
                    src={`/ximatars/${c.ximatar_archetype}.webp`}
                    alt=""
                    aria-hidden="true"
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-foreground">
                        {archetypeName(t, c.ximatar_archetype, profile?.name)}
                      </span>
                      <MemberCodeBadge code={c.subscriber_code} />
                      {c.is_synthetic && <Chip>{t('candidate_pool.sample_profile', 'Sample profile')}</Chip>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {archetypeTitle(t, c.ximatar_archetype, profile?.title)} · {t('candidate_pool.level_short', 'L{{n}}', { n: c.ximatar_level })}
                      {signals.length > 0 && <span className="lg:hidden"> · {signals.join(' · ')}</span>}
                    </span>
                  </span>
                </button>

                {/* Pillars: same order and scale as the candidate's own results */}
                {PILLAR_KEYS.map((k) => {
                  const v = readPillar(c.pillar_scores, k);
                  return (
                    <div key={k} className="hidden lg:block" title={t(`shortlist.pillar.${k}`)}>
                      <span className="block h-[5px] rounded-sm bg-[hsl(var(--xs-line))]">
                        <span className="block h-full rounded-sm bg-primary" style={{ width: `${v ?? 0}%` }} />
                      </span>
                      <span className="mt-1 block text-center font-mono text-[12px] tabular-nums text-foreground">
                        {v == null ? '—' : Math.round(v / 10)}
                      </span>
                    </div>
                  );
                })}

                <div className="flex items-center gap-2 lg:justify-end">
                  {c.is_synthetic ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => handleInvite(c)}>
                        {t('candidate_pool.invite', 'Invita')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSave(c)}
                        aria-label={t('candidate_pool.save', 'Save')}
                        disabled={savedIds.has(c.id)}
                      >
                        {savedIds.has(c.id) ? t('candidate_pool.saved_row', 'Saved') : t('candidate_pool.save', 'Save')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow={`${t('candidate_pool.eyebrow_explore', 'Esplorazione')} / ${t('candidate_pool.eyebrow_anonymous', 'Talenti anonimi')}`}
        title={t('candidate_pool.title', 'Pool di candidati')}
        subtitle={t('candidate_pool.subtitle', 'Esplora i talenti XIMA per identità, non per credenziali')}
        actions={
          <span className="flex items-baseline gap-2">
            <strong className="xs-num text-[26px] font-semibold leading-none text-foreground">{totalCount}</strong>
            <span className="text-sm text-muted-foreground">
              <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {t('candidate_pool.candidates', 'candidati')}
            </span>
          </span>
        }
      />

      <div className="space-y-4">
        {goalPanel}

        {/* Inline gate: selected goal has no active XIMA Core challenge yet */}
        {selectedGoalId && !l1ReadyGoalIds.has(selectedGoalId) && (
          <Panel accent className="!p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1 text-sm">
                <p className="font-medium text-foreground">{t('candidate_pool.no_l1_title', 'Crea prima una sfida XIMA Core')}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {t('candidate_pool.no_l1_desc', 'Questo obiettivo non ha ancora una sfida XIMA Core attiva. Creala per inviare candidati.')}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(`/business/challenges/xima-core?goal=${selectedGoalId}`)}>
                {t('candidate_pool.create_xima_core', 'Crea sfida XIMA Core')}
              </Button>
            </div>
          </Panel>
        )}

        {/* Archetype chips */}
        <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <ArchetypeChip
            id="all"
            label={t('candidate_pool.all', 'Tutti')}
            selected={!filters.archetype}
            onClick={() => setFilter({ archetype: '' })}
          />
          {Object.entries(XIMATAR_PROFILES).map(([id, profile]) => (
            <ArchetypeChip
              key={id}
              id={id}
              label={archetypeName(t, id, profile.name)}
              selected={filters.archetype === id}
              onClick={() => setFilter({ archetype: id })}
            />
          ))}
        </div>

        {filterPanel}

        {/* What the plan allows: the old banner promised 5 while 20 cards were on screen */}
        {isRestricted && (
          <p className="text-[13px] text-muted-foreground">
            <Trans
              i18nKey="candidate_pool.plan_line"
              values={{ limit: planLimit, total: totalCount }}
              components={{ b: <strong className="font-semibold text-foreground" /> }}
            />
          </p>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <p className="text-sm text-muted-foreground">{t('business.candidates.loading', 'Caricamento candidati...')}</p>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : loadError ? (
          <Panel className="space-y-4 py-14 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-[17px] font-medium text-foreground">{t('business.candidates.fetch_error', 'Errore nel caricamento dei candidati. Riprova.')}</p>
            <Button variant="outline" onClick={fetchCandidates}>{t('common.retry', 'Riprova')}</Button>
          </Panel>
        ) : candidates.length === 0 ? (
          <Panel className="space-y-4 py-14 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-[17px] font-medium text-foreground">
              {totalCount === 0
                ? t('business.candidates.pool_empty', 'La piattaforma non ha ancora candidati con XIMAtar completato')
                : t('business.candidates.no_results', 'Nessun candidato corrisponde ai filtri selezionati')}
            </p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {totalCount === 0
                ? t('candidate_pool.empty_platform_hint', 'Man mano che XIMA cresce, i candidati con XIMAtar completo appariranno qui.')
                : t('candidate_pool.try_adjusting', 'Prova a rimuovere alcuni filtri per ampliare la ricerca')}
            </p>
            {totalCount === 0 ? (
              <Button variant="outline" onClick={() => navigate('/business/hiring-goals/new')}>
                {t('candidate_pool.create_goal', 'Crea Obiettivo di Assunzione')}
              </Button>
            ) : hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>{t('candidate_pool.clear_filters', 'Cancella filtri')}</Button>
            ) : null}
          </Panel>
        ) : (
          <WithContext
            context={
              selected ? (
                <PoolCandidateDetail
                  candidate={selected}
                  onInvite={handleInvite}
                  onSave={handleSave}
                />
              ) : (
                <Panel>
                  <Eyebrow>{t('candidate_pool.five_pillars', 'The five pillars')}</Eyebrow>
                  <p className="mt-2 text-sm text-muted-foreground">{t('candidate_pool.select_candidate', 'Select a person to read their profile.')}</p>
                </Panel>
              )
            }
          >
            {table}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-muted-foreground">
                {t('candidate_pool.range', '{{from}}–{{to}} di {{total}} candidati', {
                  from: page * PAGE_SIZE + 1,
                  to: Math.min((page + 1) * PAGE_SIZE, totalCount),
                  total: totalCount,
                })}
              </p>
              {totalCount > PAGE_SIZE && (
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" disabled={page <= 0 || isLoading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                    <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('common.previous', 'Indietro')}
                  </Button>
                  <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{displayedPage} / {maxPage}</span>
                  <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= totalCount || isLoading} onClick={() => setPage((p) => p + 1)}>
                    {t('common.next', 'Avanti')}
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1 text-[12px] leading-relaxed text-muted-foreground">
              <p>{t('candidate_pool.legend')}</p>
              <p>{t('candidate_pool.legend_2')}</p>
            </div>
          </WithContext>
        )}
      </div>
    </BusinessLayout>
  );
};

export default BusinessCandidates;
