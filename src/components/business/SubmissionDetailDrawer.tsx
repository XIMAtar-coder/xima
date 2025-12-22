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
} from 'lucide-react';
import { computeSignals, SignalsPayload } from '@/lib/signals/computeSignals';
import { interpretSignals } from '@/lib/signals/interpretSignals';
import type { InvitationWithSubmission } from '@/hooks/useChallengeResponsesData';

interface ChallengeInfo {
  id: string;
  title: string;
  description: string | null;
  successCriteria: string[];
}

interface ChallengeReview {
  id: string;
  decision: 'shortlist' | 'followup' | 'pass';
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
  onSignalsGenerated?: () => void;
  onReviewSaved?: (decision: 'shortlist' | 'followup' | 'pass', followupQuestion?: string | null) => void;
}

export function SubmissionDetailDrawer({
  open,
  onOpenChange,
  submission,
  challenge,
  businessId,
  challengeId,
  onSignalsGenerated,
  onReviewSaved,
}: SubmissionDetailDrawerProps) {
  const { t } = useTranslation();
  const [generatingSignals, setGeneratingSignals] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [currentReview, setCurrentReview] = useState<ChallengeReview | null>(null);
  const [followupMode, setFollowupMode] = useState(false);
  const [followupQuestion, setFollowupQuestion] = useState('');
  const [localSignals, setLocalSignals] = useState<SignalsPayload | null>(null);
  const [followupData, setFollowupData] = useState<ChallengeFollowup | null>(null);

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

  const saveReview = async (decision: 'shortlist' | 'followup' | 'pass', question?: string) => {
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

      // If follow-up decision, create/upsert challenge_followups and send notification
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

          // Send notification to candidate
          await supabase.from('notifications').insert({
            recipient_id: submission.candidateProfileId,
            type: 'challenge',
            title: t('followup.notification_title'),
            message: t('followup.notification_message'),
            related_id: submission.invitationId,
          });
        }
      }

      setCurrentReview({
        id: currentReview?.id || 'temp',
        decision,
        followup_question: question || null,
        created_at: new Date().toISOString(),
      });

      toast({ 
        title: decision === 'shortlist' ? t('business.review.shortlisted') :
               decision === 'pass' ? t('business.review.passed') :
               t('business.review.followup_sent')
      });

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
          {/* HR-Readable Decision Insights */}
          {localSignals ? (
            <>
              {/* Decision Profile Card - Primary Insight */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {t('business.insights.decision_profile')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Decision Profile Statement */}
                  <p className="text-sm font-medium leading-relaxed">
                    {interpretSignals(localSignals).decisionProfile}
                  </p>

                  {/* Strengths & Risks Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Strengths */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-green-600">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('business.insights.strengths')}</span>
                      </div>
                      <ul className="space-y-1">
                        {interpretSignals(localSignals).strengths.map((strength, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            {strength}
                          </li>
                        ))}
                        {interpretSignals(localSignals).strengths.length === 0 && (
                          <li className="text-xs text-muted-foreground italic">—</li>
                        )}
                      </ul>
                    </div>

                    {/* Risks */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('business.insights.risks')}</span>
                      </div>
                      <ul className="space-y-1">
                        {interpretSignals(localSignals).risks.map((risk, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                            {risk}
                          </li>
                        ))}
                        {interpretSignals(localSignals).risks.length === 0 && (
                          <li className="text-xs text-muted-foreground italic">—</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Role Fit Hint */}
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">{t('business.insights.role_fit')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {interpretSignals(localSignals).roleFitHint}
                    </p>
                  </div>

                  {/* Overall Score Badge */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">{t('business.compare.overall')}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        localSignals.overall >= 70 ? 'text-green-600' : 
                        localSignals.overall >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>{localSignals.overall}</span>
                      <Progress value={localSignals.overall} className="w-16 h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Numeric Signals (Demoted - Collapsible Detail) */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('business.insights.view_detailed_scores')}
                </summary>
                <Card className="mt-2 border-dashed">
                  <CardContent className="py-4 space-y-3">
                    {/* Dimension Scores - Smaller */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'framing', label: t('business.compare.framing'), value: localSignals.framing },
                        { key: 'decision_quality', label: t('business.compare.decision'), value: localSignals.decision_quality },
                        { key: 'execution_bias', label: t('business.compare.execution'), value: localSignals.execution_bias },
                        { key: 'impact_thinking', label: t('business.compare.impact'), value: localSignals.impact_thinking },
                      ].map(dim => (
                        <div key={dim.key} className="bg-muted/50 rounded p-2 text-center">
                          <div className={`text-sm font-bold ${
                            dim.value >= 70 ? 'text-green-600' : 
                            dim.value >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>{dim.value}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight">{dim.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('business.compare.confidence')}:</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {localSignals.confidence}
                      </Badge>
                    </div>

                    {/* Flags */}
                    {localSignals.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {localSignals.flags.map((flag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/30">
                            {flag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </details>
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
                {/* Candidate preferences */}
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

                {/* Approach */}
                {payload.approach && (
                  <div>
                    <Label className="text-sm font-medium">{t('challenge.approach_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.approach}</p>
                  </div>
                )}

                {/* Assumptions */}
                {payload.assumptions && (
                  <div>
                    <Label className="text-sm font-medium">{t('challenge.assumptions_label')}</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{payload.assumptions}</p>
                  </div>
                )}

                {/* First Actions */}
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
                      {t('business.review.request_followup')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handlePass}
                      disabled={savingReview}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('business.review.pass')}
                    </Button>
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
    </Sheet>
  );
}
