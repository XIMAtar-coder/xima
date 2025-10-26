import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import XimaScoreCard from '../XimaScoreCard';
import { FileText, TrendingUp } from 'lucide-react';

interface CVComparisonProps {
  cvPillars?: {
    computational: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
  assessmentPillars: {
    computational: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
}

export const CVComparison: React.FC<CVComparisonProps> = ({ cvPillars, assessmentPillars }) => {
  const { t } = useTranslation();

  // Calculate differences if CV data exists
  const differences = cvPillars ? {
    computational: assessmentPillars.computational - cvPillars.computational,
    communication: assessmentPillars.communication - cvPillars.communication,
    knowledge: assessmentPillars.knowledge - cvPillars.knowledge,
    creativity: assessmentPillars.creativity - cvPillars.creativity,
    drive: assessmentPillars.drive - cvPillars.drive,
  } : null;

  const biggestImprovement = differences ? 
    Object.entries(differences).reduce((max, [key, value]) => 
      value > max[1] ? [key, value] : max, ['', -Infinity]
    )[0] : null;

  return (
    <Card className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{t('results.cv_comparison_title')}</h2>
        <p className="text-muted-foreground">
          {cvPillars 
            ? t('results.cv_comparison_description_with_cv') 
            : t('results.cv_comparison_description_without_cv')}
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        {cvPillars ? (
          <>
            {/* Side-by-side comparison */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* CV Baseline */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-muted-foreground" size={20} />
                  <h3 className="text-lg font-semibold">{t('results.cv_baseline')}</h3>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {t('results.from_cv')}
                  </Badge>
                </div>
                <XimaScoreCard pillars={cvPillars} showTooltip={false} compact />
              </div>

              {/* Assessment Results */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-primary" size={20} />
                  <h3 className="text-lg font-semibold">{t('results.full_assessment')}</h3>
                  <Badge variant="default" className="text-xs ml-auto">
                    {t('results.comprehensive')}
                  </Badge>
                </div>
                <XimaScoreCard pillars={assessmentPillars} showTooltip={false} compact />
              </div>
            </div>

            {/* Key Insights */}
            {biggestImprovement && (
              <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="text-primary" size={18} />
                  {t('results.key_insights')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('results.assessment_revealed')}: <strong>{t(`pillars.items.${biggestImprovement === 'computational' ? 'computational_power' : biggestImprovement}.name`)}</strong>
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{t('results.insight_1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{t('results.insight_2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{t('results.insight_3')}</span>
                  </li>
                </ul>
              </div>
            )}
          </>
        ) : (
          // No CV - just show assessment results
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-primary" size={20} />
              <h3 className="text-lg font-semibold">{t('results.your_xima_scores')}</h3>
            </div>
            <XimaScoreCard pillars={assessmentPillars} showTooltip />
          </div>
        )}
      </div>
    </Card>
  );
};
