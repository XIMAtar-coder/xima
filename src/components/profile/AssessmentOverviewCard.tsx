import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

interface AssessmentOverviewCardProps {
  pillarScores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
  driveLevel: 'high' | 'medium' | 'low' | null;
  storytelling: string | null;
}

export const AssessmentOverviewCard: React.FC<AssessmentOverviewCardProps> = ({
  pillarScores,
  driveLevel,
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

  const driveLevelConfig = {
    high: { color: 'bg-green-600', text: 'High Drive' },
    medium: { color: 'bg-blue-600', text: 'Medium Drive' },
    low: { color: 'bg-orange-600', text: 'Low Drive' }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <BarChart3 className="text-primary" />
          {t('profile.assessment_overview', 'Assessment Overview')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t('profile.overall_score', 'Overall Score')}
            </span>
            <span className="text-2xl font-bold text-primary">
              {averageScore.toFixed(1)}/10
            </span>
          </div>
          <Progress value={averageScore * 10} className="h-3" />
        </div>

        {/* Drive (Growth Velocity) */}
        {driveLevel && (
          <div>
            <span className="text-sm font-medium text-muted-foreground block mb-1">
              {t('profile.drive_level', 'Drive (Growth Velocity)')}
            </span>
            <p className="text-xs text-muted-foreground mb-2">
              {t('profile.drive_subtitle', 'Speed of improvement on weak areas')}
            </p>
            <Badge className={`${driveLevelConfig[driveLevel].color} text-white`}>
              {driveLevelConfig[driveLevel].text}
            </Badge>
          </div>
        )}

        {/* Pillars are dynamic note */}
        <p className="text-xs text-muted-foreground italic">
          {t('profile.pillars_dynamic', 'Pillars are dynamic. Your next steps can move them.')}
        </p>

        {/* Pillar Scores Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">
            {t('profile.pillar_scores', 'Pillar Scores')}
          </h4>
          {pillars.map(({ key, score }) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">
                  {t(`pillars.${key}.name`, key.replace('_', ' '))}
                </span>
                <span className="font-semibold">{score.toFixed(1)}/10</span>
              </div>
              <Progress value={score * 10} className="h-2" />
            </div>
          ))}
        </div>

        {/* Storytelling Summary */}
        {storytelling && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">
              {t('profile.your_story', 'Your Story')}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {storytelling}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
