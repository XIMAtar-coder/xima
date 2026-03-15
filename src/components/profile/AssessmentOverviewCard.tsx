import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Flame } from 'lucide-react';

interface AssessmentOverviewCardProps {
  pillarScores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
  driveLevel: 'high' | 'medium' | 'low' | null;
  driveScore?: number | null;
  storytelling: string | null;
}

export const AssessmentOverviewCard: React.FC<AssessmentOverviewCardProps> = ({
  pillarScores, driveLevel, driveScore, storytelling
}) => {
  const { t } = useTranslation();

  const totalScore = Object.values(pillarScores).reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / 5;

  const pillars = [
    { key: 'computational_power', score: pillarScores.computational_power },
    { key: 'communication', score: pillarScores.communication },
    { key: 'knowledge', score: pillarScores.knowledge },
    { key: 'creativity', score: pillarScores.creativity },
    { key: 'drive', score: pillarScores.drive }
  ];

  const sortedPillars = [...pillars].sort((a, b) => b.score - a.score);

  return (
    <div className="dashboard-section p-5 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-[0.04em] flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-secondary" strokeWidth={1.5} />
          {t('dashboard.assessment_overview_title', 'Assessment Overview')}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-[34px] font-bold text-foreground stat-value">{averageScore.toFixed(1)}</span>
          <span className="text-[13px] text-muted-foreground font-medium">/10</span>
        </div>
      </div>

      <div className="h-1.5 rounded-[999px] bg-[rgba(118,118,128,0.16)] overflow-hidden">
        <div className="h-full rounded-[999px] momentum-bar transition-all duration-1000" style={{ width: `${averageScore * 10}%` }} />
      </div>

      <div className="p-3 rounded-[16px] bg-[rgba(88,86,214,0.08)] border border-[rgba(88,86,214,0.15)]">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold text-foreground">{t('profile.drive_growth_velocity', 'Drive (Growth Velocity)')}</span>
        </div>
        <p className="text-[12px] text-muted-foreground mb-2">{t('profile.drive_subtitle', 'Speed of improvement on weak areas')}</p>
        {driveScore !== null && driveScore !== undefined ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-[999px] bg-[rgba(118,118,128,0.16)] overflow-hidden">
              <div className="h-full rounded-[999px] bg-secondary transition-all duration-700" style={{ width: `${driveScore}%` }} />
            </div>
            <span className="text-[13px] font-bold text-foreground stat-value">{Math.round(driveScore)}</span>
          </div>
        ) : (
          <p className="text-[12px] italic text-muted-foreground">{t('profile.drive_refining', 'Complete more challenges to measure growth velocity.')}</p>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.04em]">{t('profile.pillar_scores', 'Pillar Scores')}</p>
        {sortedPillars.map(({ key, score }, idx) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[13px] text-muted-foreground capitalize w-28 truncate">{t(`pillars.${key}.name`, key.replace('_', ' '))}</span>
            <div className="flex-1 h-1.5 rounded-[999px] bg-[rgba(118,118,128,0.16)] overflow-hidden">
              <div className="h-full rounded-[999px] bg-secondary/80 transition-all duration-700"
                style={{ width: `${score * 10}%`, opacity: 1 - (idx * 0.12), transitionDelay: `${idx * 80}ms` }}
              />
            </div>
            <span className="text-[13px] font-bold text-foreground stat-value w-8 text-right">{score.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-[#aeaeb2] italic">{t('profile.pillars_dynamic', 'Pillars are dynamic — they evolve with practice.')}</p>

      {storytelling && (
        <div className="pt-4 border-t border-[rgba(60,60,67,0.12)]">
          <p className="text-[11px] font-medium text-secondary uppercase tracking-[0.04em] mb-2">{t('profile.your_story', 'Your Story')}</p>
          <p className="text-[15px] text-muted-foreground leading-relaxed">{storytelling}</p>
        </div>
      )}
    </div>
  );
};
