import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface XimatarProfileCardProps {
  ximatar: any;
  className?: string;
}

export const XimatarProfileCard: React.FC<XimatarProfileCardProps> = ({ ximatar, className }) => {
  const { t, i18n } = useTranslation();

  if (!ximatar) return null;

  const imageUrl = ximatar.image_url?.replace(/^public\//, '/') || '/ximatars/fox.png';
  const translations = ximatar.translations;
  const currentLang = i18n.language || 'it';

  return (
    <Card className={`animate-[fade-in_0.4s_ease-out] hover:shadow-lg transition-shadow duration-300 ${className || ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <Sparkles className="text-[#3A9FFF]" />
          {t('ximatarJourney.your_ximatar_label')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* XIMAtar Image and Name */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0 animate-[scale-in_0.5s_ease-out]">
            <img 
              src={imageUrl} 
              alt={ximatar.label} 
              className="w-full h-full object-contain rounded-full border-4 border-[#3A9FFF]/30 shadow-lg"
              onError={(e) => {
                e.currentTarget.src = '/ximatars/fox.png';
              }}
            />
            <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#3A9FFF] hover:bg-[#3A9FFF]/80">
              {ximatar.label}
            </Badge>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2 capitalize font-heading">
              {String(t(`ximatar.${ximatar.label}.name`, { defaultValue: ximatar.label }))}
            </h3>
            <p className="text-muted-foreground font-medium">
              {translations?.title || String(t(`ximatar.${ximatar.label}.title`, { defaultValue: '' }))}
            </p>
          </div>
        </div>

        {/* Core Traits */}
        {translations?.core_traits && (
          <div className="space-y-2 p-4 bg-[#3A9FFF]/5 rounded-lg border border-[#3A9FFF]/20">
            <h4 className="font-semibold text-sm text-[#3A9FFF]">{t('results.core_traits')}</h4>
            <p className="text-sm leading-relaxed">{translations.core_traits}</p>
          </div>
        )}

        {/* Strengths */}
        {translations?.behavior && (
          <div className="space-y-2 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <h4 className="font-semibold text-sm text-green-600 dark:text-green-400">
              {t('results.strengths')}
            </h4>
            <p className="text-sm leading-relaxed">{translations.behavior}</p>
          </div>
        )}

        {/* Weaknesses */}
        {translations?.weaknesses && (
          <div className="space-y-2 p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
            <h4 className="font-semibold text-sm text-orange-600 dark:text-orange-400">
              {t('results.areas_for_growth')}
            </h4>
            <p className="text-sm leading-relaxed">{translations.weaknesses}</p>
          </div>
        )}

        {/* Ideal Roles */}
        {translations?.ideal_roles && (
          <div className="space-y-2 p-4 bg-[#3A9FFF]/5 rounded-lg border border-[#3A9FFF]/20">
            <h4 className="font-semibold text-sm text-[#3A9FFF]">
              {t('results.ideal_roles')}
            </h4>
            <p className="text-sm leading-relaxed">{translations.ideal_roles}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
