import React from 'react';
import { useTranslation } from 'react-i18next';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, PolarRadiusAxis } from 'recharts';
import { Sparkles } from 'lucide-react';

interface PillarRadarChartProps {
  pillars: {
    computational_power?: number;
    computational?: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
}

export const PillarRadarChart: React.FC<PillarRadarChartProps> = ({ pillars }) => {
  const { t } = useTranslation();
  const computational = pillars.computational_power || pillars.computational || 0;

  const chartData = [
    { pillar: t('pillars.computational.name'), score: computational, fullMark: 10 },
    { pillar: t('pillars.communication.name'), score: pillars.communication || 0, fullMark: 10 },
    { pillar: t('pillars.knowledge.name'), score: pillars.knowledge || 0, fullMark: 10 },
    { pillar: t('pillars.creativity.name'), score: pillars.creativity || 0, fullMark: 10 },
    { pillar: t('pillars.drive.name'), score: pillars.drive || 0, fullMark: 10 },
  ];

  return (
    <div className="dashboard-section p-5 md:p-6 space-y-4">
      <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-[0.04em] flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-secondary" strokeWidth={1.5} />
        {t('profile.pillar_breakdown', 'Your Pillar Profile')}
      </h3>

      <div className="h-64 md:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="rgba(60,60,67,0.12)" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="pillar" tick={{ fill: '#6e6e73', fontSize: 11, fontWeight: 500 }} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              name={t('profile.your_score', 'Your Score')}
              dataKey="score"
              stroke="#5856D6"
              fill="#5856D6"
              fillOpacity={0.15}
              strokeWidth={2.5}
              animationDuration={1200}
              animationBegin={0}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {chartData.map((item) => (
          <div key={item.pillar} className="text-center">
            <p className="text-[17px] font-bold text-foreground stat-value">{item.score.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground truncate font-medium">{item.pillar}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
