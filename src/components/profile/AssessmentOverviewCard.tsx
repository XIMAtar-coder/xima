import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatScore } from '@/components/candidate/PillarBars';
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
  pillarScores, driveLevel, storytelling
}) => {
  const { t, i18n } = useTranslation();

  // The four content pillars are a profile, not a ranking: no average.
  // Drive has its own scale (choices with a cost) and is shown on its own.
  const pillars = [
    { key: 'computational_power', score: pillarScores.computational_power },
    { key: 'communication', score: pillarScores.communication },
    { key: 'knowledge', score: pillarScores.knowledge },
    { key: 'creativity', score: pillarScores.creativity },
  ];
  const sortedPillars = [...pillars].sort((a, b) => b.score - a.score);
  const drive = typeof pillarScores.drive === 'number' ? pillarScores.drive : null;

  return (
    <div className="dashboard-section p-5 md:p-6 space-y-5">
      <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-[0.04em] flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-secondary" strokeWidth={1.5} />
        {t('dashboard.assessment_overview_title', 'Assessment Overview')}
      </h3>

      <div className="p-3 rounded-[16px] bg-[rgba(88,86,214,0.08)] border border-[rgba(88,86,214,0.15)]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Flame className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />
            Drive{driveLevel ? ` · ${t(`profile.drive_level_${driveLevel}`)}` : ''}
          </span>
          <span className="text-[13px] font-bold text-foreground stat-value">{formatScore(drive, i18n.language)} / 10</span>
        </div>
        <p className="text-[12px] text-muted-foreground mb-2">{t('dashboard.drive_overview_body', 'Measured by the choices with a cost in the questionnaire: how often you pick the road that makes you grow. It shows your pace of growth, not your worth.')}</p>
        {drive !== null && (
          <div className="h-1.5 rounded-[999px] bg-[rgba(118,118,128,0.16)] overflow-hidden">
            <div className="h-full rounded-[999px] bg-secondary transition-all duration-700" style={{ width: `${drive * 10}%` }} />
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.04em]">{t('dashboard.pillar_scores_title', 'Pillar Scores')}</p>
        {sortedPillars.map(({ key, score }, idx) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[13px] text-muted-foreground w-28 truncate">{t(`pillars.${key}.name`, key.replace('_', ' '))}</span>
            <div className="flex-1 h-1.5 rounded-[999px] bg-[rgba(118,118,128,0.16)] overflow-hidden">
              <div className="h-full rounded-[999px] bg-secondary/80 transition-all duration-700"
                style={{ width: `${score * 10}%`, opacity: 1 - (idx * 0.12), transitionDelay: `${idx * 80}ms` }}
              />
            </div>
            <span className="text-[13px] font-bold text-foreground stat-value w-8 text-right">{formatScore(score, i18n.language)}</span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-[#aeaeb2] italic">{t('dashboard.pillar_scores_note', 'Pillars are dynamic — they evolve with practice.')}</p>

      {storytelling && (
        <div className="pt-4 border-t border-[rgba(60,60,67,0.12)]">
          <p className="text-[11px] font-medium text-secondary uppercase tracking-[0.04em] mb-2">{t('dashboard.story_title', 'Your Story')}</p>
          <p className="text-[15px] text-muted-foreground leading-relaxed">{storytelling}</p>
        </div>
      )}
    </div>
  );
};
