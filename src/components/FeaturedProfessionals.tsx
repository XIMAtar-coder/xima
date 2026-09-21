import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';
import { pillarShortName } from '@/components/ximatar-journey/pillarLabels';


interface PillarScore {
  pillar: string;
  score: number;
}

type Professional = {
  id: string;
  full_name: string;
  title: string;
  linkedin_url: string;
  avatar_path: string | null;
  locale_bio: Record<string, string>;
  expertise_tags: string[] | null;
  // Set only when recommend-mentors scored the mentor against this profile.
  // null on the mentors_public fallback, which has a rating but no match.
  compatibility_score: number | null;
  xima_pillars: string[];
  match_reasons: string[];
  updated_at?: string | null;
  active_coached_profiles_count?: number;
  total_coached_profiles_count?: number;
};

interface FeaturedProfessionalsProps {
  limit?: number;
  onSelect?: (professional: Professional) => void;
  selectedId?: string;
  pillarScores?: PillarScore[];
  ximatar?: string;
  /** `compact`: the flat two-up cards of the guest results page. */
  variant?: 'default' | 'compact';
}

// Simple seeded shuffle for client-side fallback
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = Math.abs((hash * 1103515245 + 12345) & 0x7fffffff);
    const j = hash % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function FeaturedProfessionals({ 
  limit = 3,
  onSelect,
  selectedId,
  pillarScores,
  ximatar,
  variant = 'default',
}: FeaturedProfessionalsProps) {
  const compact = variant === 'compact';
  const { i18n, t } = useTranslation();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [pinnedProfessional, setPinnedProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [refreshSeed, setRefreshSeed] = useState<string | null>(null);

  const locale = (i18n.language || 'it').slice(0, 2) as 'it' | 'en' | 'es';

  const fetchProfessionals = useCallback(async (seed?: string | null, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      log.debug('[FeaturedProfessionals] Fetching recommendations with:', { pillarScores, ximatar, refresh_seed: seed });
      
      // Call the recommend-mentors edge function
      const { data, error: fnError } = await supabase.functions.invoke('recommend-mentors', {
        body: { 
          pillar_scores: pillarScores || [],
          ximatar: ximatar || null,
          refresh_seed: seed || undefined
        }
      });

      if (fnError) {
        log.error('[FeaturedProfessionals] Error from edge function:', fnError);
        // Fallback to public view query
        await fetchFromPublicView(seed);
        return;
      }
      
      log.debug('[FeaturedProfessionals] Recommendations received:', data);
      
      if (data?.recommendations && data.recommendations.length > 0) {
        const mapped = data.recommendations.map((m: any) => ({
          id: m.id,
          full_name: m.name || 'Unknown',
          title: m.title || '',
          linkedin_url: '',
          avatar_path: m.profile_image_url,
          locale_bio: { en: m.bio || '', it: m.bio || '', es: m.bio || '' },
          expertise_tags: m.specialties || [],
          compatibility_score: typeof m.compatibility_score === 'number' ? m.compatibility_score : null,
          xima_pillars: m.xima_pillars || [],
          match_reasons: m.match_reasons || [],
          updated_at: m.updated_at,
          active_coached_profiles_count: m.active_coached_profiles_count || 0,
          total_coached_profiles_count: m.total_coached_profiles_count || 0,
        }));
        
        // Handle pinned professional (selected but not in new list)
        handlePinnedProfessional(mapped);
        setProfessionals(mapped);
      } else {
        // Fallback to public view if no recommendations
        await fetchFromPublicView(seed);
      }
    } catch (err) {
      log.error('[FeaturedProfessionals] Error:', err);
      await fetchFromPublicView(seed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pillarScores, ximatar]);

  // Handle pinned professional when list changes
  const handlePinnedProfessional = useCallback((newList: Professional[]) => {
    if (selectedId) {
      const stillInList = newList.some(p => p.id === selectedId);
      if (!stillInList && professionals.length > 0) {
        // Find the selected professional from current list and pin it
        const selected = professionals.find(p => p.id === selectedId);
        if (selected) {
          setPinnedProfessional(selected);
        }
      } else if (stillInList) {
        // Clear pin if it's back in the list
        setPinnedProfessional(null);
      }
    }
  }, [selectedId, professionals]);

  const fetchFromPublicView = async (seed?: string | null) => {
    log.debug('[FeaturedProfessionals] Fetching from mentors_public view');
    
    // Use the public view that is accessible to both anon and authenticated users
    const { data, error: viewError } = await supabase
      .from('mentors_public')
      .select('id, name, title, bio, profile_image_url, specialties, xima_pillars, rating, updated_at, active_coached_profiles_count, total_coached_profiles_count')
      .order('rating', { ascending: false });

    if (viewError) {
      log.error('[FeaturedProfessionals] Error fetching from mentors_public:', viewError);
      setError(t('mentors.fetch_error', 'Unable to load mentors. Please try again.'));
      return;
    }
    
    if (data && data.length > 0) {
      let mapped = data.map((m: any) => ({
        id: m.id,
        full_name: m.name || 'Unknown',
        title: m.title || '',
        linkedin_url: '',
        avatar_path: m.profile_image_url,
        locale_bio: { en: m.bio || '', it: m.bio || '', es: m.bio || '' },
        expertise_tags: m.specialties || [],
        // A star rating scaled to 0-100 used to be shown here as "% match"
        // (and 85 when there was no rating). It says nothing about fit with
        // this candidate, so the fallback shows no percentage at all.
        compatibility_score: null,
        xima_pillars: m.xima_pillars || [],
        match_reasons: [],
        updated_at: m.updated_at,
        active_coached_profiles_count: m.active_coached_profiles_count || 0,
        total_coached_profiles_count: m.total_coached_profiles_count || 0,
      }));
      
      // Apply seeded shuffle for fallback path if seed is provided
      if (seed) {
        mapped = seededShuffle(mapped, seed);
      }
      
      handlePinnedProfessional(mapped);
      setProfessionals(mapped);
    } else {
      log.debug('[FeaturedProfessionals] No mentors found in public view');
      setError(t('mentors.no_mentors', 'No mentors available at the moment.'));
    }
  };

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    const newSeed = Date.now().toString();
    setRefreshSeed(newSeed);
    fetchProfessionals(newSeed, true);
  }, [fetchProfessionals]);

  useEffect(() => {
    fetchProfessionals(refreshSeed, false);
  }, [pillarScores, ximatar, fetchProfessionals]);

  if (loading) {
    return (
      <div className={compact ? 'grid gap-4 sm:grid-cols-2' : 'grid md:grid-cols-3 gap-4'}>
        {Array.from({ length: compact ? Math.min(limit, 2) : 3 }, (_, i) => (
          <Card key={i} className={cn('animate-pulse', compact ? 'rounded-lg border-[hsl(var(--xs-line))] p-4 shadow-none' : 'p-6')}>
            <div className={cn('rounded-full bg-muted mb-4', compact ? 'h-10 w-10' : 'h-14 w-14')} />
            <div className="h-4 bg-muted rounded mb-2" />
            <div className="h-3 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  // Show error or empty state with retry button
  if (error || professionals.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-muted-foreground">
          {error || t('mentors.no_mentors', 'No mentors available at the moment.')}
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchProfessionals()}
          className="gap-2"
        >
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  // Normalize avatar URL for public paths or external URLs
  const normalizeAvatarUrl = (path: string | null, updatedAt?: string | null): string | null => {
    if (!path) return null;
    
    let url: string;
    if (path.startsWith('http')) {
      // External URL - use as-is
      url = path;
    } else if (path.startsWith('/')) {
      // Absolute public path (e.g., "/avatars/daniel-cracau.jpg")
      url = path;
    } else {
      // Filename only - prefix with /avatars/
      url = `/avatars/${path}`;
    }
    
    // Add cache-busting
    const cacheBuster = updatedAt || Date.now().toString();
    return `${url}?v=${encodeURIComponent(cacheBuster)}`;
  };

  // Build the display list: pinned professional first (if any), then others
  const displayList = pinnedProfessional
    ? [pinnedProfessional, ...professionals.filter(p => p.id !== pinnedProfessional.id)]
    : professionals;

  if (compact) {
    const shown = displayList.slice(0, limit);
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((p) => {
            const isSelected = selectedId === p.id;
            const isPinned = pinnedProfessional?.id === p.id;
            const avatarUrl = normalizeAvatarUrl(p.avatar_path, p.updated_at);
            const bio = (typeof p.locale_bio === 'object' && p.locale_bio !== null)
              ? (p.locale_bio[locale] || p.locale_bio.en || '')
              : '';
            const specialties = (p.expertise_tags || []).slice(0, 3);
            const firstName = p.full_name.trim().split(/\s+/)[0] || p.full_name;
            return (
              <article
                key={p.id}
                className={cn(
                  'relative flex flex-col rounded-lg border bg-card p-4',
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-[hsl(var(--xs-line))]',
                )}
              >
                {isPinned && (
                  <span className="mb-2 w-fit rounded border border-[hsl(var(--xs-line))] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('professionals.your_selection', 'Your selection')}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className="grid h-[42px] w-[42px] shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-lg font-medium text-foreground">
                    {avatarUrl && !imageErrors.has(p.id) ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setImageErrors(prev => new Set([...prev, p.id]))}
                      />
                    ) : (
                      <span aria-hidden>{p.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">{p.full_name}</h3>
                    {p.title && <p className="truncate text-xs text-muted-foreground">{p.title}</p>}
                  </div>
                </div>
                {p.compatibility_score !== null && (
                  <p className="mb-2.5 mt-4 text-[13px] text-primary">
                    <b className="font-semibold tabular-nums">{p.compatibility_score}%</b> {t('guestJourney.results.mentor_affinity')}
                  </p>
                )}
                {(specialties.length > 0 || bio) && (
                  <p className={cn('line-clamp-2 text-xs text-muted-foreground', p.compatibility_score === null && 'mt-4')}>
                    {specialties.length > 0 ? specialties.join(' · ') : bio}
                  </p>
                )}
                {p.xima_pillars.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <b className="font-semibold text-foreground">{t('guestJourney.results.mentor_pillars')}</b>
                    <br />
                    {p.xima_pillars.slice(0, 3).map((pillar) => pillarShortName(t, pillar)).join(' · ')}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => onSelect?.(p)}
                    variant={isSelected ? 'default' : 'outline'}
                    aria-pressed={isSelected}
                    className="h-10 w-full rounded-md text-sm"
                  >
                    {isSelected ? `✓ ${t('guestJourney.results.mentor_chosen', { name: firstName })}` : t('guestJourney.results.mentor_choose', { name: firstName })}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          {shown.some((p) => p.compatibility_score !== null) ? (
            <p className="max-w-[520px]">{t('ximatarJourney.mentor_match_explained')}</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex shrink-0 items-center gap-1.5 text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} aria-hidden />
            {t('guestJourney.results.mentor_refresh')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh button header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('ximatarJourney.mentor_showing_compatible')}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('ximatarJourney.mentor_refresh_cta')}
        </Button>
      </div>
      
      {/* Hint text */}
      <p className="text-xs text-muted-foreground">
        {t('ximatarJourney.mentor_refresh_note')}
      </p>
      {displayList.slice(0, limit).some((p) => p.compatibility_score !== null) && (
        <p className="text-xs text-muted-foreground">
          {t('ximatarJourney.mentor_match_explained')}
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
      {displayList.slice(0, limit).map((p) => {
        const isPinned = pinnedProfessional?.id === p.id;
        const bio = (typeof p.locale_bio === 'object' && p.locale_bio !== null)
          ? (p.locale_bio[locale] || p.locale_bio.en || '')
          : '';
        const score = p.compatibility_score;
        const avatarUrl = normalizeAvatarUrl(p.avatar_path, p.updated_at);
        const specialties = p.expertise_tags || [];
        const ximaPillars = p.xima_pillars || [];
        const matchReasons = p.match_reasons || [];
        const isSelected = selectedId === p.id;
        const activeCoachees = p.active_coached_profiles_count || 0;
        const totalCoached = p.total_coached_profiles_count || 0;
        
        return (
          <Card 
            key={p.id} 
            className={`p-6 flex flex-col gap-4 hover:shadow-lg transition-all ${
              isSelected ? 'ring-2 ring-primary shadow-xl' : ''
            } ${isPinned ? 'border-primary/50' : ''}`}
          >
            {/* Pinned/Selected badge for mentors no longer in refreshed list */}
            {isPinned && (
              <Badge variant="secondary" className="w-fit text-xs">
                {t('professionals.your_selection', 'Your selection')}
              </Badge>
            )}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-primary/20">
                {avatarUrl && !imageErrors.has(p.id) ? (
                  <img
                    src={avatarUrl}
                    alt={p.full_name}
                    className="h-full w-full object-cover"
                    onError={() => {
                      setImageErrors(prev => new Set([...prev, p.id]));
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xl font-semibold">
                    {p.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-lg truncate">{p.full_name}</div>
                <div className="text-sm text-muted-foreground truncate">{p.title}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {score !== null && (
                <div className="text-sm font-medium rounded-full px-3 py-1 bg-primary/10 text-primary">
                  {score}% {t('ximatarJourney.mentor_match_label')}
                </div>
              )}
              {(activeCoachees > 0 || totalCoached > 0) && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{t('professionals.active_coachees', 'Active')}: {activeCoachees}</span>
                  <span>·</span>
                  <span>{t('professionals.total_coached', 'Total coached')}: {totalCoached}</span>
                </div>
              )}
            </div>

            {/* Match Reasons */}
            {matchReasons.length > 0 && (
              <div className="space-y-1">
                {matchReasons.slice(0, 2).map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-primary">✓</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}

            {bio && <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>}

            {/* Specialties */}
            {specialties.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('ximatarJourney.mentor_specialties_label')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {specialties.slice(0, 3).map((specialty, idx) => (
                    <Badge 
                      key={idx}
                      variant="secondary"
                      className="text-xs"
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* XIMA Pillars */}
            {ximaPillars.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('ximatarJourney.mentor_pillars_label')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {ximaPillars.slice(0, 3).map((pillar, idx) => (
                    <Badge 
                      key={idx}
                      variant="outline"
                      className="text-xs capitalize"
                    >
                      {pillar.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto">
              <Button
                onClick={() => onSelect?.(p)}
                className="w-full"
                size="lg"
                variant={isSelected ? "default" : "outline"}
              >
                {isSelected ? `✓ ${t('professionals.selected', 'Selected')}` : t('ximatarJourney.mentor_select_cta')}
              </Button>
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
