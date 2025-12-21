import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Clock, CheckCircle, AlertTriangle, Timer, Loader2, Save, Send } from 'lucide-react';
import { getChallengeTimeInfo, ChallengeTimeStatus } from '@/utils/challengeTimeUtils';
import MainLayout from '@/components/layout/MainLayout';
import { computeSignals } from '@/lib/signals/computeSignals';

interface ChallengeDetails {
  invitationId: string;
  challengeId: string;
  businessId: string;
  hiringGoalId: string;
  candidateProfileId: string;
  challengeTitle: string;
  roleTitle: string | null;
  description: string | null;
  successCriteria: string[];
  timeEstimateMinutes: number | null;
  startAt: string | null;
  endAt: string | null;
  status: string;
  companyName: string;
}

interface SubmissionPayload {
  approach: string;
  assumptions: string;
  first_actions: string[];
  tradeoff_priority: string;
  confidence: string;
}

const TRADEOFF_OPTIONS = [
  { value: 'speed', labelKey: 'tradeoff_speed' },
  { value: 'quality', labelKey: 'tradeoff_quality' },
  { value: 'alignment', labelKey: 'tradeoff_alignment' },
  { value: 'data', labelKey: 'tradeoff_data' },
  { value: 'cost', labelKey: 'tradeoff_cost' },
];

const CONFIDENCE_OPTIONS = [
  { value: 'low', labelKey: 'confidence_low' },
  { value: 'medium', labelKey: 'confidence_medium' },
  { value: 'high', labelKey: 'confidence_high' },
];

export default function ChallengeCompletion() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeDetails | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'draft' | 'submitted'>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [payload, setPayload] = useState<SubmissionPayload>({
    approach: '',
    assumptions: '',
    first_actions: ['', '', ''],
    tradeoff_priority: '',
    confidence: '',
  });

  // Load challenge and submission data
  useEffect(() => {
    async function loadData() {
      if (!invitationId) return;

      try {
        // Get current user's profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          toast({ title: t('common.error'), description: 'Profile not found', variant: 'destructive' });
          return;
        }

        // Get invitation with challenge details
        const { data: invitation, error: invError } = await supabase
          .from('challenge_invitations')
          .select(`
            id,
            business_id,
            hiring_goal_id,
            challenge_id,
            candidate_profile_id,
            status,
            business_challenges!challenge_invitations_challenge_id_fkey (
              id,
              title,
              description,
              success_criteria,
              time_estimate_minutes,
              start_at,
              end_at,
              status
            ),
            hiring_goal_drafts!challenge_invitations_hiring_goal_id_fkey (
              role_title
            )
          `)
          .eq('id', invitationId)
          .eq('candidate_profile_id', profile.id)
          .single();

        if (invError || !invitation) {
          toast({ title: t('common.error'), description: 'Invitation not found', variant: 'destructive' });
          navigate('/profile');
          return;
        }

        // Get company name
        const { data: businessProfile } = await supabase
          .from('business_profiles')
          .select('company_name')
          .eq('user_id', invitation.business_id)
          .single();

        const challengeData = invitation.business_challenges as any;
        const goalData = invitation.hiring_goal_drafts as any;

        setChallenge({
          invitationId: invitation.id,
          challengeId: invitation.challenge_id || '',
          businessId: invitation.business_id,
          hiringGoalId: invitation.hiring_goal_id,
          candidateProfileId: invitation.candidate_profile_id,
          challengeTitle: challengeData?.title || 'Challenge',
          roleTitle: goalData?.role_title || null,
          description: challengeData?.description || null,
          successCriteria: challengeData?.success_criteria || [],
          timeEstimateMinutes: challengeData?.time_estimate_minutes || null,
          startAt: challengeData?.start_at || null,
          endAt: challengeData?.end_at || null,
          status: challengeData?.status || 'active',
          companyName: businessProfile?.company_name || 'Company',
        });

        // Load existing submission if any
        const { data: submission } = await supabase
          .from('challenge_submissions')
          .select('*')
          .eq('invitation_id', invitationId)
          .single();

        if (submission) {
          setSubmissionId(submission.id);
          setSubmissionStatus(submission.status as 'draft' | 'submitted');
          setSubmittedAt(submission.submitted_at);
          const existingPayload = (submission.status === 'submitted' 
            ? submission.submitted_payload 
            : submission.draft_payload) as Record<string, any> | null;
          if (existingPayload && typeof existingPayload === 'object') {
            setPayload({
              approach: existingPayload.approach || '',
              assumptions: existingPayload.assumptions || '',
              first_actions: existingPayload.first_actions || ['', '', ''],
              tradeoff_priority: existingPayload.tradeoff_priority || '',
              confidence: existingPayload.confidence || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading challenge:', error);
        toast({ title: t('common.error'), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId, navigate, t]);

  // Debounced autosave
  const saveDebounced = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (newPayload: SubmissionPayload) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          saveDraft(newPayload);
        }, 2000);
      };
    })(),
    [challenge, submissionId]
  );

  const saveDraft = async (currentPayload: SubmissionPayload) => {
    if (!challenge || submissionStatus === 'submitted') return;

    setSaving(true);
    try {
      if (submissionId) {
        await supabase
          .from('challenge_submissions')
          .update({ draft_payload: currentPayload as any })
          .eq('id', submissionId);
      } else {
        const { data, error } = await supabase
          .from('challenge_submissions')
          .insert([{
            invitation_id: challenge.invitationId,
            candidate_profile_id: challenge.candidateProfileId,
            business_id: challenge.businessId,
            hiring_goal_id: challenge.hiringGoalId,
            challenge_id: challenge.challengeId,
            draft_payload: currentPayload as any,
            status: 'draft',
          }])
          .select('id')
          .single();

        if (!error && data) {
          setSubmissionId(data.id);
        }
      }
    } catch (error) {
      console.error('Autosave error:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePayload = (field: keyof SubmissionPayload, value: any) => {
    const newPayload = { ...payload, [field]: value };
    setPayload(newPayload);
    saveDebounced(newPayload);
  };

  const updateAction = (index: number, value: string) => {
    const newActions = [...payload.first_actions];
    newActions[index] = value;
    updatePayload('first_actions', newActions);
  };

  // Calculate progress
  const progress = useMemo(() => {
    let filled = 0;
    const total = 6;
    if (payload.approach.trim()) filled++;
    if (payload.assumptions.trim()) filled++;
    if (payload.first_actions.filter(a => a.trim()).length >= 1) filled++;
    if (payload.first_actions.filter(a => a.trim()).length >= 3) filled++;
    if (payload.tradeoff_priority) filled++;
    if (payload.confidence) filled++;
    return Math.round((filled / total) * 100);
  }, [payload]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!payload.approach.trim()) errors.push(t('challenge.validation.approach_required'));
    if (!payload.assumptions.trim()) errors.push(t('challenge.validation.assumptions_required'));
    if (payload.first_actions.filter(a => a.trim()).length < 3) errors.push(t('challenge.validation.actions_required'));
    if (!payload.tradeoff_priority) errors.push(t('challenge.validation.tradeoff_required'));
    if (!payload.confidence) errors.push(t('challenge.validation.confidence_required'));
    return errors;
  }, [payload, t]);

  const handleSubmit = async () => {
    // Prevent double submission
    if (submissionStatus === 'submitted') {
      toast({
        title: t('challenge.already_submitted'),
        variant: 'destructive',
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: t('challenge.validation.incomplete'),
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      if (submissionId) {
        // Check if already submitted before updating
        const { data: existing } = await supabase
          .from('challenge_submissions')
          .select('status')
          .eq('id', submissionId)
          .single();

        if (existing?.status === 'submitted') {
          toast({
            title: t('challenge.already_submitted'),
            variant: 'destructive',
          });
          setSubmissionStatus('submitted');
          return;
        }

        // Compute XIMA signals
        const signals = computeSignals(payload);

        await supabase
          .from('challenge_submissions')
          .update({
            status: 'submitted',
            submitted_payload: payload as any,
            submitted_at: now,
            signals_payload: signals as any,
            signals_version: 'v1',
          })
          .eq('id', submissionId);
      } else {
        // Compute XIMA signals
        const signals = computeSignals(payload);

        await supabase
          .from('challenge_submissions')
          .insert([{
            invitation_id: challenge!.invitationId,
            candidate_profile_id: challenge!.candidateProfileId,
            business_id: challenge!.businessId,
            hiring_goal_id: challenge!.hiringGoalId,
            challenge_id: challenge!.challengeId,
            draft_payload: payload as any,
            submitted_payload: payload as any,
            status: 'submitted',
            submitted_at: now,
            signals_payload: signals as any,
            signals_version: 'v1',
          }]);
      }

      setSubmissionStatus('submitted');
      setSubmittedAt(now);
      toast({ title: t('challenge.submission_success') });
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Time info
  const timeInfo = challenge ? getChallengeTimeInfo(challenge.startAt, challenge.endAt, challenge.status) : null;
  const isExpired = timeInfo?.timeStatus === 'expired';
  const isUpcoming = timeInfo?.timeStatus === 'upcoming';
  const isReadOnly = isExpired || isUpcoming || submissionStatus === 'submitted';

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!challenge) {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">{t('challenge.not_found')}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Submitted confirmation
  if (submissionStatus === 'submitted') {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('challenge.submitted_title')}</h2>
              <p className="text-muted-foreground mb-4">{t('challenge.submitted_desc')}</p>
              {submittedAt && (
                <p className="text-sm text-muted-foreground">
                  {t('challenge.submitted_at')}: {new Date(submittedAt).toLocaleString()}
                </p>
              )}
              <Button onClick={() => navigate('/profile')} className="mt-6">
                {t('common.back_to_profile')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header with status */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{challenge.challengeTitle}</CardTitle>
                {challenge.roleTitle && (
                  <CardDescription>{challenge.roleTitle} • {challenge.companyName}</CardDescription>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={isExpired ? 'destructive' : isUpcoming ? 'secondary' : 'default'}>
                  {isExpired ? t('challenge.status.expired') : isUpcoming ? t('challenge.status.upcoming') : t('challenge.status.active')}
                </Badge>
                {timeInfo?.remainingText && !isExpired && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{timeInfo.remainingText}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Expired banner */}
        {isExpired && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-destructive font-medium">{t('challenge.expired_message')}</span>
            </CardContent>
          </Card>
        )}

        {/* Upcoming banner */}
        {isUpcoming && (
          <Card className="border-amber-500 bg-amber-500/10">
            <CardContent className="py-4 flex items-center gap-3">
              <Timer className="h-5 w-5 text-amber-600" />
              <span className="text-amber-700 font-medium">{t('challenge.upcoming_message')}</span>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {!isReadOnly && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('challenge.progress')}</span>
                <div className="flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">
                    {saving ? t('challenge.saving') : t('challenge.saved')}
                  </span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <span className="text-xs text-muted-foreground mt-1">{progress}%</span>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('challenge.instructions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {challenge.description && (
              <p className="text-muted-foreground">{challenge.description}</p>
            )}
            {challenge.successCriteria.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">{t('challenge.success_criteria')}</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {challenge.successCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {challenge.timeEstimateMinutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>{t('challenge.estimated_time', { minutes: challenge.timeEstimateMinutes })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('challenge.your_response')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Approach */}
            <div className="space-y-2">
              <Label htmlFor="approach">{t('challenge.approach_label')} *</Label>
              <Textarea
                id="approach"
                value={payload.approach}
                onChange={(e) => updatePayload('approach', e.target.value)}
                placeholder={t('challenge.approach_placeholder')}
                disabled={isReadOnly}
                rows={4}
              />
            </div>

            {/* Assumptions */}
            <div className="space-y-2">
              <Label htmlFor="assumptions">{t('challenge.assumptions_label')} *</Label>
              <Textarea
                id="assumptions"
                value={payload.assumptions}
                onChange={(e) => updatePayload('assumptions', e.target.value)}
                placeholder={t('challenge.assumptions_placeholder')}
                disabled={isReadOnly}
                rows={3}
              />
            </div>

            {/* First 3 Actions */}
            <div className="space-y-2">
              <Label>{t('challenge.first_actions_label')} *</Label>
              <p className="text-sm text-muted-foreground">{t('challenge.first_actions_hint')}</p>
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    value={payload.first_actions[i] || ''}
                    onChange={(e) => updateAction(i, e.target.value)}
                    placeholder={t('challenge.action_placeholder', { n: i + 1 })}
                    disabled={isReadOnly}
                  />
                ))}
              </div>
            </div>

            {/* Trade-off Priority */}
            <div className="space-y-3">
              <Label>{t('challenge.tradeoff_label')} *</Label>
              <RadioGroup
                value={payload.tradeoff_priority}
                onValueChange={(v) => updatePayload('tradeoff_priority', v)}
                disabled={isReadOnly}
                className="space-y-2"
              >
                {TRADEOFF_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`tradeoff-${opt.value}`} />
                    <Label htmlFor={`tradeoff-${opt.value}`} className="font-normal cursor-pointer">
                      {t(`challenge.${opt.labelKey}`)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Confidence */}
            <div className="space-y-2">
              <Label>{t('challenge.confidence_label')} *</Label>
              <Select
                value={payload.confidence}
                onValueChange={(v) => updatePayload('confidence', v)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('challenge.confidence_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(`challenge.${opt.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {!isReadOnly && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {validationErrors.length > 0 && (
                    <span className="text-destructive">{validationErrors.length} {t('challenge.fields_remaining')}</span>
                  )}
                </div>
                <Button onClick={handleSubmit} disabled={submitting || validationErrors.length > 0}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t('challenge.submit_btn')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
