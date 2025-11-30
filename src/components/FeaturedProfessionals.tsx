import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAvatarUrl } from '@/lib/avatar';

export type FieldKey = 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';

type Professional = {
  id: string;
  full_name: string;
  title: string;
  linkedin_url: string;
  avatar_path: string | null;
  locale_bio: Record<string, string>;
  expertise_tags: string[] | null;
  compatibility_score: number | null;
  field_keys: FieldKey[];
  updated_at?: string | null;
};

export default function FeaturedProfessionals({ 
  limit = 3,
  onSelect,
  fieldKey,
  selectedId
}: { 
  limit?: number;
  onSelect?: (professional: any) => void;
  fieldKey?: FieldKey;
  selectedId?: string;
}) {
  const { i18n, t } = useTranslation();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = (i18n.language || 'it').slice(0, 2) as 'it' | 'en' | 'es';

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const { data, error } = await supabase
          .from('mentors')
          .select('id, name, title, bio, profile_image_url, specialties, xima_pillars, rating, experience_years, is_active, updated_at')
          .eq('is_active', true)
          .order('rating', { ascending: false });

        if (error) {
          console.error('Error fetching mentors:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // Map mentors to professional format for compatibility
          const mapped = data.map((m: any) => ({
            id: m.id,
            full_name: m.name || 'Unknown',
            title: m.title || '',
            linkedin_url: '', // Not stored in mentors
            avatar_path: m.profile_image_url,
            locale_bio: { en: m.bio || '', it: m.bio || '', es: m.bio || '' },
            expertise_tags: m.specialties || [],
            compatibility_score: m.rating ? Math.round(m.rating * 20) : 90, // Convert 5-star to percentage
            field_keys: m.xima_pillars || [],
            updated_at: m.updated_at
          }));
          setProfessionals(mapped);
        }
      } catch (error) {
        console.error('Error fetching mentors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, []);

  // Filter professionals by field if provided
  const filteredProfessionals = fieldKey 
    ? professionals.filter(p => p.field_keys?.includes(fieldKey))
    : professionals;

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

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {filteredProfessionals.slice(0, limit).map((p) => {
        const bio = (typeof p.locale_bio === 'object' && p.locale_bio !== null)
          ? (p.locale_bio[locale] || p.locale_bio.en || '')
          : '';
        const score = p.compatibility_score ?? 90;
        const avatarUrl = getAvatarUrl(p.avatar_path, p.updated_at);
        const specialties = p.expertise_tags || [];
        const ximaPillars = p.field_keys || [];
        const isSelected = selectedId === p.id;
        
        return (
          <Card 
            key={p.id} 
            className={`p-6 flex flex-col gap-4 hover:shadow-lg transition-all ${
              isSelected ? 'ring-2 ring-primary shadow-xl' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-primary/20">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={p.full_name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="h-full w-full flex items-center justify-center text-muted-foreground text-xl font-semibold">' + 
                          p.full_name.charAt(0) + '</div>';
                      }
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

            <div className="text-sm font-medium rounded-full px-3 py-1 bg-primary/10 text-primary self-start">
              {score}% {t('professionals.compatibility')}
            </div>

            {bio && <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>}

            {/* Specialties */}
            {specialties.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Specialties</p>
                <div className="flex flex-wrap gap-1">
                  {specialties.slice(0, 3).map((specialty, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* XIMA Pillars */}
            {ximaPillars.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">XIMA Pillars</p>
                <div className="flex flex-wrap gap-1">
                  {ximaPillars.slice(0, 3).map((pillar, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium"
                    >
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto">
              <Button
                onClick={() => {
                  if (onSelect) {
                    onSelect(p);
                  }
                }}
                className="w-full"
                size="lg"
                variant={isSelected ? "default" : "outline"}
              >
                {isSelected ? '✓ Selected' : t('professionals.select')}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
