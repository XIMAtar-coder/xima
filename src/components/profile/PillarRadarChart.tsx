import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Normalize pillar data
  const computational = pillars.computational_power || pillars.computational || 0;

  const chartData = [
    { 
      pillar: t('pillars.computational.name'), 
      score: computational,
      fullMark: 10 
    },
    { 
      pillar: t('pillars.communication.name'), 
      score: pillars.communication || 0,
      fullMark: 10 
    },
    { 
      pillar: t('pillars.knowledge.name'), 
      score: pillars.knowledge || 0,
      fullMark: 10 
    },
    { 
      pillar: t('pillars.creativity.name'), 
      score: pillars.creativity || 0,
      fullMark: 10 
    },
    { 
      pillar: t('pillars.drive.name'), 
      score: pillars.drive || 0,
      fullMark: 10 
    },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <Sparkles className="text-primary" />
          {t('profile.pillar_breakdown', 'Your Pillar Profile')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="pillar" 
                tick={{ 
                  fill: 'hsl(var(--foreground))', 
                  fontSize: 12,
                  fontWeight: 500
                }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 10]} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Radar 
                name={t('profile.your_score', 'Your Score')}
                dataKey="score" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.6}
                strokeWidth={2}
                animationDuration={1000}
                animationBegin={0}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Pillar Values List */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {chartData.map((item, index) => (
            <div 
              key={item.pillar} 
              className="space-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.pillar}</span>
                <span className="font-bold text-foreground">{item.score.toFixed(1)}/10</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(item.score / 10) * 100}%`,
                    transitionDelay: `${index * 100}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic mt-4">
          {t('profile.pillars_dynamic', 'Pillars are dynamic — they evolve with practice.')}
        </p>
      </CardContent>
    </Card>
  );
};
