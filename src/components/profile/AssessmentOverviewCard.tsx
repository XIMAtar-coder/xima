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
  pillarScores,
  driveLevel,
  driveScore,
  storytelling
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

  // Sort pillars descending for visual impact
  const sortedPillars = [...pillars].sort((a, b) => b.score - a.score);

  return (
    <div className="dashboard-section p-5 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {t('profile.assessment_overview', 'Assessment Overview')}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-primary stat-value">{averageScore.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground font-medium">/10</span>
        </div>
      </div>

      {/* Overall score bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className="h-full rounded-full momentum-bar transition-all duration-1000"
          style={{ width: `${averageScore * 10}%` }}
        />
      </div>

      {/* Drive (Growth Velocity) */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {t('profile.drive_growth_velocity', 'Drive (Growth Velocity)')}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">
          {t('profile.drive_subtitle', 'Speed of improvement on weak areas')}
        </p>
        {driveScore !== null && driveScore !== undefined ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${driveScore}%` }} />
            </div>
            <span className="text-xs font-bold text-foreground stat-value">{Math.round(driveScore)}</span>
          </div>
        ) : (
          <p className="text-[10px] italic text-muted-foreground">
            {t('profile.drive_refining', 'Complete more challenges to measure growth velocity.')}
          </p>
        )}
      </div>

      {/* Pillar Scores — horizontal bars ranked */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {t('profile.pillar_scores', 'Pillar Scores')}
        </p>
        {sortedPillars.map(({ key, score }, idx) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground capitalize w-28 truncate">
              {t(`pillars.${key}.name`, key.replace('_', ' '))}
            </span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full bg-primary/80 transition-all duration-700"
                style={{ 
                  width: `${score * 10}%`,
                  opacity: 1 - (idx * 0.12),
                  transitionDelay: `${idx * 80}ms`
                }}
              />
            </div>
            <span className="text-xs font-bold text-foreground stat-value w-8 text-right">{score.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/60 italic">
        {t('profile.pillars_dynamic', 'Pillars are dynamic — they evolve with practice.')}
      </p>

      {/* Storytelling Summary */}
      {storytelling && (
        <div className="pt-4 border-t border-border/50">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
            {t('profile.your_story', 'Your Story')}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {storytelling}
          </p>
        </div>
      )}
    </div>
  );
};