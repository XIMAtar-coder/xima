import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Building2, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCandidateChallenges, CandidateChallenge } from '@/hooks/useCandidateChallenges';
import { Skeleton } from '@/components/ui/skeleton';

const ChallengeCard: React.FC<{ challenge: CandidateChallenge }> = ({ challenge }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getStatusBadge = () => {
    if (challenge.isSubmitted) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">{t('challenge.status.submitted')}</Badge>;
    }
    if (challenge.status === 'declined') {
      return <Badge variant="secondary">{t('challenge.status.declined')}</Badge>;
    }
    switch (challenge.timeStatus) {
      case 'upcoming':
        return <Badge variant="secondary">{t('challenge.status.upcoming')}</Badge>;
      case 'expired':
      case 'archived':
        return <Badge variant="destructive">{t('challenge.status.expired')}</Badge>;
      case 'active':
      default:
        return <Badge className="bg-primary/10 text-primary border-primary/30">{t('challenge.status.active')}</Badge>;
    }
  };

  const getActionButton = () => {
    if (challenge.isSubmitted) {
      return (
        <Button variant="outline" size="sm" onClick={() => navigate(`/candidate/challenges/${challenge.invitationId}`)}>
          <CheckCircle className="h-4 w-4 mr-1" />
          {t('challenge.view_submission')}
        </Button>
      );
    }
    if (challenge.status === 'declined' || challenge.timeStatus === 'expired' || challenge.timeStatus === 'archived') {
      return null;
    }
    return (
      <Button size="sm" onClick={() => navigate(`/candidate/challenges/${challenge.invitationId}`)}>
        {t('challenge.open_challenge')}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    );
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">{challenge.challengeTitle}</h4>
              {getStatusBadge()}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{challenge.companyName}</span>
              </div>
              {challenge.roleTitle && (
                <>
                  <span className="text-border">•</span>
                  <span>{challenge.roleTitle}</span>
                </>
              )}
              {challenge.remainingText && challenge.timeStatus === 'active' && !challenge.isSubmitted && (
                <>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{challenge.remainingText}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {getActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ChallengesForYouSection: React.FC = () => {
  const { t } = useTranslation();
  const { challenges, loading, activeCount } = useCandidateChallenges();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('profile.challenges_for_you')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('profile.challenges_for_you')}
          </CardTitle>
          {activeCount > 0 && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {activeCount} {t('profile.active')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{t('profile.no_challenges_yet')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.slice(0, 5).map(challenge => (
              <ChallengeCard key={challenge.invitationId} challenge={challenge} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
