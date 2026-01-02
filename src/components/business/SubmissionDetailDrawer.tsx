import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sparkles,
  Loader2,
  Star,
  MessageSquare,
  XCircle,
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  TrendingUp,
  Target,
  Briefcase,
  Reply,
  ArrowRight,
} from 'lucide-react';
import { computeSignals, SignalsPayload } from '@/lib/signals/computeSignals';
import { interpretSignals, signalTooltips, flagTooltips, CompanyContext } from '@/lib/signals/interpretSignals';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { XimaSignalsPanel } from '@/components/signals/XimaSignalsPanel';
import { DecisionConfidencePanel } from '@/components/signals/DecisionConfidencePanel';
import { PremiumSignalsPanel } from '@/components/signals/PremiumSignalsPanel';
import { Level2SignalsPanel } from './Level2SignalsPanel';
import type { InvitationWithSubmission } from '@/hooks/useChallengeResponsesData';
import { Level2InviteModal } from './Level2InviteModal';
import { ChallengeLevel, getChallengeLevel } from '@/lib/challenges/challengeLevels';
import { isLevel2Rubric } from '@/lib/challenges/level2Templates';

interface ChallengeInfo {
  id: string;
  title: string;
  description: string | null;
  successCriteria: string[];
  rubric?: { type?: string } | null;
}

interface ChallengeReview {
  id: string;
  decision: 'shortlist' | 'followup' | 'pass' | 'proceed_level2';
  followup_question: string | null;
  created_at: string;
}

interface ChallengeFollowup {
  id: string;
  question: string;
  answer: string | null;
  asked_at: string;
  answered_at: string | null;
}

interface SubmissionDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: InvitationWithSubmission | null;
  challenge: ChallengeInfo | null;
  businessId: string;
  challengeId: string;
  hiringGoalId?: string;
  onSignalsGenerated?: () => void;
  onReviewSaved?: (decision: 'shortlist' | 'followup' | 'pass' | 'proceed_level2', followupQuestion?: string | null) => void;
  onLevel2InviteSent?: () => void;
}

export function SubmissionDetailDrawer({
  open,
  onOpenChange,
  submission,
  challenge,
  businessId,
  challengeId,
  hiringGoalId,
  onSignalsGenerated,
  onReviewSaved,
  onLevel2InviteSent,
}: SubmissionDetailDrawerProps) {
  const { t } = useTranslation();
  const [generatingSignals, setGeneratingSignals] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [currentReview, setCurrentReview] = useState<ChallengeReview | null>(null);
  const [followupMode, setFollowupMode] = useState(false);
  const [followupQuestion, setFollowupQuestion] = useState('');
  const [localSignals, setLocalSignals] = useState<SignalsPayload | null>(null);
  const [followupData, setFollowupData] = useState<ChallengeFollowup | null>(null);
  
  // Level 2 invite state
  const [level2ModalOpen, setLevel2ModalOpen] = useState(false);
  const [alreadyInvitedToLevel2, setAlreadyInvitedToLevel2] = useState(false);
  const [checkingLevel2, setCheckingLevel2] = useState(false);

  // Determine current challenge level
  const currentChallengeLevel = useMemo((): ChallengeLevel => {
    return getChallengeLevel({ rubric: challenge?.rubric });
  }, [challenge?.rubric]);

  // Fetch existing review and followup when drawer opens
  useEffect(() => {
    if (!open || !submission) {
      setCurrentReview(null);
      setFollowupMode(false);
      setFollowupQuestion('');
      setLocalSignals(null);
      setFollowupData(null);
      return;
    }

    setLocalSignals(submission.signalsPayload);

    async function fetchReviewAndFollowup() {
      // Fetch review
      const { data: reviewData } = await supabase
        .from('challenge_reviews')
        .select('id, decision, followup_question, created_at')
        .eq('invitation_id', submission!.invitationId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (reviewData) {
        setCurrentReview(reviewData as ChallengeReview);
        if (reviewData.decision === 'followup' && reviewData.followup_question) {
          setFollowupQuestion(reviewData.followup_question);
        }
      }

      // Fetch followup data
      const { data: followup } = await supabase
        .from('challenge_followups')
        .select('id, question, answer, asked_at, answered_at')
        .eq('invitation_id', submission!.invitationId)
        .maybeSingle();

      if (followup) {
        setFollowupData(followup as ChallengeFollowup);
      }
    }

    fetchReviewAndFollowup();
  }, [open, submission, businessId]);

  // Check if candidate is already invited to Level 2 for this hiring goal
  useEffect(() => {
    async function checkLevel2Invite() {
      if (!open || !submission || !hiringGoalId || currentChallengeLevel !== 1) {
        setAlreadyInvitedToLevel2(false);
        return;
      }

      setCheckingLevel2(true);
      try {
        // Get all Level 2 invitations for this candidate + hiring goal
        const { data: invitations } = await supabase
          .from('challenge_invitations')
          .select(`
            id,
            business_challenges!challenge_invitations_challenge_id_fkey (
              rubric
            )
          `)
          .eq('candidate_profile_id', submission.candidateProfileId)
          .eq('hiring_goal_id', hiringGoalId)
          .eq('business_id', businessId);

        // Check if any invitation is for a Level 2 challenge
        const hasLevel2Invite = (invitations || []).some(inv => {
          const bc = inv.business_challenges as { rubric?: { type?: string } } | null;
          const level = getChallengeLevel({ rubric: bc?.rubric });
          return level === 2;
        });

        setAlreadyInvitedToLevel2(hasLevel2Invite);
      } catch (err) {
        console.error('Error checking Level 2 invites:', err);
      } finally {
        setCheckingLevel2(false);
      }
    }

    checkLevel2Invite();
  }, [open, submission, hiringGoalId, businessId, currentChallengeLevel]);

  const payload = submission?.submissionStatus === 'submitted'
    ? submission.submittedPayload
    : submission?.draftPayload;

  const handleGenerateSignals = async () => {
    if (!submission?.submissionId || !payload) return;

    setGeneratingSignals(true);
    try {
      const signals = computeSignals(payload);

      await supabase
        .from('challenge_submissions')
        .update({
          signals_payload: signals as any,
          signals_version: 'v1',
        })
        .eq('id', submission.submissionId);

      setLocalSignals(signals);
      toast({ title: t('business.compare.signals_generated') });
      onSignalsGenerated?.();
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setGeneratingSignals(false);
    }
  };

  const saveReview = async (decision: 'shortlist' | 'followup' | 'pass' | 'proceed_level2', question?: string) => {
    if (!submission) return;

    setSavingReview(true);
    try {
      const reviewData = {
        business_id: businessId,
        challenge_id: challengeId,
        invitation_id: submission.invitationId,
        candidate_profile_id: submission.candidateProfileId,
        decision,
        followup_question: question || null,
      };

      if (currentReview) {
        // Update existing
        await supabase
          .from('challenge_reviews')
          .update({
            decision,
            followup_question: question || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentReview.id);
      } else {
        // Insert new
        await supabase
          .from('challenge_reviews')
          .insert(reviewData);
      }

      // If follow-up decision, create/upsert challenge_followups
      if (decision === 'followup' && question) {
        // Upsert followup record
        const { error: followupError } = await supabase
          .from('challenge_followups')
          .upsert({
            invitation_id: submission.invitationId,
            business_id: businessId,
            candidate_profile_id: submission.candidateProfileId,
            question: question,
            asked_at: new Date().toISOString(),
          }, { onConflict: 'invitation_id' });

        if (followupError) {
          console.error('Error creating followup:', followupError);
        } else {
          // Update local followup data
          setFollowupData({
            id: 'temp',
            question: question,
            answer: null,
            asked_at: new Date().toISOString(),
            answered_at: null,
          });
        }
      }

      setCurrentReview({
        id: currentReview?.id || 'temp',
        decision,
        followup_question: question || null,
        created_at: new Date().toISOString(),
      });

      const toastTitle = decision === 'shortlist' ? t('business.review.shortlisted') :
               decision === 'pass' ? t('business.review.passed') :
               decision === 'proceed_level2' ? t('business.review.advanced_to_level2') :
               t('business.review.followup_sent');
      
      toast({ title: toastTitle });

      setFollowupMode(false);
      onReviewSaved?.(decision, question);
    } catch (error) {
      console.error('Error saving review:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSavingReview(false);
    }
  };

  const handleShortlist = () => saveReview('shortlist');
  const handlePass = () => saveReview('pass');
  const handleFollowup = () => {
    if (followupMode && followupQuestion.trim()) {
      saveReview('followup', followupQuestion.trim());
    } else {
      setFollowupMode(true);
    }
  };

  const tradeoffLabels: Record<string, string> = {
    speed: t('challenge.tradeoff_speed'),
    quality: t('challenge.tradeoff_quality'),
    alignment: t('challenge.tradeoff_alignment'),
    data: t('challenge.tradeoff_data'),
    cost: t('challenge.tradeoff_cost'),
  };

  const confidenceLabels: Record<string, string> = {
    low: t('challenge.confidence_low'),
    medium: t('challenge.confidence_medium'),
    high: t('challenge.confidence_high'),
  };

  const getDecisionBadge = () => {
    if (!currentReview) return null;
    switch (currentReview.decision) {
      case 'shortlist':
        return <Badge className="bg-green-500"><Star className="h-3 w-3 mr-1" />{t('business.review.shortlisted')}</Badge>;
      case 'pass':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />{t('business.review.passed')}</Badge>;
      case 'followup':
        return <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" />{t('business.review.followup_pending')}</Badge>;
      case 'proceed_level2':
        return <Badge className="bg-primary"><ArrowRight className="h-3 w-3 mr-1" />{t('business.review.advanced_to_level2')}</Badge>;
    }
  };

  // Always render Sheet, check submission inside content
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {!submission ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : (
          <>
            <SheetHeader className="mb-6">
              {/* Candidate Header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`/ximatars/fox.png`} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <SheetTitle className="text-left flex items-center gap-2">
                    {submission.candidateName}
                    {submission.submissionStatus === 'draft' && (
                      <Badge variant="secondary" className="ml-1">{t('business.responses.draft')}</Badge>
                    )}
                  </SheetTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {submission.submittedAt
                      ? t('challenge.submitted_at') + ': ' + new Date(submission.submittedAt).toLocaleString()
                      : t('business.responses.not_submitted_yet')}
                  </div>
                </div>
                {getDecisionBadge()}
              </div>
            </SheetHeader>

            <div className="space-y-6">
          {/* XIMA Signals Panel - Qualitative Insights */}
          {localSignals ? (
            <>
              <XimaSignalsPanel signals={localSignals} />
              
              {/* Decision Confidence Panel */}
              <DecisionConfidencePanel signals={localSignals} />
              
              {/* XIMA Premium Signals */}
              <PremiumSignalsPanel signals={localSignals} isPremium={false} />

              {/* Numeric Signals (De-emphasized - Collapsible Detail) */}
              <TooltipProvider>
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('business.insights.view_detailed_scores')}
                  </summary>
                  <Card className="mt-2 border-dashed">
                    <CardContent className="py-4 space-y-3">
                      {/* Dimension Scores - With tooltips */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { key: 'framing', label: t('business.compare.framing'), value: localSignals.framing },
                          { key: 'decision_quality', label: t('business.compare.decision'), value: localSignals.decision_quality },
                          { key: 'execution_bias', label: t('business.compare.execution'), value: localSignals.execution_bias },
                          { key: 'impact_thinking', label: t('business.compare.impact'), value: localSignals.impact_thinking },
                        ].map(dim => (
                          <Tooltip key={dim.key}>
                            <TooltipTrigger asChild>
                              <div className="bg-muted/50 rounded p-2 text-center cursor-help">
                                <div className={`text-sm font-bold ${
                                  dim.value >= 70 ? 'text-green-600' : 
                                  dim.value >= 50 ? 'text-amber-600' : 'text-red-600'
                                }`}>{dim.value}</div>
                                <div className="text-[10px] text-muted-foreground leading-tight">{dim.label}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{signalTooltips[dim.key] || dim.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      {/* Confidence */}
                      <div className="flex items-center justify-between text-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help">{t('business.compare.confidence')}:</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{signalTooltips.confidence}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {localSignals.confidence}
                        </Badge>
                      </div>

                      {/* Flags with tooltips */}
                      {localSignals.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {localSignals.flags.map((flag, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/30 cursor-help">
                                  {flag.replace(/_/g, ' ')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">{flagTooltips[flag] || flag.replace(/_/g, ' ')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </details>
              </TooltipProvider>
            </>
          ) : submission.submissionStatus === 'submitted' ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">{t('business.compare.signals_not_generated')}</p>
                <Button
                  onClick={handleGenerateSignals}
                  disabled={generatingSignals}
                >
                  {generatingSignals ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {t('business.compare.generate_signals')}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Submission Content */}
          {payload ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('business.responses.submission_content')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Candidate preferences - only for Level 1 */}
                {(payload.tradeoff_priority || payload.confidence) && (
                  <div className="flex flex-wrap gap-2">
                    {payload.tradeoff_priority && (
                      <Badge variant="outline">
                        {t('challenge.tradeoff_label')}: {tradeoffLabels[payload.tradeoff_priority] || payload.tradeoff_priority}
                      </Badge>
                    )}
                    {payload.confidence && (
                      <Badge variant="outline">
                        {t('challenge.confidence_label')}: {confidenceLabels[payload.confidence] || payload.confidence}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Approach - both Level 1 and Level 2 */}
                {payload.approach && (
                  <div>
                    <Label className="text-sm font-medium">{t('challenge.approach_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.approach}</p>
                  </div>
                )}

                {/* Level 1 specific fields */}
                {payload.assumptions && (
                  <div>
                    <Label className="text-sm font-medium">{t('challenge.assumptions_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.assumptions}</p>
                  </div>
                )}

                {payload.first_actions?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">{t('challenge.first_actions_label')}</Label>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground mt-1 space-y-1">
                      {payload.first_actions.filter((a: string) => a?.trim()).map((action: string, i: number) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Level 2 specific fields */}
                {payload.role_plan && (
                  <div>
                    <Label className="text-sm font-medium">{t('candidate.challenge.role_plan_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.role_plan}</p>
                  </div>
                )}

                {payload.assumptions_tradeoffs && (
                  <div>
                    <Label className="text-sm font-medium">{t('candidate.challenge.assumptions_tradeoffs_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.assumptions_tradeoffs}</p>
                  </div>
                )}

                {payload.key_deliverables && (
                  <div>
                    <Label className="text-sm font-medium">{t('candidate.challenge.key_deliverables_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.key_deliverables}</p>
                  </div>
                )}

                {payload.questions_for_company && (
                  <div>
                    <Label className="text-sm font-medium">{t('candidate.challenge.questions_for_company_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.questions_for_company}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {t('business.responses.no_content')}
              </CardContent>
            </Card>
          )}

          {/* Actions Section */}
          {submission.submissionStatus === 'submitted' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('business.review.actions_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {followupMode ? (
                  <div className="space-y-3">
                    <Label>{t('business.review.followup_question_label')}</Label>
                    <Textarea
                      value={followupQuestion}
                      onChange={(e) => setFollowupQuestion(e.target.value)}
                      placeholder={t('business.review.followup_placeholder')}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleFollowup}
                        disabled={!followupQuestion.trim() || savingReview}
                      >
                        {savingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t('business.review.send_followup')}
                      </Button>
                      <Button variant="outline" onClick={() => setFollowupMode(false)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Review Actions Row */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleShortlist}
                        disabled={savingReview}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {savingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Star className="h-4 w-4 mr-2" />
                        {t('business.review.shortlist')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleFollowup}
                        disabled={savingReview}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t('business.review.request_clarification')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handlePass}
                        disabled={savingReview}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t('business.review.close_application')}
                      </Button>
                    </div>

                    {/* Proceed to next step - Only show for Level 1 submissions that have been submitted */}
                    {currentChallengeLevel === 1 && hiringGoalId && submission.submissionStatus === 'submitted' && (
                      <div className="border-t pt-3">
                        {alreadyInvitedToLevel2 ? (
                          <Button variant="outline" disabled className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            {t('business.review.next_step_sent')}
                          </Button>
                        ) : currentReview?.decision === 'proceed_level2' ? (
                          <Button 
                            variant="secondary"
                            onClick={() => setLevel2ModalOpen(true)}
                            disabled={checkingLevel2}
                            className="w-full"
                          >
                            {checkingLevel2 ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ArrowRight className="h-4 w-4 mr-2" />
                            )}
                            {t('business.review.select_next_challenge')}
                          </Button>
                        ) : (
                          <div>
                            <Button 
                              variant="default"
                              onClick={async () => {
                                await saveReview('proceed_level2');
                                setLevel2ModalOpen(true);
                              }}
                              disabled={savingReview || checkingLevel2}
                              className="w-full"
                            >
                              {(savingReview || checkingLevel2) ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ArrowRight className="h-4 w-4 mr-2" />
                              )}
                              {t('business.review.proceed_to_next_step')}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              {t('business.review.proceed_helper')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Current decision indicator */}
                {currentReview && !followupMode && (
                  <div className="text-sm text-muted-foreground border-t pt-3">
                    {t('business.review.current_decision')}: {getDecisionBadge()}
                    {currentReview.followup_question && (
                      <p className="mt-2 italic">"{currentReview.followup_question}"</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Follow-up Section - Show if followup exists */}
          {followupData && (
            <Card className={followupData.answered_at ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  {t('followup.section_title')}
                  {followupData.answered_at ? (
                    <Badge className="bg-green-500 ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('followup.answered')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-600">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('followup.pending')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Question */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('followup.question_label')}</p>
                  <p className="text-sm bg-muted/50 rounded p-2 border-l-2 border-primary">{followupData.question}</p>
                </div>

                {/* Answer */}
                {followupData.answered_at ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('followup.answer_label')}</p>
                    <p className="text-sm bg-background rounded p-2 border whitespace-pre-wrap">{followupData.answer}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('followup.answered_on', { date: new Date(followupData.answered_at).toLocaleDateString() })}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    {t('followup.waiting_for_answer')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Challenge Context */}
          {challenge && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('business.responses.challenge_context')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{challenge.title}</p>
                {challenge.successCriteria.length > 0 && (
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-2">
                    {challenge.successCriteria.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
            </div>
          </>
        )}
      </SheetContent>

      {/* Level 2 Invite Modal */}
      {submission && hiringGoalId && (
        <Level2InviteModal
          open={level2ModalOpen}
          onOpenChange={setLevel2ModalOpen}
          businessId={businessId}
          hiringGoalId={hiringGoalId}
          candidateProfileId={submission.candidateProfileId}
          candidateName={submission.candidateName}
          onInviteSent={() => {
            setAlreadyInvitedToLevel2(true);
            onLevel2InviteSent?.();
          }}
        />
      )}
    </Sheet>
  );
}
