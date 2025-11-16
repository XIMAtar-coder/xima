import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';

interface XimatarHeroCardProps {
  ximatarName: string | null;
  ximatarImage: string | null;
  driveLevel: 'high' | 'medium' | 'low' | null;
  strongestPillar: string | null;
  weakestPillar: string | null;
  storytelling: string | null;
}

export const XimatarHeroCard: React.FC<XimatarHeroCardProps> = ({
  ximatarName,
  ximatarImage,
  driveLevel,
  strongestPillar,
  weakestPillar,
  storytelling
}) => {
  const { t } = useTranslation();

  const driveLevelConfig = {
    high: { color: 'bg-green-600', text: 'text-green-600', label: t('ximatar_intro.drive_paths.high', 'High Drive') },
    medium: { color: 'bg-blue-600', text: 'text-blue-600', label: t('ximatar_intro.drive_paths.medium', 'Medium Drive') },
    low: { color: 'bg-orange-600', text: 'text-orange-600', label: t('ximatar_intro.drive_paths.low', 'Low Drive') }
  };

  const driveConfig = driveLevel ? driveLevelConfig[driveLevel] : null;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left: XIMAtar Image */}
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-8 flex items-center justify-center">
            {ximatarImage ? (
              <img 
                src={ximatarImage} 
                alt={ximatarName || 'XIMAtar'} 
                className="w-full max-w-[280px] h-auto object-contain drop-shadow-2xl animate-fade-in"
              />
            ) : (
              <div className="w-64 h-64 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Right: XIMAtar Info */}
          <div className="p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('profile.your_ximatar', 'Your XIMAtar')}
                </span>
              </div>
              <h2 className="text-3xl font-bold font-heading text-foreground">
                {ximatarName || t('profile.ximatar_archetype', 'XIMAtar Archetype')}
              </h2>
            </div>

            {/* Drive Level Badge */}
            {driveConfig && (
              <Badge className={`${driveConfig.color} text-white px-4 py-1.5 text-sm`}>
                {driveConfig.label}
              </Badge>
            )}

            {/* Storytelling */}
            {storytelling && (
              <p className="text-muted-foreground leading-relaxed text-sm">
                {storytelling}
              </p>
            )}

            {/* Strongest & Weakest Pillars */}
            <div className="grid grid-cols-2 gap-4">
              {strongestPillar && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t('common.strongest', 'Your Edge')}
                    </span>
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {t(`pillars.${strongestPillar}.name`, strongestPillar)}
                  </p>
                </div>
              )}

              {weakestPillar && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t('common.area_to_develop', 'Growth Area')}
                    </span>
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {t(`pillars.${weakestPillar}.name`, weakestPillar)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
