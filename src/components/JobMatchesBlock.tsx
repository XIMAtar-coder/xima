import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useJobRecommendationEngine } from '@/hooks/useJobRecommendationEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Target } from 'lucide-react';

export const JobMatchesBlock: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { recommendations, loading, error, generateRecommendations } = useJobRecommendationEngine();

  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>{t('profile.job_matches_title')}</CardTitle>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => generateRecommendations(true)}
          disabled={loading}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          {t('profile.refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 bg-muted rounded-md text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button 
              size="sm" 
              variant="link" 
              onClick={() => navigate('/ximatar-journey')}
              className="mt-2"
            >
              Take Assessment
            </Button>
          </div>
        )}
        {(!recommendations || recommendations.length === 0) && !loading && !error && (
          <p className="text-sm text-muted-foreground">{t('profile.job_matches_empty')}</p>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="max-h-80 overflow-auto space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.job.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium truncate">{recommendation.job.title}</div>
                      {recommendation.ximatarMatch && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <Sparkles className="h-3 w-3 mr-1" />
                          XIMAtar Match
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {recommendation.job.company} • {recommendation.job.location}
                    </div>
                    <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                      {recommendation.job.summary}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground mb-1">Match</div>
                    <div className={`text-2xl font-bold ${
                      recommendation.matchScore >= 85 ? 'text-green-600' :
                      recommendation.matchScore >= 70 ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {recommendation.matchScore}%
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {recommendation.job.skills.slice(0, 5).map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                  {recommendation.job.skills.length > 5 && (
                    <Badge variant="outline">+{recommendation.job.skills.length - 5}</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Skill Coverage: {recommendation.skillCoverage}%
                  </div>
                  <Button size="sm" onClick={() => navigate(`/opportunity/${recommendation.job.id}`)}>
                    {t('profile.view_opportunity')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
