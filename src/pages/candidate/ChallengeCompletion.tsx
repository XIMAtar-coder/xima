import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Clock, CheckCircle, AlertTriangle, Timer, Loader2, Send, Target } from 'lucide-react';
import { getChallengeTimeInfo, ChallengeTimeStatus } from '@/utils/challengeTimeUtils';
import MainLayout from '@/components/layout/MainLayout';
import { computeSignals, SignalsPayload } from '@/lib/signals/computeSignals';
import { ChallengePipelineProgress } from '@/components/candidate/ChallengePipelineProgress';
import { CandidateReflectionPanel } from '@/components/signals/CandidateReflectionPanel';
import { ChallengeProgressHeader } from '@/components/candidate/ChallengeProgressHeader';
import { CharacterCountTextarea } from '@/components/candidate/CharacterCountTextarea';
import { PreChallengeBriefing } from '@/components/candidate/PreChallengeBriefing';
import { ReassuranceToast } from '@/components/candidate/ReassuranceToast';
import { Level2ContextBlock } from '@/components/candidate/Level2ContextBlock';
import { isLevel2Rubric, RoleFamily } from '@/lib/challenges/level2Templates';
import { 
  ChallengeLevel, 
  getChallengeLevel, 
  computeLevelProgress,
  CandidateLevelProgress,
  CHALLENGE_LEVELS 
} from '@/lib/challenges/challengeLevels';

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
  level: ChallengeLevel;
  // Level 2 specific fields
  roleFamily?: RoleFamily | null;
  skillFocus?: string[];
  scenarioContext?: string | null; // AI-generated scenario from XIMA Core
}

interface SubmissionPayload {
  approach: string;
  assumptions: string;
  first_actions: string[];
  tradeoff_priority: string;
  confidence: string;
}

// Level 2 payload - role-specific structured response (hard skills)
interface Level2Payload {
  approach: string;
  decisions_tradeoffs: string;
  concrete_deliverables: string;
  tools_methods: string;
  risks_failures: string;
  questions_for_company: string;
}

interface PrerequisiteBlock {
  blocked: boolean;
  requiredLevel: ChallengeLevel;
  prerequisiteInvitationId: string | null;
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

// Default payloads for each level
const DEFAULT_L1_PAYLOAD: SubmissionPayload = {
  approach: '',
  assumptions: '',
  first_actions: ['', '', ''],
  tradeoff_priority: '',
  confidence: '',
};

const DEFAULT_L2_PAYLOAD: Level2Payload = {
  approach: '',
  decisions_tradeoffs: '',
  concrete_deliverables: '',
  tools_methods: '',
  risks_failures: '',
  questions_for_company: '',
};

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
  const [submittedSignals, setSubmittedSignals] = useState<SignalsPayload | null>(null);
  const [prerequisiteBlock, setPrerequisiteBlock] = useState<PrerequisiteBlock | null>(null);
  const [levelProgress, setLevelProgress] = useState<CandidateLevelProgress | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
  // Briefing state - check localStorage to see if already acknowledged
  const [briefingCompleted, setBriefingCompleted] = useState<boolean>(() => {
    if (!invitationId) return false;
    return localStorage.getItem(`xima_briefing_${invitationId}`) === 'completed';
  });
  
  // Show reassurance only when just started (briefing just completed, no prior draft)
  const [showReassurance, setShowReassurance] = useState<boolean>(() => {
    if (!invitationId) return false;
    // Show if briefing was just completed but reassurance not yet shown
    const briefingDone = localStorage.getItem(`xima_briefing_${invitationId}`) === 'completed';
    const reassuranceShown = localStorage.getItem(`xima_reassurance_${invitationId}`) === 'shown';
    // We'll trigger this in handleStartChallenge instead
    return false;
    return localStorage.getItem(`xima_briefing_${invitationId}`) === 'completed';
  });

  // Level 1 payload
  const [payload, setPayload] = useState<SubmissionPayload>(DEFAULT_L1_PAYLOAD);
  
  // Level 2 payload
  const [level2Payload, setLevel2Payload] = useState<Level2Payload>(DEFAULT_L2_PAYLOAD);

  // MIN_CHARS threshold for field completion
  const MIN_CHARS = 120;

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
              status,
              rubric
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
        // getChallengeLevel now handles type coercion internally
        const rubric = challengeData?.rubric || null;
        const level = getChallengeLevel({ rubric, title: challengeData?.title });
        console.log('[ChallengeCompletion] Level detection:', { rubric, title: challengeData?.title, detectedLevel: level });

        // Extract Level 2 specific fields from rubric
        let roleFamily: RoleFamily | null = null;
        let skillFocus: string[] = [];
        let scenarioContext: string | null = null;
        
        if (rubric && isLevel2Rubric(rubric)) {
          roleFamily = rubric.role_family || null;
          skillFocus = rubric.skill_focus || [];
        }

        // For Level 2 challenges, fetch the XIMA Core (Level 1) scenario from the same hiring goal
        if (level === 2) {
          const { data: l1Challenges } = await supabase
            .from('business_challenges')
            .select('description, rubric, title')
            .eq('hiring_goal_id', invitation.hiring_goal_id)
            .eq('business_id', invitation.business_id);

          // Find the Level 1 challenge (XIMA Core)
          const l1Challenge = (l1Challenges || []).find(ch => {
            const chLevel = getChallengeLevel({ rubric: ch.rubric as Record<string, unknown>, title: ch.title });
            return chLevel === 1;
          });

          if (l1Challenge?.description) {
            scenarioContext = l1Challenge.description;
          }
        }

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
          level,
          roleFamily,
          skillFocus,
          scenarioContext,
        });

        // Check progression prerequisites for this hiring goal
        // Get all invitations + submissions for the same hiring goal
        const { data: goalInvitations } = await supabase
          .from('challenge_invitations')
          .select(`
            id,
            challenge_id,
            business_challenges!challenge_invitations_challenge_id_fkey (
              rubric,
              title
            )
          `)
          .eq('candidate_profile_id', profile.id)
          .eq('hiring_goal_id', invitation.hiring_goal_id);

        const invitationIds = (goalInvitations || []).map(i => i.id);
        
        // Get submissions for these invitations
        const { data: goalSubmissions } = await supabase
          .from('challenge_submissions')
          .select('invitation_id, status')
          .in('invitation_id', invitationIds);

        const submissionMap = new Map((goalSubmissions || []).map(s => [s.invitation_id, s.status]));

        // Build progress from all goal invitations
        const progressData = (goalInvitations || []).map(inv => {
          const bc = inv.business_challenges as any;
          const invRubric = bc?.rubric || null;
          const invLevel = getChallengeLevel({ rubric: invRubric, title: bc?.title });
          const status = submissionMap.get(inv.id) || 'draft';
          console.log('[ChallengeCompletion] Invitation level:', { invId: inv.id, rubric: invRubric, title: bc?.title, level: invLevel, status });
          return { challenge_level: invLevel, status };
        });

        const progress = computeLevelProgress(progressData);
        setLevelProgress(progress);

        // Check if this challenge level is blocked
        if (level === 2 && !progress.completedLevels.includes(1)) {
          // Find L1 invitation
          const l1Inv = (goalInvitations || []).find(inv => {
            const bc = inv.business_challenges as any;
            return getChallengeLevel({ rubric: bc?.rubric, title: bc?.title }) === 1;
          });
          setPrerequisiteBlock({
            blocked: true,
            requiredLevel: 1,
            prerequisiteInvitationId: l1Inv?.id || null,
          });
        } else if (level === 3 && !progress.completedLevels.includes(2)) {
          const l2Inv = (goalInvitations || []).find(inv => {
            const bc = inv.business_challenges as any;
            return getChallengeLevel({ rubric: bc?.rubric, title: bc?.title }) === 2;
          });
          setPrerequisiteBlock({
            blocked: true,
            requiredLevel: 2,
            prerequisiteInvitationId: l2Inv?.id || null,
          });
        } else {
          setPrerequisiteBlock({ blocked: false, requiredLevel: 1, prerequisiteInvitationId: null });
        }

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
          
          // Load signals for reflection panel
          if (submission.signals_payload) {
            setSubmittedSignals(submission.signals_payload as unknown as SignalsPayload);
          }
          
          const existingPayload = (submission.status === 'submitted' 
            ? submission.submitted_payload 
            : submission.draft_payload) as Record<string, any> | null;
          if (existingPayload && typeof existingPayload === 'object') {
            // Check if it's a Level 2 payload (new format or legacy)
            if ('decisions_tradeoffs' in existingPayload || 'role_plan' in existingPayload) {
              setLevel2Payload({
                approach: existingPayload.approach || '',
                decisions_tradeoffs: existingPayload.decisions_tradeoffs || existingPayload.assumptions_tradeoffs || '',
                concrete_deliverables: existingPayload.concrete_deliverables || existingPayload.key_deliverables || '',
                tools_methods: existingPayload.tools_methods || existingPayload.role_plan || '',
                risks_failures: existingPayload.risks_failures || '',
                questions_for_company: existingPayload.questions_for_company || '',
              });
            } else {
              // Level 1 payload
              setPayload({
                approach: existingPayload.approach || '',
                assumptions: existingPayload.assumptions || '',
                first_actions: existingPayload.first_actions || ['', '', ''],
                tradeoff_priority: existingPayload.tradeoff_priority || '',
                confidence: existingPayload.confidence || '',
              });
            }
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
    if (!challenge || !invitationId || submissionStatus === 'submitted') return;

    setSaving(true);
    try {
      if (submissionId) {
        await supabase
          .from('challenge_submissions')
          .update({ draft_payload: currentPayload as any })
          .eq('id', submissionId);
      } else {
        // Fetch invitation for authoritative values
        const { data: invitation } = await supabase
          .from('challenge_invitations')
          .select('id, business_id, hiring_goal_id, challenge_id, candidate_profile_id')
          .eq('id', invitationId)
          .single();

        if (!invitation) {
          console.error('Invitation not found for draft save');
          return;
        }

        const { data, error } = await supabase
          .from('challenge_submissions')
          .upsert({
            invitation_id: invitation.id,
            candidate_profile_id: invitation.candidate_profile_id,
            business_id: invitation.business_id,
            hiring_goal_id: invitation.hiring_goal_id,
            challenge_id: invitation.challenge_id,
            draft_payload: currentPayload as any,
            status: 'draft',
          }, {
            onConflict: 'invitation_id',
          })
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
      setLastSaveTime(new Date());
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

  // Level 2 update handlers
  const updateLevel2Payload = (field: keyof Level2Payload, value: string) => {
    const newPayload = { ...level2Payload, [field]: value };
    setLevel2Payload(newPayload);
    saveLevel2Debounced(newPayload);
  };

  // Debounced save for Level 2
  const saveLevel2Debounced = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (newPayload: Level2Payload) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          saveLevel2Draft(newPayload);
        }, 2000);
      };
    })(),
    [challenge, submissionId]
  );

  const saveLevel2Draft = async (currentPayload: Level2Payload) => {
    if (!challenge || !invitationId || submissionStatus === 'submitted') return;

    setSaving(true);
    try {
      if (submissionId) {
        await supabase
          .from('challenge_submissions')
          .update({ draft_payload: currentPayload as any })
          .eq('id', submissionId);
      } else {
        const { data: invitation } = await supabase
          .from('challenge_invitations')
          .select('id, business_id, hiring_goal_id, challenge_id, candidate_profile_id')
          .eq('id', invitationId)
          .single();

        if (!invitation) {
          console.error('Invitation not found for draft save');
          return;
        }

        const { data, error } = await supabase
          .from('challenge_submissions')
          .upsert({
            invitation_id: invitation.id,
            candidate_profile_id: invitation.candidate_profile_id,
            business_id: invitation.business_id,
            hiring_goal_id: invitation.hiring_goal_id,
            challenge_id: invitation.challenge_id,
            draft_payload: currentPayload as any,
            status: 'draft',
          }, {
            onConflict: 'invitation_id',
          })
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
      setLastSaveTime(new Date());
    }
  };

  // Calculate progress - handles both Level 1 and Level 2 using MIN_CHARS
  const progress = useMemo(() => {
    if (challenge?.level === 2) {
      // Level 2 progress - 5 required fields
      let filled = 0;
      const total = 5;
      if (level2Payload.approach.trim().length >= MIN_CHARS) filled++;
      if (level2Payload.decisions_tradeoffs.trim().length >= MIN_CHARS) filled++;
      if (level2Payload.concrete_deliverables.trim().length >= MIN_CHARS) filled++;
      if (level2Payload.tools_methods.trim().length >= MIN_CHARS) filled++;
      if (level2Payload.risks_failures.trim().length >= MIN_CHARS) filled++;
      return Math.round((filled / total) * 100);
    }
    // Level 1 progress - textareas use MIN_CHARS, other fields just need values
    let filled = 0;
    const total = 5; // approach, assumptions, actions, tradeoff, confidence
    if (payload.approach.trim().length >= MIN_CHARS) filled++;
    if (payload.assumptions.trim().length >= MIN_CHARS) filled++;
    if (payload.first_actions.filter(a => a.trim()).length >= 3) filled++;
    if (payload.tradeoff_priority) filled++;
    if (payload.confidence) filled++;
    return Math.round((filled / total) * 100);
  }, [payload, level2Payload, challenge?.level, MIN_CHARS]);

  // Validation - handles both Level 1 and Level 2
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (challenge?.level === 2) {
      // Level 2 validation
      if (!level2Payload.approach.trim()) errors.push(t('challenge.validation.approach_required'));
      if (!level2Payload.decisions_tradeoffs.trim()) errors.push(t('challenge.validation.decisions_required'));
      if (!level2Payload.concrete_deliverables.trim()) errors.push(t('challenge.validation.deliverables_required'));
      if (!level2Payload.tools_methods.trim()) errors.push(t('challenge.validation.tools_required'));
      if (!level2Payload.risks_failures.trim()) errors.push(t('challenge.validation.risks_required'));
      return errors;
    }
    // Level 1 validation
    if (!payload.approach.trim()) errors.push(t('challenge.validation.approach_required'));
    if (!payload.assumptions.trim()) errors.push(t('challenge.validation.assumptions_required'));
    if (payload.first_actions.filter(a => a.trim()).length < 3) errors.push(t('challenge.validation.actions_required'));
    if (!payload.tradeoff_priority) errors.push(t('challenge.validation.tradeoff_required'));
    if (!payload.confidence) errors.push(t('challenge.validation.confidence_required'));
    return errors;
  }, [payload, level2Payload, challenge?.level, t]);

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

    if (!invitationId) {
      toast({ title: t('common.error'), description: 'Missing invitation ID', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // ALWAYS re-fetch the invitation to get authoritative field values
      const { data: invitation, error: invError } = await supabase
        .from('challenge_invitations')
        .select('id, business_id, hiring_goal_id, challenge_id, candidate_profile_id')
        .eq('id', invitationId)
        .single();

      if (invError || !invitation) {
        console.error('Invitation fetch error:', invError);
        toast({ title: t('common.error'), description: invError?.message || 'Invitation not found', variant: 'destructive' });
        return;
      }

      // Validation guard: ensure required fields are present
      if (!invitation.candidate_profile_id) {
        console.error('Missing candidate_profile_id on invitation:', invitation);
        toast({ title: t('common.error'), description: 'Missing candidate profile', variant: 'destructive' });
        return;
      }

      const now = new Date().toISOString();
      
      // Determine which payload to use based on level
      const submissionPayload = challenge?.level === 2 ? level2Payload : payload;
      
      // Only compute signals for Level 1
      const signals = challenge?.level === 1 ? computeSignals(payload) : null;

      // Use invitation as the source of truth for all foreign keys
      // CRITICAL: signals_version must NEVER be null (NOT NULL constraint)
      const submissionData: Record<string, unknown> = {
        invitation_id: invitation.id,
        candidate_profile_id: invitation.candidate_profile_id,
        business_id: invitation.business_id,
        hiring_goal_id: invitation.hiring_goal_id,
        challenge_id: invitation.challenge_id,
        status: 'submitted',
        submitted_payload: submissionPayload,
        submitted_at: now,
        signals_version: 'v1', // Explicit, never null
      };

      // Only include signals_payload if it exists (Level 1 only)
      if (signals && Object.keys(signals).length > 0) {
        submissionData.signals_payload = signals;
      }

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

        // Update existing submission
        const updateData = {
          ...submissionData,
          draft_payload: submissionPayload,
        };
        const { error: updateError } = await supabase
          .from('challenge_submissions')
          .update(updateData as any)
          .eq('id', submissionId);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
      } else {
        // Insert new submission with upsert on invitation_id
        const insertData = {
          ...submissionData,
          draft_payload: submissionPayload,
        };
        const { error: insertError } = await supabase
          .from('challenge_submissions')
          .upsert(insertData as any, {
            onConflict: 'invitation_id',
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      // Also update the invitation status to reflect submission
      await supabase
        .from('challenge_invitations')
        .update({ status: 'submitted', responded_at: now })
        .eq('id', invitationId);

      setSubmissionStatus('submitted');
      setSubmittedAt(now);
      toast({ title: t('challenge.submission_success') });
    } catch (error: any) {
      console.error('Submit error:', error);
      // Show real Supabase error message for debugging
      const errorMessage = error?.message || error?.details || 'Submission failed';
      toast({ title: t('common.error'), description: errorMessage, variant: 'destructive' });
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

  // Blocked by prerequisite - DO NOT show technical blocking UI
  // Instead, silently redirect to profile - candidates should never see "locked" states
  if (prerequisiteBlock?.blocked) {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Handle briefing start - mark as completed, trigger reassurance, and store in localStorage
  const handleStartChallenge = () => {
    if (invitationId) {
      localStorage.setItem(`xima_briefing_${invitationId}`, 'completed');
      setBriefingCompleted(true);
      // Trigger reassurance toast (only if not previously shown)
      const reassuranceShown = localStorage.getItem(`xima_reassurance_${invitationId}`) === 'shown';
      if (!reassuranceShown) {
        setShowReassurance(true);
      }
    }
  };

  // Show Pre-Challenge Briefing if not yet completed (and not already submitted)
  // Also skip briefing if there's already draft data (user has started before)
  const hasDraftData = challenge.level === 2 
    ? Object.values(level2Payload).some(v => v.trim().length > 0)
    : payload.approach.trim().length > 0 || payload.assumptions.trim().length > 0;

  if (!briefingCompleted && !hasDraftData && submissionStatus !== 'submitted') {
    const estimatedMinutes = challenge.timeEstimateMinutes || (challenge.level === 1 ? 25 : 35);
    return (
      <PreChallengeBriefing
        level={challenge.level}
        companyName={challenge.companyName}
        challengeTitle={challenge.challengeTitle}
        estimatedMinutes={estimatedMinutes}
        roleTitle={challenge.roleTitle}
        onStart={handleStartChallenge}
      />
    );
  }

  // Submitted confirmation - human-friendly awaiting review state with reflection
  if (submissionStatus === 'submitted') {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-8 space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <Badge variant="outline" className="mb-4 bg-blue-500/10 text-blue-600 border-blue-500/30">
                {t('candidate.status.awaiting_review')}
              </Badge>
              <h2 className="text-xl font-bold mb-2">{t('candidate.challenge.submitted_title')}</h2>
              <p className="text-muted-foreground mb-2">
                {t('candidate.challenge.submitted_helper', { company: challenge?.companyName || '' })}
              </p>
              {submittedAt && (
                <p className="text-sm text-muted-foreground">
                  {t('challenge.submitted_at')}: {new Date(submittedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Candidate Reflection Panel - Show signals */}
          {submittedSignals && (
            <CandidateReflectionPanel signals={submittedSignals} />
          )}
          
          <div className="flex justify-center">
            <Button onClick={() => navigate('/profile')} variant="outline">
              {t('common.back_to_profile')}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Sticky Progress Header */}
      {!isReadOnly && challenge && invitationId && (
        <ChallengeProgressHeader
          invitationId={invitationId}
          level={challenge.level as 1 | 2 | 3}
          completionPercent={progress}
          saving={saving}
          lastSaveTime={lastSaveTime}
          estimatedMinutes={challenge.timeEstimateMinutes}
        />
      )}
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Reassurance Toast - shows briefly after starting challenge */}
        {showReassurance && invitationId && (
          <ReassuranceToast 
            invitationId={invitationId}
            onDismiss={() => setShowReassurance(false)}
          />
        )}
        
        {/* XIMA Core Challenge Intro Block */}
        {challenge.level === 1 && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">{t('candidate.challenge.xima_core_title')}</h2>
                  <p className="text-muted-foreground mb-3">
                    {t('candidate.challenge.xima_core_desc')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('candidate.challenge.xima_core_helper')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Progress card removed - using sticky header instead */}

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

        {/* Response Form - Level 1 */}
        {challenge.level === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('challenge.your_response')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Approach */}
              <CharacterCountTextarea
                id="approach"
                label={t('challenge.approach_label')}
                value={payload.approach}
                onChange={(v) => updatePayload('approach', v)}
                placeholder={t('challenge.approach_placeholder')}
                disabled={isReadOnly}
                required
                rows={4}
                minChars={MIN_CHARS}
              />

              {/* Assumptions */}
              <CharacterCountTextarea
                id="assumptions"
                label={t('challenge.assumptions_label')}
                value={payload.assumptions}
                onChange={(v) => updatePayload('assumptions', v)}
                placeholder={t('challenge.assumptions_placeholder')}
                disabled={isReadOnly}
                required
                rows={3}
                minChars={MIN_CHARS}
              />

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
        )}

        {/* Level 2 Context Block + Response Form */}
        {challenge.level === 2 && (
          <>
            {/* Scenario Context Block - Read-only, always visible */}
            <Level2ContextBlock
              companyName={challenge.companyName}
              roleTitle={challenge.roleTitle}
              roleFamily={challenge.roleFamily}
              skillFocus={challenge.skillFocus}
              scenarioContext={challenge.scenarioContext}
            />
            
            <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('challenge.your_response')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('candidate.level2.form_intro')}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Approach */}
              <CharacterCountTextarea
                id="l2-approach"
                label={t('candidate.level2.approach_label')}
                value={level2Payload.approach}
                onChange={(v) => updateLevel2Payload('approach', v)}
                placeholder={t('candidate.level2.approach_placeholder')}
                disabled={isReadOnly}
                required
                rows={4}
                minChars={MIN_CHARS}
              />

              {/* Key Decisions & Trade-offs */}
              <CharacterCountTextarea
                id="decisions-tradeoffs"
                label={t('candidate.level2.decisions_label')}
                value={level2Payload.decisions_tradeoffs}
                onChange={(v) => updateLevel2Payload('decisions_tradeoffs', v)}
                placeholder={t('candidate.level2.decisions_placeholder')}
                disabled={isReadOnly}
                required
                rows={5}
                minChars={MIN_CHARS}
              />

              {/* Concrete Deliverables */}
              <CharacterCountTextarea
                id="deliverables"
                label={t('candidate.level2.deliverables_label')}
                value={level2Payload.concrete_deliverables}
                onChange={(v) => updateLevel2Payload('concrete_deliverables', v)}
                placeholder={t('candidate.level2.deliverables_placeholder')}
                disabled={isReadOnly}
                required
                rows={4}
                minChars={MIN_CHARS}
              />

              {/* Tools & Methods */}
              <CharacterCountTextarea
                id="tools-methods"
                label={t('candidate.level2.tools_label')}
                value={level2Payload.tools_methods}
                onChange={(v) => updateLevel2Payload('tools_methods', v)}
                placeholder={t('candidate.level2.tools_placeholder')}
                disabled={isReadOnly}
                required
                rows={4}
                minChars={MIN_CHARS}
              />

              {/* Risks & Failure Points */}
              <CharacterCountTextarea
                id="risks-failures"
                label={t('candidate.level2.risks_label')}
                value={level2Payload.risks_failures}
                onChange={(v) => updateLevel2Payload('risks_failures', v)}
                placeholder={t('candidate.level2.risks_placeholder')}
                disabled={isReadOnly}
                required
                rows={4}
                minChars={MIN_CHARS}
              />

              {/* Questions for Company (optional) */}
              <CharacterCountTextarea
                id="questions"
                label={t('candidate.level2.questions_label')}
                value={level2Payload.questions_for_company}
                onChange={(v) => updateLevel2Payload('questions_for_company', v)}
                placeholder={t('candidate.level2.questions_placeholder')}
                disabled={isReadOnly}
                rows={3}
                minChars={50}
                recommendedMin={100}
                recommendedMax={300}
              />
            </CardContent>
          </Card>
          </>
        )}

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
