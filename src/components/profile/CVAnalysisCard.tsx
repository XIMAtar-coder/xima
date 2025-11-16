import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, TrendingUp, Sparkles } from 'lucide-react';

interface CVAnalysisCardProps {
  cvAnalysis: {
    summary?: string | null;
    strengths?: string[] | null;
    soft_skills?: string[] | null;
  } | null;
  cvPillarScores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
  assessmentPillarScores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
}

export const CVAnalysisCard: React.FC<CVAnalysisCardProps> = ({
  cvAnalysis,
  cvPillarScores,
  assessmentPillarScores
}) => {
  const { t } = useTranslation();

  if (!cvAnalysis && !cvPillarScores) return null;

  const pillarsToCompare = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'];
  
  // Calculate biggest improvement
  let biggestImprovement = { pillar: '', diff: 0 };
  if (cvPillarScores && assessmentPillarScores) {
    pillarsToCompare.forEach((pillar) => {
      const cvScore = cvPillarScores[pillar as keyof typeof cvPillarScores] || 0;
      const assessmentScore = assessmentPillarScores[pillar as keyof typeof assessmentPillarScores] || 0;
      const diff = assessmentScore - cvScore;
      if (diff > biggestImprovement.diff) {
        biggestImprovement = { pillar, diff };
      }
    });
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <FileText className="text-primary" />
          {t('profile.cv_analysis', 'CV Analysis')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        {cvAnalysis?.summary && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground leading-relaxed">{cvAnalysis.summary}</p>
          </div>
        )}

        {/* Strengths */}
        {cvAnalysis?.strengths && cvAnalysis.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('profile.cv_strengths', 'Key Strengths from CV')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {cvAnalysis.strengths.map((strength, idx) => (
                <Badge key={idx} variant="secondary" className="bg-green-500/10 text-green-600">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Soft Skills */}
        {cvAnalysis?.soft_skills && cvAnalysis.soft_skills.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">
              {t('profile.soft_skills', 'Soft Skills Identified')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {cvAnalysis.soft_skills.map((skill, idx) => (
                <Badge key={idx} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CV vs Assessment Comparison */}
        {cvPillarScores && assessmentPillarScores && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t('profile.cv_vs_assessment', 'CV vs Assessment Comparison')}
            </h4>
            
            {biggestImprovement.diff > 0 && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-green-600 font-medium">
                  {t('profile.biggest_improvement', 'Biggest Improvement')}: {' '}
                  <span className="capitalize">
                    {t(`pillars.${biggestImprovement.pillar}.name`, biggestImprovement.pillar)}
                  </span>
                  {' '}(+{biggestImprovement.diff.toFixed(1)})
                </p>
              </div>
            )}

            <div className="space-y-3">
              {pillarsToCompare.map((pillar) => {
                const cvScore = cvPillarScores[pillar as keyof typeof cvPillarScores] || 0;
                const assessmentScore = assessmentPillarScores[pillar as keyof typeof assessmentPillarScores] || 0;
                const diff = assessmentScore - cvScore;
                
                return (
                  <div key={pillar} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {t(`pillars.${pillar}.name`, pillar.replace('_', ' '))}
                      </span>
                      <span className={`font-semibold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-orange-600' : ''}`}>
                        CV: {cvScore.toFixed(1)} → Assessment: {assessmentScore.toFixed(1)}
                        {diff !== 0 && ` (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Progress value={cvScore * 10} className="h-2 flex-1" />
                      <Progress value={assessmentScore * 10} className="h-2 flex-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
