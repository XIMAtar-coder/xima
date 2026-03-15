import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, AlertCircle, Compass } from 'lucide-react';

interface StrengthFrictionSummaryProps {
  strongestPillar: string | null;
  weakestPillar: string | null;
  growthPath: string | null;
}

export const StrengthFrictionSummary: React.FC<StrengthFrictionSummaryProps> = ({
  strongestPillar, weakestPillar, growthPath
}) => {
  const { t } = useTranslation();
  if (!strongestPillar && !weakestPillar) return null;

  return (
    <div className="dashboard-section p-5 md:p-6 space-y-5">
      <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-[0.04em] flex items-center gap-2">
        <Compass className="w-4 h-4 text-primary" strokeWidth={1.5} />
        {t('dashboard.advantage_friction_title', 'Your Edge & Friction Points')}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strongestPillar && (
          <div className="group p-4 rounded-[16px] bg-[rgba(52,199,89,0.08)] border border-[rgba(52,199,89,0.20)] hover:border-[rgba(52,199,89,0.35)] transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-[12px] bg-[rgba(52,199,89,0.15)] text-apple-green group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-apple-green uppercase tracking-[0.04em] mb-0.5">
                  {t('profile.your_edge', 'Your Edge')}
                </p>
                <p className="text-[15px] font-semibold text-foreground capitalize truncate">
                  {t(`pillars.${strongestPillar}.name`, strongestPillar)}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                  {t(`pillars.${strongestPillar}.strength_description`, 'This is your natural strength — leverage it.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {weakestPillar && (
          <div className="group p-4 rounded-[16px] bg-[rgba(255,149,0,0.08)] border border-[rgba(255,149,0,0.20)] hover:border-[rgba(255,149,0,0.35)] transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-[12px] bg-[rgba(255,149,0,0.15)] text-apple-orange group-hover:scale-110 transition-transform">
                <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-apple-orange uppercase tracking-[0.04em] mb-0.5">
                  {t('profile.friction_point', 'Friction Point')}
                </p>
                <p className="text-[15px] font-semibold text-foreground capitalize truncate">
                  {t(`pillars.${weakestPillar}.name`, weakestPillar)}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                  {t(`pillars.${weakestPillar}.growth_description`, 'Focus here for balanced growth.')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {growthPath && (
        <div className="pt-4 border-t border-[rgba(60,60,67,0.12)]">
          <p className="text-[11px] font-medium text-primary uppercase tracking-[0.04em] mb-2">
            {t('profile.growth_path', 'Growth Path')}
          </p>
          <p className="text-[15px] text-muted-foreground leading-relaxed">{growthPath}</p>
        </div>
      )}
    </div>
  );
};
