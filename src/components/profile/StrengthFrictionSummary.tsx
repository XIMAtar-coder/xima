import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface StrengthFrictionSummaryProps {
  strongestPillar: string | null;
  weakestPillar: string | null;
  growthPath: string | null;
}

export const StrengthFrictionSummary: React.FC<StrengthFrictionSummaryProps> = ({
  strongestPillar,
  weakestPillar,
  growthPath
}) => {
  const { t } = useTranslation();

  if (!strongestPillar && !weakestPillar) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="font-heading">
          {t('profile.strength_friction', 'Your Edge & Friction Points')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strongest Pillar - Your Edge */}
        {strongestPillar && (
          <div className="p-4 rounded-lg border-2 border-green-500/20 bg-green-500/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-600 text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-600 mb-1">
                  {t('profile.your_edge', 'Your Edge')}
                </h3>
                <p className="text-sm font-medium capitalize mb-2">
                  {t(`pillars.${strongestPillar}.name`, strongestPillar)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(`pillars.${strongestPillar}.strength_description`, 
                    'This is your natural strength - leverage it in your work and projects.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Weakest Pillar - Friction Point */}
        {weakestPillar && (
          <div className="p-4 rounded-lg border-2 border-orange-500/20 bg-orange-500/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-orange-600 text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-600 mb-1">
                  {t('profile.friction_point', 'Your Friction Point')}
                </h3>
                <p className="text-sm font-medium capitalize mb-2">
                  {t(`pillars.${weakestPillar}.name`, weakestPillar)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(`pillars.${weakestPillar}.growth_description`, 
                    'Focus on developing this area for balanced professional growth.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Growth Path */}
        {growthPath && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm mb-2">
              {t('profile.growth_path', 'Your Growth Path')}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {growthPath}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
