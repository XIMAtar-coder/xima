import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


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
  compatibility_score: number;
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
}

export default function FeaturedProfessionals({ 
  limit = 3,
  onSelect,
  selectedId,
  pillarScores,
  ximatar
}: FeaturedProfessionalsProps) {
  const { i18n, t } = useTranslation();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const locale = (i18n.language || 'it').slice(0, 2) as 'it' | 'en' | 'es';

  const fetchProfessionals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[FeaturedProfessionals] Fetching recommendations with:', { pillarScores, ximatar });
      
      // Call the recommend-mentors edge function
      const { data, error: fnError } = await supabase.functions.invoke('recommend-mentors', {
        body: { 
          pillar_scores: pillarScores || [],
          ximatar: ximatar || null
        }
      });

      if (fnError) {
        console.error('[FeaturedProfessionals] Error from edge function:', fnError);
        // Fallback to public view query
        await fetchFromPublicView();
        return;
      }
      
      console.log('[FeaturedProfessionals] Recommendations received:', data);
      
      if (data?.recommendations && data.recommendations.length > 0) {
        const mapped = data.recommendations.map((m: any) => ({
          id: m.id,
          full_name: m.name || 'Unknown',
          title: m.title || '',
          linkedin_url: '',
          avatar_path: m.profile_image_url,
          locale_bio: { en: m.bio || '', it: m.bio || '', es: m.bio || '' },
          expertise_tags: m.specialties || [],
          compatibility_score: m.compatibility_score || 85,
          xima_pillars: m.xima_pillars || [],
          match_reasons: m.match_reasons || [],
          updated_at: m.updated_at,
          active_coached_profiles_count: m.active_coached_profiles_count || 0,
          total_coached_profiles_count: m.total_coached_profiles_count || 0,
        }));
        setProfessionals(mapped);
      } else {
        // Fallback to public view if no recommendations
        await fetchFromPublicView();
      }
    } catch (err) {
      console.error('[FeaturedProfessionals] Error:', err);
      await fetchFromPublicView();
    } finally {
      setLoading(false);
    }
  };

  const fetchFromPublicView = async () => {
    console.log('[FeaturedProfessionals] Fetching from mentors_public view');
    
    // Use the public view that is accessible to both anon and authenticated users
    const { data, error: viewError } = await supabase
      .from('mentors_public')
      .select('id, name, title, bio, profile_image_url, specialties, xima_pillars, rating, updated_at, active_coached_profiles_count, total_coached_profiles_count')
      .order('rating', { ascending: false });

    if (viewError) {
      console.error('[FeaturedProfessionals] Error fetching from mentors_public:', viewError);
      setError(t('mentors.fetch_error', 'Unable to load mentors. Please try again.'));
      return;
    }
    
    if (data && data.length > 0) {
      const mapped = data.map((m: any) => ({
        id: m.id,
        full_name: m.name || 'Unknown',
        title: m.title || '',
        linkedin_url: '',
        avatar_path: m.profile_image_url,
        locale_bio: { en: m.bio || '', it: m.bio || '', es: m.bio || '' },
        expertise_tags: m.specialties || [],
        compatibility_score: m.rating ? Math.round(m.rating * 20) : 85,
        xima_pillars: m.xima_pillars || [],
        match_reasons: [],
        updated_at: m.updated_at,
        active_coached_profiles_count: m.active_coached_profiles_count || 0,
        total_coached_profiles_count: m.total_coached_profiles_count || 0,
      }));
      setProfessionals(mapped);
    } else {
      console.log('[FeaturedProfessionals] No mentors found in public view');
      setError(t('mentors.no_mentors', 'No mentors available at the moment.'));
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, [pillarScores, ximatar]);

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-muted mb-4" />
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

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {professionals.slice(0, limit).map((p) => {
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
            }`}
          >
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
              <div className="text-sm font-medium rounded-full px-3 py-1 bg-primary/10 text-primary">
                {score}% {t('professionals.compatibility')}
              </div>
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
                  {t('professionals.specialties', 'Specialties')}
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
                  {t('professionals.xima_pillars', 'XIMA Pillars')}
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
                {isSelected ? `✓ ${t('professionals.selected', 'Selected')}` : t('professionals.select')}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
