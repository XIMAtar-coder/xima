import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CVComparisonCardProps {
  cvPillars: any;
  assessmentPillars: any;
  className?: string;
}

export const CVComparisonCard: React.FC<CVComparisonCardProps> = ({ 
  cvPillars, 
  assessmentPillars,
  className 
}) => {
  const { t } = useTranslation();

  if (!assessmentPillars) return null;

  const pillarKeys = ['computational', 'communication', 'knowledge', 'creativity', 'drive'];
  
  // Calculate improvements
  const improvements = cvPillars ? pillarKeys.map(key => {
    const cvScore = cvPillars[key] || 0;
    const assessmentScore = assessmentPillars[key] || 0;
    return {
      key,
      cvScore,
      assessmentScore,
      improvement: assessmentScore - cvScore
    };
  }).sort((a, b) => b.improvement - a.improvement) : [];

  const topImprovement = improvements[0];

  return (
    <Card className={`animate-[fade-in_0.5s_ease-out] hover:shadow-lg transition-shadow duration-300 ${className || ''}`}>
      <CardHeader>
        <CardTitle className="font-heading">{cvPillars ? t('results.cv_comparison_title') : t('results.assessment_scores')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pillarKeys.map(key => {
          const cvScore = cvPillars?.[key] || 0;
          const assessmentScore = assessmentPillars[key] || 0;
          const improvement = assessmentScore - cvScore;

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {t(`pillars.${key}`)}
                </span>
                {cvPillars && improvement > 0 && (
                  <Badge variant="secondary" className="gap-1 bg-[#3A9FFF]/10 text-[#3A9FFF] border-[#3A9FFF]/20">
                    <TrendingUp size={12} />
                    +{improvement.toFixed(1)}
                  </Badge>
                )}
              </div>
              
              {cvPillars ? (
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-16">CV:</span>
                    <Progress value={cvScore * 10} className="h-2 flex-1" />
                    <span className="text-xs font-medium w-8">{cvScore.toFixed(1)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-[#3A9FFF] font-medium w-16">XIMA:</span>
                    <Progress value={assessmentScore * 10} className="h-2 flex-1" />
                    <span className="text-xs font-medium w-8">{assessmentScore.toFixed(1)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Progress value={assessmentScore * 10} className="h-2 flex-1" />
                  <span className="text-sm font-medium w-12">{assessmentScore.toFixed(1)}</span>
                </div>
              )}
            </div>
          );
        })}

        {cvPillars && topImprovement && topImprovement.improvement > 0 && (
          <div className="mt-6 p-4 bg-[#3A9FFF]/10 rounded-lg border border-[#3A9FFF]/30">
            <p className="text-sm">
              <strong>{t('results.biggest_improvement')}:</strong> {t(`pillars.${topImprovement.key}`)} 
              <span className="text-[#3A9FFF] font-bold"> (+{topImprovement.improvement.toFixed(1)})</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
