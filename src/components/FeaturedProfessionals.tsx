import React from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Professional = {
  id: string;
  full_name: string;
  title: string;
  linkedin_url: string;
  avatar_path: string | null;
  locale_bio: Record<string, string>;
  expertise_tags: string[] | null;
  compatibility_score: number | null;
};

const PROFESSIONALS_DATA = [
  {
    full_name: 'Pietro Cozzi',
    title: 'Product & Growth Leader',
    linkedin_url: 'https://www.linkedin.com/in/pietro-cozzi/',
    avatar_path: 'public/avatars/pietro-cozzi.jpg',
    locale_bio: {
      it: 'Leader di prodotto e crescita, focus su GTM e metriche',
      en: 'Product & growth leader focused on GTM and metrics',
      es: 'Líder de producto y crecimiento, enfoque en GTM y métricas'
    },
    expertise_tags: ['Leadership', 'GTM', 'Growth'],
    compatibility_score: 95
  },
  {
    full_name: 'Daniel Cracau',
    title: 'Technology & Strategy',
    linkedin_url: 'https://www.linkedin.com/in/daniel-cracau/',
    avatar_path: 'public/avatars/daniel-cracau.jpg',
    locale_bio: {
      it: 'Tecnologia e strategia, trasformazione digitale',
      en: 'Technology and strategy, digital transformation',
      es: 'Tecnología y estrategia, transformación digital'
    },
    expertise_tags: ['Technology', 'Strategy'],
    compatibility_score: 91
  },
  {
    full_name: 'Roberta Fazzeri',
    title: 'People & Culture Advisor',
    linkedin_url: 'https://www.linkedin.com/in/roberta-fazzeri/',
    avatar_path: 'public/avatars/roberta-fazzeri.jpg',
    locale_bio: {
      it: 'Consulente HR, cultura e sviluppo organizzativo',
      en: 'HR advisor for culture and org development',
      es: 'Asesora de RRHH, cultura y desarrollo'
    },
    expertise_tags: ['HR', 'Culture', 'Coaching'],
    compatibility_score: 93
  }
];

export default function FeaturedProfessionals({ 
  limit = 3,
  onSelect 
}: { 
  limit?: number;
  onSelect?: (professional: any) => void;
}) {
  const { i18n, t } = useTranslation();

  const locale = (i18n.language || 'it').slice(0, 2) as 'it' | 'en' | 'es';

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {PROFESSIONALS_DATA.slice(0, limit).map((p, idx) => {
        const bio = p.locale_bio[locale] || p.locale_bio.en || '';
        const score = p.compatibility_score ?? 90;
        
        return (
          <Card key={idx} className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {p.avatar_path ? (
                  <img
                    src={`https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/avatars/${p.avatar_path.replace('public/avatars/', '')}`}
                    alt={p.full_name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="h-full w-full flex items-center justify-center text-muted-foreground text-xl">' + 
                          p.full_name.charAt(0) + '</div>';
                      }
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xl">
                    {p.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{p.full_name}</div>
                <div className="text-sm text-muted-foreground truncate">{p.title}</div>
              </div>
            </div>

            <div className="text-sm font-medium rounded-full px-3 py-1 bg-primary/10 text-primary self-start">
              {score}% {t('professionals.compatibility')}
            </div>

            {bio && <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>}

            <div className="mt-auto flex flex-col gap-2">
              <Button
                onClick={() => {
                  if (onSelect) {
                    onSelect({ id: idx.toString(), ...p });
                  }
                }}
                className="w-full"
              >
                {t('professionals.select')}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open(p.linkedin_url, '_blank', 'noopener,noreferrer')}
                className="w-full"
              >
                {t('professionals.view_linkedin')}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
