import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, AlertCircle, Compass } from 'lucide-react';

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
    <div className="dashboard-section p-5 md:p-6 space-y-5">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
        <Compass className="w-4 h-4 text-primary" />
        {t('profile.strength_friction', 'Your Edge & Friction Points')}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Strongest Pillar */}
        {strongestPillar && (
          <div className="group p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">
                  {t('profile.your_edge', 'Your Edge')}
                </p>
                <p className="text-sm font-semibold text-foreground capitalize truncate">
                  {t(`pillars.${strongestPillar}.name`, strongestPillar)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {t(`pillars.${strongestPillar}.strength_description`, 
                    'This is your natural strength — leverage it.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Weakest Pillar */}
        {weakestPillar && (
          <div className="group p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 group-hover:scale-110 transition-transform">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5">
                  {t('profile.friction_point', 'Friction Point')}
                </p>
                <p className="text-sm font-semibold text-foreground capitalize truncate">
                  {t(`pillars.${weakestPillar}.name`, weakestPillar)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {t(`pillars.${weakestPillar}.growth_description`, 
                    'Focus here for balanced growth.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Growth Path */}
      {growthPath && (
        <div className="pt-4 border-t border-border/50">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
            {t('profile.growth_path', 'Growth Path')}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {growthPath}
          </p>
        </div>
      )}
    </div>
  );
};