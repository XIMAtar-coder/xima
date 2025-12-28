import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Building2, CheckCircle, ArrowRight, AlertTriangle, Star, MessageSquare, Hourglass, AlertCircle } from 'lucide-react';
import { useCandidateChallenges, CandidateChallenge } from '@/hooks/useCandidateChallenges';
import { Skeleton } from '@/components/ui/skeleton';
import { ChallengePipelineProgress } from '@/components/candidate/ChallengePipelineProgress';
import { CHALLENGE_LEVELS, ChallengeLevel } from '@/lib/challenges/challengeLevels';

const LevelBadge: React.FC<{ level: ChallengeLevel }> = ({ level }) => {
  const { t } = useTranslation();
  const colors = {
    1: 'bg-primary/10 text-primary border-primary/30',
    2: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    3: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  };
  
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[level]}`}>
      L{level}
    </Badge>
  );
};

const ChallengeCard: React.FC<{ challenge: CandidateChallenge }> = ({ challenge }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getStatusBadge = () => {
    // Show review decision status if available
    if (challenge.reviewDecision === 'shortlist') {
      return <Badge className="bg-green-500"><Star className="h-3 w-3 mr-1" />{t('candidate.status.shortlisted')}</Badge>;
    }
    if (challenge.reviewDecision === 'followup') {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><MessageSquare className="h-3 w-3 mr-1" />{t('candidate.status.followup_requested')}</Badge>;
    }
    if (challenge.reviewDecision === 'pass') {
      return <Badge variant="secondary">{t('candidate.status.not_selected')}</Badge>;
    }
    if (challenge.reviewDecision === 'proceed_level2') {
      return <Badge className="bg-primary"><ArrowRight className="h-3 w-3 mr-1" />{t('candidate.status.advanced')}</Badge>;
    }
    
    // Show awaiting review if submitted but no decision
    if (challenge.awaitingReview) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Hourglass className="h-3 w-3 mr-1" />{t('candidate.status.awaiting_review')}</Badge>;
    }
    
    if (challenge.isSubmitted) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />{t('challenge.status.submitted')}</Badge>;
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
    // If passed, no action
    if (challenge.reviewDecision === 'pass') {
      return null;
    }

    // If follow-up requested, show answer button
    if (challenge.reviewDecision === 'followup') {
      return (
        <Button size="sm" onClick={() => navigate(`/candidate/challenge-followup/${challenge.invitationId}`)}>
          <MessageSquare className="h-4 w-4 mr-1" />
          {t('candidate.status.answer_followup')}
        </Button>
      );
    }

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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <LevelBadge level={challenge.level} />
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
  const { challenges, loading, activeCount, overallProgress } = useCandidateChallenges();

  // Separate L1 and L2+ challenges - always show L1 if it exists
  const level1Challenges = useMemo(() => challenges.filter(c => c.level === 1), [challenges]);
  const higherLevelChallenges = useMemo(() => challenges.filter(c => c.level > 1 && !c.isLocked), [challenges]);
  
  // All actionable challenges: L1 (always) + unlocked L2+
  const actionableChallenges = useMemo(() => {
    return [...level1Challenges, ...higherLevelChallenges];
  }, [level1Challenges, higherLevelChallenges]);

  // Detect data inconsistency: L2+ exists without L1 for same business+goal
  const dataInconsistencies = useMemo(() => {
    const inconsistencies: { businessId: string; hiringGoalId: string; companyName: string }[] = [];
    
    const l2PlusChallenges = challenges.filter(c => c.level >= 2);
    for (const l2 of l2PlusChallenges) {
      const hasL1 = level1Challenges.some(
        l1 => l1.businessId === l2.businessId && l1.hiringGoalId === l2.hiringGoalId
      );
      if (!hasL1) {
        if (!inconsistencies.some(i => i.businessId === l2.businessId && i.hiringGoalId === l2.hiringGoalId)) {
          inconsistencies.push({
            businessId: l2.businessId,
            hiringGoalId: l2.hiringGoalId,
            companyName: l2.companyName,
          });
        }
      }
    }
    return inconsistencies;
  }, [challenges, level1Challenges]);

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
    <div className="space-y-4">
      {/* Data Inconsistency Debug Banner */}
      {dataInconsistencies.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700">
                  {t('candidate.data_inconsistency_title', 'Data Inconsistency Detected')}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {t('candidate.data_inconsistency_desc', 'Level 2 challenge exists without Level 1 for: {{companies}}. Please contact support.', {
                    companies: dataInconsistencies.map(i => i.companyName).join(', ')
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Progress - Always show if there are challenges */}
      {challenges.length > 0 && (
        <ChallengePipelineProgress progress={overallProgress} />
      )}
      
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
          {actionableChallenges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>{t('profile.no_challenges_yet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionableChallenges.slice(0, 10).map(challenge => (
                <ChallengeCard key={challenge.invitationId} challenge={challenge} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
