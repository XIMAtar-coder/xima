
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { XimaPillars } from '../types';
import { Info } from 'lucide-react';

interface XimaScoreCardProps {
  pillars: XimaPillars;
  compact?: boolean;
  showTooltip?: boolean;
}

const XimaScoreCard: React.FC<XimaScoreCardProps> = ({ pillars, compact = false, showTooltip = true }) => {
  const { t } = useTranslation();

  const pillarColors = {
    computational: '#3b82f6',
    communication: '#10b981',
    knowledge: '#f59e0b',
    creativity: '#8b5cf6',
    drive: '#ef4444'
  };

  const pillarData = [
    { key: 'computational', value: pillars.computational },
    { key: 'communication', value: pillars.communication },
    { key: 'knowledge', value: pillars.knowledge },
    { key: 'creativity', value: pillars.creativity },
    { key: 'drive', value: pillars.drive }
  ];

  const averageScore = Math.round(
    (pillars.computational + pillars.communication + pillars.knowledge + pillars.creativity + pillars.drive) / 5
  );

  if (compact) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {pillarData.map((pillar) => (
            <div key={pillar.key} className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t(`pillars.${pillar.key}.name`)}
              </span>
              <div className="flex items-center gap-2 w-32">
                <Progress 
                  value={pillar.value * 10} 
                  className="h-2 bg-muted"
                  style={{
                    '--progress-foreground': pillarColors[pillar.key as keyof typeof pillarColors]
                  } as React.CSSProperties}
                />
                <span className="text-sm font-bold w-6 text-right">
                  {pillar.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {t('dashboard.xima_score')}
          {showTooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={16} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {t('xima_score.tooltip')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <div className="text-4xl font-bold text-primary">
          {averageScore}/10
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {pillarData.map((pillar) => (
          <div key={pillar.key} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {t(`pillars.${pillar.key}.name`)}
              </span>
              <span className="font-bold text-lg">
                {pillar.value}/10
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={pillar.value * 10} 
                className="h-3 bg-muted"
              />
              <div 
                className="absolute top-0 left-0 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${pillar.value * 10}%`,
                  backgroundColor: pillarColors[pillar.key as keyof typeof pillarColors]
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t(`pillars.${pillar.key}.description`)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default XimaScoreCard;
