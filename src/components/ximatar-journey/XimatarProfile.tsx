import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getXimatarImageUrl } from '@/lib/ximatar/image';

interface XimatarProfileProps {
  ximatar: {
    id: string;
    label: string;
    name: string;
    image_url?: string;
    updated_at?: string;
    traits?: string[];
    ximatar_translations?: Array<{
      lang: string;
      title: string;
      core_traits: string;
      behavior?: string;
      weaknesses?: string;
      ideal_roles?: string;
    }>;
  };
  top3Matches?: Array<{ label?: string; key?: string; score: number }>;
}

export const XimatarProfile: React.FC<XimatarProfileProps> = ({ ximatar, top3Matches = [] }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'it' | 'es';
  
  // Find translation for current language
  const translation = ximatar.ximatar_translations?.find(t => t.lang === lang) 
    || ximatar.ximatar_translations?.[0];

  // Parse behavior (strengths) and weaknesses
  const strengths = translation?.behavior 
    ? translation.behavior.split(' – ').filter(s => s.trim()) 
    : [];
  const weaknesses = translation?.weaknesses 
    ? translation.weaknesses.split(' – ').filter(w => w.trim()) 
    : [];
  const idealRoles = translation?.ideal_roles 
    ? translation.ideal_roles.split(' – ').filter(r => r.trim()) 
    : [];

  return (
    <Card className="p-8 bg-gradient-to-br from-card via-card to-primary/5">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('results.your_ximatar_profile')}</h2>
        <p className="text-muted-foreground">{t('results.ximatar_profile_description')}</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Ximatar Image and Name */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary/20 bg-muted shadow-lg flex-shrink-0">
            {ximatar.image_url ? (
              <img
                src={getXimatarImageUrl(ximatar.image_url, ximatar.updated_at) || ''}
                alt={ximatar.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
                ?
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-3">{translation?.title || ximatar.name}</h3>
            {ximatar.traits && ximatar.traits.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                {ximatar.traits.map((trait, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {trait}
                  </Badge>
                ))}
              </div>
            )}
            {top3Matches.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">
                  {t('ximatar.other_close_matches')}
                </div>
                <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                  {top3Matches.map((match, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {match.label || match.key} ({(match.score * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Strengths and Weaknesses Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={20} />
                {t('results.strengths')}
              </h4>
              <ul className="space-y-2">
                {strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {weaknesses.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <XCircle className="text-amber-500" size={20} />
                {t('results.areas_for_growth')}
              </h4>
              <ul className="space-y-2">
                {weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <XCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Ideal Roles */}
        {idealRoles.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-lg font-semibold mb-3">{t('results.ideal_roles')}</h4>
            <div className="flex flex-wrap gap-2">
              {idealRoles.map((role, idx) => (
                <Badge key={idx} variant="default" className="text-sm">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
