import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { XIMATAR_PROFILES } from '@/lib/ximatarTaxonomy';
import { PoolCandidateCard } from '@/components/business/PoolCandidateCard';
import { ArchetypeChip } from '@/components/business/ArchetypeChip';
import { ChallengePickerModal, type Challenge } from '@/components/business/ChallengePickerModal';
import { Users, ChevronLeft, ChevronRight, X, Sparkles, Lock, Filter } from 'lucide-react';

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

const BusinessCandidates = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [planLimit, setPlanLimit] = useState(5);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Challenge invite flow
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
    }
  }, [isAuthenticated, isBusiness, businessLoading, navigate]);

  // Load all active challenges for invite flow
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('business_challenges')
      .select('id, title, updated_at, end_at, rubric, hiring_goal_id, hiring_goal_drafts!business_challenges_hiring_goal_id_fkey(role_title)')
      .eq('business_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setAllChallenges((data || []).map((c: any) => ({
          id: c.id, title: c.title, updated_at: c.updated_at, end_at: c.end_at,
          rubric: c.rubric, hiring_goal_id: c.hiring_goal_id,
          goal_title: c.hiring_goal_drafts?.role_title || '',
        })));
      });
  }, [user?.id]);

  const fetchCandidates = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('browse-candidate-pool', {
        body: { filters, page, page_size: PAGE_SIZE },
      });
      if (error) throw error;
      setCandidates(data.candidates || []);
      setTotalCount(data.total_count || 0);
      setPlanLimit(data.plan_limit || 5);
      setIsRestricted(data.is_restricted || false);
    } catch (err) {
      console.warn('[candidate-pool] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filters, page]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleInvite = (candidate: any) => {
    if (allChallenges.length === 0) {
      toast({ title: t('business.challenges.no_active'), description: t('business.challenges.create_first', 'Create a challenge first') });
      return;
    }
    setPendingInviteId(candidate.id);
    if (allChallenges.length === 1) {
      executeInvite(candidate.id, allChallenges[0]);
    } else {
      setShowChallengePicker(true);
    }
  };

  const executeInvite = async (candidateId: string, challenge: Challenge) => {
    if (!user?.id) return;
    try {
      const { data: bizProfile } = await supabase
        .from('business_profiles')
        .select('company_name')
        .eq('user_id', user.id)
        .single();

      await supabase.functions.invoke('send-challenge-invitation', {
        body: {
          candidate_profile_id: candidateId,
          challenge_id: challenge.id,
          hiring_goal_id: challenge.hiring_goal_id,
          company_name: bizProfile?.company_name || 'Company',
        },
      });
      toast({ title: t('business.candidates.invitation_sent', 'Invitation sent') });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
    setPendingInviteId(null);
    setShowChallengePicker(false);
  };

  const handleSave = (candidate: any) => {
    toast({ title: t('candidate_pool.saved', 'Candidate saved'), description: t('candidate_pool.saved_desc', 'Added to your saved list') });
  };

  const clearFilters = () => { setFilters(INITIAL_FILTERS); setPage(0); };
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k === 'min_level' ? v > 1 : Boolean(v));

  return (
    <BusinessLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('candidate_pool.title', 'Pool Candidati')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('candidate_pool.subtitle', 'Esplora i talenti XIMA per identità, non per credenziali')}</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3.5 w-3.5 mr-1" />
            {totalCount} {t('candidate_pool.candidates', 'candidati')}
          </Badge>
        </div>

        {/* Archetype chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <ArchetypeChip
            id="all"
            label={t('candidate_pool.all', 'Tutti')}
            selected={!filters.archetype}
            onClick={() => { setFilters(f => ({ ...f, archetype: '' })); setPage(0); }}
          />
          {Object.entries(XIMATAR_PROFILES).map(([id, profile]) => (
            <ArchetypeChip
              key={id}
              id={id}
              label={profile.name}
              selected={filters.archetype === id}
              onClick={() => { setFilters(f => ({ ...f, archetype: id })); setPage(0); }}
            />
          ))}
        </div>

        {/* Filter bar — card-based layout */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{t('candidate_pool.filters', 'Filtri')}</span>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" />
                {t('candidate_pool.clear_filters', 'Cancella tutti')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('candidate_pool.work_mode', 'Modalità')}</label>
              <select
                value={filters.work_mode}
                onChange={e => { setFilters(f => ({ ...f, work_mode: e.target.value })); setPage(0); }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
                <option value="remote">{t('candidate_pool.remote', 'Remote')}</option>
                <option value="hybrid">{t('candidate_pool.hybrid', 'Ibrido')}</option>
                <option value="on-site">{t('candidate_pool.onsite', 'In sede')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('candidate_pool.location', 'Località')}</label>
              <input
                type="text"
                value={filters.location}
                onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
                onBlur={() => setPage(0)}
                placeholder={t('candidate_pool.location_placeholder', 'Città o paese')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('candidate_pool.seniority', 'Seniority')}</label>
              <select
                value={filters.seniority}
                onChange={e => { setFilters(f => ({ ...f, seniority: e.target.value })); setPage(0); }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
                <option value="junior">Junior (0-2yr)</option>
                <option value="mid">Mid (3-5yr)</option>
                <option value="senior">Senior (6-10yr)</option>
                <option value="lead">Lead (10-15yr)</option>
                <option value="executive">Executive (15+yr)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('candidate_pool.industry', 'Settore')}</label>
              <input
                type="text"
                value={filters.industry}
                onChange={e => setFilters(f => ({ ...f, industry: e.target.value }))}
                onBlur={() => setPage(0)}
                placeholder={t('candidate_pool.industry_placeholder', 'es. Tech')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('candidate_pool.activity', 'Attività')}</label>
              <select
                value={filters.engagement}
                onChange={e => { setFilters(f => ({ ...f, engagement: e.target.value })); setPage(0); }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
                <option value="highly_active">{t('candidate_pool.highly_active', 'Molto attivo')}</option>
                <option value="active">{t('candidate_pool.active', 'Attivo')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('candidate_pool.availability', 'Disponibilità')}</label>
              <select
                value={filters.availability}
                onChange={e => { setFilters(f => ({ ...f, availability: e.target.value })); setPage(0); }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="">{t('candidate_pool.any', 'Qualsiasi')}</option>
                <option value="immediately">{t('candidate_pool.now', 'Ora')}</option>
                <option value="1_month">{t('candidate_pool.month', '1 mese')}</option>
                <option value="3_months">{t('candidate_pool.three_months', '3 mesi')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plan restriction banner */}
        {isRestricted && (
          <Card className="border-border bg-muted/50">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t('candidate_pool.plan_limit', 'Viewing limited to {{count}} candidates on your plan', { count: planLimit })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('candidate_pool.upgrade_hint', 'Upgrade to see the full candidate pool and unlock advanced filters.')}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/business/settings')}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {t('candidate_pool.upgrade', 'Upgrade Plan')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Candidate grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16 space-y-4 rounded-xl border bg-secondary/10">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">
              {totalCount === 0
                ? t('candidate_pool.empty_platform', 'Il pool candidati è vuoto')
                : t('candidate_pool.no_results', 'Nessun candidato corrisponde ai filtri')}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {totalCount === 0
                ? t('candidate_pool.empty_platform_hint', 'Man mano che XIMA cresce, i candidati con XIMAtar completo appariranno qui.')
                : t('candidate_pool.try_adjusting', 'Prova a rimuovere alcuni filtri per ampliare la ricerca')}
            </p>
            {totalCount === 0 ? (
              <Button variant="outline" onClick={() => navigate('/business')}>
                {t('candidate_pool.go_to_dashboard', 'Vai alla Dashboard')}
              </Button>
            ) : hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t('candidate_pool.clear_filters', 'Cancella filtri')}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {candidates.map((candidate: any) => (
                <PoolCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onInvite={handleInvite}
                  onSave={handleSave}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('common.previous', 'Previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} / {totalCount}
                </span>
                <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>
                  {t('common.next', 'Next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Challenge picker modal */}
      {showChallengePicker && pendingInviteId && (
        <ChallengePickerModal
          open={showChallengePicker}
          onOpenChange={(open) => { if (!open) { setShowChallengePicker(false); setPendingInviteId(null); } }}
          challenges={allChallenges}
          selectedCount={1}
          onConfirm={(challengeId, hiringGoalId) => {
            const challenge = allChallenges.find(c => c.id === challengeId);
            if (challenge) executeInvite(pendingInviteId, challenge);
          }}
        />
      )}
    </BusinessLayout>
  );
};

export default BusinessCandidates;
