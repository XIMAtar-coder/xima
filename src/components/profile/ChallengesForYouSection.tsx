import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Building2, CheckCircle, ArrowRight, MessageSquare, Hourglass, Sparkles } from 'lucide-react';
import { useCandidateChallenges, CandidateChallenge } from '@/hooks/useCandidateChallenges';
import { Skeleton } from '@/components/ui/skeleton';

// Simplified status badge - only show actionable states, never technical terms
const StatusBadge: React.FC<{ challenge: CandidateChallenge }> = ({ challenge }) => {
  const { t } = useTranslation();

  // Submitted but awaiting review
  if (challenge.isSubmitted && !challenge.reviewDecision) {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
        <Hourglass className="h-3 w-3 mr-1" />
        {t('candidate.status.awaiting_review')}
      </Badge>
    );
  }

  // Review decisions
  if (challenge.reviewDecision === 'proceed_level2') {
    return (
      <Badge className="bg-primary">
        <ArrowRight className="h-3 w-3 mr-1" />
        {t('candidate.status.advanced')}
      </Badge>
    );
  }

  if (challenge.reviewDecision === 'followup') {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
        <MessageSquare className="h-3 w-3 mr-1" />
        {t('candidate.status.followup_requested')}
      </Badge>
    );
  }

  // Active challenge - action required
  if (challenge.timeStatus === 'active' && !challenge.isSubmitted) {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/30">
        {t('candidate.status.action_required')}
      </Badge>
    );
  }

  return null;
};

const ChallengeCard: React.FC<{ challenge: CandidateChallenge }> = ({ challenge }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getActionButton = () => {
    // Follow-up requested - show answer button
    if (challenge.reviewDecision === 'followup') {
      return (
        <Button size="sm" onClick={() => navigate(`/candidate/challenge-followup/${challenge.invitationId}`)}>
          <MessageSquare className="h-4 w-4 mr-1" />
          {t('candidate.status.answer_followup')}
        </Button>
      );
    }

    // Submitted - view only, no action
    if (challenge.isSubmitted) {
      return (
        <Button variant="outline" size="sm" onClick={() => navigate(`/candidate/challenges/${challenge.invitationId}`)}>
          <CheckCircle className="h-4 w-4 mr-1" />
          {t('challenge.view_submission')}
        </Button>
      );
    }

    // Active challenge - can start or continue
    if (challenge.timeStatus === 'active') {
      // Level 3 (Standing) goes to dedicated video page
      if (challenge.level === 3) {
        return (
          <Button size="sm" onClick={() => navigate(`/candidate/challenges/${challenge.invitationId}/standing`)}>
            {t('candidate.challenge.start_level3')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        );
      }

      // Level-specific button text for L1/L2
      const getButtonLabel = () => {
        if (challenge.level === 2) {
          return t('candidate.challenge.start_level2');
        }
        return t('candidate.challenge.start_challenge');
      };

      return (
        <Button size="sm" onClick={() => navigate(`/candidate/challenges/${challenge.invitationId}`)}>
          {getButtonLabel()}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      );
    }

    return null;
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-semibold truncate">{challenge.challengeTitle}</h4>
              <StatusBadge challenge={challenge} />
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
  const { challenges, loading } = useCandidateChallenges();

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

  // ONLY show actionable challenges - never show locked, blocked, or technical states
  // Filter out: passed decisions, expired, declined
  // Note: If an invitation exists, the DB trigger has already validated pipeline progression,
  // so we trust that Level 2/3 invitations are legitimate and should be shown.
  const actionableChallenges = challenges.filter(challenge => {
    // Never show passed decisions
    if (challenge.reviewDecision === 'pass') return false;
    
    // Never show expired or declined
    if (challenge.timeStatus === 'expired' || challenge.timeStatus === 'archived') return false;
    if (challenge.status === 'declined') return false;

    // Level 1 is always actionable
    if (challenge.level === 1) return true;
    
    // Level 2 & 3: The DB trigger (enforce_pipeline_progression) ensures invitations 
    // can only be created if prerequisites are met. If an invitation exists, it's valid.
    // Show them as actionable.
    if (challenge.level === 2 || challenge.level === 3) {
      return true;
    }
    
    return false;
  });
  
  // DEV-ONLY: Log challenge visibility
  if (import.meta.env.DEV) {
    console.log('[ChallengesForYouSection] Challenges:', {
      total: challenges.length,
      actionable: actionableChallenges.length,
      byLevel: {
        L1: challenges.filter(c => c.level === 1).length,
        L2: challenges.filter(c => c.level === 2).length,
        L3: challenges.filter(c => c.level === 3).length,
      }
    });
  }

  const activeCount = actionableChallenges.filter(c => 
    c.timeStatus === 'active' && !c.isSubmitted
  ).length;

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
              {activeCount} {t('candidate.status.action_required')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {actionableChallenges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">{t('candidate.challenges.empty_title')}</p>
            <p className="text-sm">{t('candidate.challenges.empty_desc')}</p>
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
  );
};
