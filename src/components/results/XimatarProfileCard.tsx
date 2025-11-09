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

  const imageUrl = ximatar.image_url?.replace('public/', '/');
  const translations = ximatar.translations;
  const currentLang = i18n.language || 'it';

  return (
    <Card className={`fade-in ${className || ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          {t('results.your_ximatar')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* XIMAtar Image and Name */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <img 
              src={imageUrl} 
              alt={ximatar.label} 
              className="w-full h-full object-contain rounded-full border-4 border-primary/20"
            />
            <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              {ximatar.label}
            </Badge>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2 capitalize">
              {String(t(`ximatar.${ximatar.label}.name`, { defaultValue: ximatar.label }))}
            </h3>
            <p className="text-muted-foreground">
              {translations?.title || String(t(`ximatar.${ximatar.label}.title`, { defaultValue: '' }))}
            </p>
          </div>
        </div>

        {/* Core Traits */}
        {translations?.core_traits && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-primary">{t('results.core_traits')}</h4>
            <p className="text-sm">{translations.core_traits}</p>
          </div>
        )}

        {/* Strengths */}
        {translations?.behavior && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-green-600 dark:text-green-400">
              {t('results.strengths')}
            </h4>
            <p className="text-sm">{translations.behavior}</p>
          </div>
        )}

        {/* Weaknesses */}
        {translations?.weaknesses && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-orange-600 dark:text-orange-400">
              {t('results.areas_for_growth')}
            </h4>
            <p className="text-sm">{translations.weaknesses}</p>
          </div>
        )}

        {/* Ideal Roles */}
        {translations?.ideal_roles && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
              {t('results.ideal_roles')}
            </h4>
            <p className="text-sm">{translations.ideal_roles}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
