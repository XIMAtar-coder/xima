import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  Video, 
  Camera, 
  Mic, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Loader2,
  Building2,
  Briefcase,
  Play,
  Square,
  Upload,
  Eye,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

// Prompts for Standing session - communication, clarity, ownership, reflection
const STANDING_PROMPTS = {
  en: [
    "Tell us about a challenge you faced and how you approached solving it.",
    "Describe a situation where you had to communicate a complex idea to others.",
    "What drives you in your work? Share an example that illustrates this.",
    "How do you handle uncertainty or changing priorities?",
    "Tell us about a time you had to take ownership of a difficult situation.",
    "What does professional growth mean to you?",
  ],
  it: [
    "Raccontaci una sfida che hai affrontato e come l'hai risolta.",
    "Descrivi una situazione in cui hai dovuto comunicare un'idea complessa.",
    "Cosa ti motiva nel tuo lavoro? Condividi un esempio.",
    "Come gestisci l'incertezza o le priorità che cambiano?",
    "Racconta di quando hai dovuto prendere in mano una situazione difficile.",
    "Cosa significa per te la crescita professionale?",
  ],
  es: [
    "Cuéntanos sobre un desafío que enfrentaste y cómo lo resolviste.",
    "Describe una situación donde tuviste que comunicar una idea compleja.",
    "¿Qué te motiva en tu trabajo? Comparte un ejemplo.",
    "¿Cómo manejas la incertidumbre o las prioridades cambiantes?",
    "Cuéntanos de una vez que tuviste que asumir una situación difícil.",
    "¿Qué significa el crecimiento profesional para ti?",
  ],
};

interface ChallengeContext {
  invitationId: string;
  challengeId: string;
  businessId: string;
  hiringGoalId: string;
  candidateProfileId: string;
  companyName: string;
  roleTitle: string | null;
  durationMinutes: number;
  promptCount: number;
  locale: string;
}

type SessionState = 'briefing' | 'permissions' | 'countdown' | 'recording' | 'uploading' | 'submitted';

export default function StandingVideoSession() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<ChallengeContext | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('briefing');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  // Permissions
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);

  // Recording
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [focusLostCount, setFocusLostCount] = useState(0);
  const [canFinish, setCanFinish] = useState(false);

  // Media refs - single persistent video element
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stream state
  const [streamReady, setStreamReady] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Upload
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load challenge data
  useEffect(() => {
    async function loadData() {
      if (!invitationId) return;

      try {
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

        const { data: invitation, error } = await supabase
          .from('challenge_invitations')
          .select(`
            id,
            business_id,
            hiring_goal_id,
            challenge_id,
            candidate_profile_id,
            business_challenges!challenge_invitations_challenge_id_fkey (
              id,
              title,
              rubric
            ),
            hiring_goal_drafts!challenge_invitations_hiring_goal_id_fkey (
              role_title
            )
          `)
          .eq('id', invitationId)
          .eq('candidate_profile_id', profile.id)
          .single();

        if (error || !invitation) {
          toast({ title: t('common.error'), description: 'Invitation not found', variant: 'destructive' });
          navigate('/profile');
          return;
        }

        const challengeData = invitation.business_challenges as any;
        const goalData = invitation.hiring_goal_drafts as any;
        const rubric = challengeData?.rubric || {};

        // Get company name
        const { data: businessProfile } = await supabase
          .from('business_profiles')
          .select('company_name')
          .eq('user_id', invitation.business_id)
          .single();

        const durationMinutes = rubric.duration_minutes || 5;
        const promptCount = rubric.prompt_count || 4;
        const challengeLocale = rubric.locale || i18n.language?.split('-')[0] || 'en';

        // Select prompts based on locale
        const allPrompts = STANDING_PROMPTS[challengeLocale as keyof typeof STANDING_PROMPTS] || STANDING_PROMPTS.en;
        const selectedPrompts = allPrompts.slice(0, promptCount);
        setPrompts(selectedPrompts);

        setContext({
          invitationId: invitation.id,
          challengeId: invitation.challenge_id || '',
          businessId: invitation.business_id,
          hiringGoalId: invitation.hiring_goal_id,
          candidateProfileId: invitation.candidate_profile_id,
          companyName: businessProfile?.company_name || 'Company',
          roleTitle: goalData?.role_title || null,
          durationMinutes,
          promptCount,
          locale: challengeLocale,
        });

        // Check existing submission
        const { data: submission } = await supabase
          .from('challenge_submissions')
          .select('id, status, submitted_at')
          .eq('invitation_id', invitationId)
          .single();

        if (submission) {
          setSubmissionId(submission.id);
          if (submission.status === 'submitted') {
            setIsSubmitted(true);
            setSubmittedAt(submission.submitted_at);
            setSessionState('submitted');
          }
        }
      } catch (err) {
        console.error('Error loading standing challenge:', err);
        toast({ title: t('common.error'), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId, navigate, t, i18n.language]);

  // Handle tab visibility
  useEffect(() => {
    if (sessionState !== 'recording') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusLostCount(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Attach stream to video element - always re-attach when ref becomes available
  const attachStreamToPreview = useCallback(async () => {
    const stream = mediaStreamRef.current;
    const videoEl = videoPreviewRef.current;
    
    if (!stream || !videoEl) {
      return false;
    }

    // Always set srcObject even if already set (to handle ref re-mount)
    try {
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      
      try {
        await videoEl.play();
        console.log('Video preview playing successfully');
        setStreamReady(true);
        setPreviewError(null);
        return true;
      } catch (playError) {
        console.warn('Autoplay blocked, waiting for user interaction:', playError);
        setPreviewError('tap_to_enable');
        return false;
      }
    } catch (err) {
      console.error('Error attaching stream to preview:', err);
      setPreviewError('stream_error');
      return false;
    }
  }, []);

  // Re-attach stream whenever video ref might change (state transitions)
  useEffect(() => {
    if (mediaStreamRef.current && (sessionState === 'permissions' || sessionState === 'countdown' || sessionState === 'recording')) {
      // Use timeout to ensure DOM has updated
      const timer = setTimeout(() => {
        attachStreamToPreview();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [sessionState, attachStreamToPreview]);

  const requestPermissions = async () => {
    setSessionState('permissions');
    setPreviewError(null);
    setStreamReady(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true 
      });
      
      console.log('Got media stream:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      mediaStreamRef.current = stream;
      setCameraPermission(true);
      setMicPermission(true);

      // Attach to preview after a small delay to ensure ref is ready
      setTimeout(() => attachStreamToPreview(), 100);
    } catch (err) {
      console.error('Permission error:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setCameraPermission(false);
          setMicPermission(false);
        } else if (err.name === 'NotFoundError') {
          setPreviewError('no_camera');
        }
      }
    }
  };

  // Handle tap to enable preview (for browsers that block autoplay)
  const handleTapToPlay = async () => {
    if (videoPreviewRef.current && mediaStreamRef.current) {
      try {
        await videoPreviewRef.current.play();
        setStreamReady(true);
        setPreviewError(null);
      } catch (err) {
        console.error('Failed to play on tap:', err);
      }
    }
  };

  // Get supported mimeType for MediaRecorder
  const getSupportedMimeType = (): string => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using mimeType:', type);
        return type;
      }
    }
    
    console.warn('No supported mimeType found, using default');
    return '';
  };

  const startRecording = () => {
    // Verify stream is ready before starting
    if (!mediaStreamRef.current) {
      toast({
        title: t('common.error'),
        description: 'Camera not ready. Please wait for the preview to appear.',
        variant: 'destructive'
      });
      return;
    }

    setSessionState('countdown');
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beginRecording = () => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      console.error('No stream available for recording');
      toast({
        title: t('common.error'),
        description: 'Camera stream lost. Please refresh and try again.',
        variant: 'destructive'
      });
      setSessionState('permissions');
      return;
    }

    // Check if MediaRecorder is available
    if (typeof MediaRecorder === 'undefined') {
      toast({
        title: t('common.error'),
        description: 'Your browser does not support video recording. Please try Chrome or Firefox.',
        variant: 'destructive'
      });
      setSessionState('permissions');
      return;
    }

    setSessionState('recording');
    setRecordingTime(0);
    setCurrentPromptIndex(0);
    recordedChunksRef.current = [];

    try {
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('Recorded chunk:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorder.start(1000); // Collect data every second
      console.log('MediaRecorder started');

      // Start timer
      const startTime = Date.now();
      const durationMs = (context?.durationMinutes || 5) * 60 * 1000;
      const promptIntervalMs = durationMs / prompts.length;

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingTime(Math.floor(elapsed / 1000));

        // Check if can finish (60s minimum)
        if (elapsed >= 60000) {
          setCanFinish(true);
        }

        // Advance prompts
        const newPromptIndex = Math.min(
          Math.floor(elapsed / promptIntervalMs),
          prompts.length - 1
        );
        setCurrentPromptIndex(newPromptIndex);

        // Auto-stop at duration end
        if (elapsed >= durationMs) {
          finishRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      toast({
        title: t('common.error'),
        description: 'Failed to start recording. Please try again.',
        variant: 'destructive'
      });
      setSessionState('permissions');
    }
  };

  const finishRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || sessionState !== 'recording') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    mediaRecorderRef.current.stop();
    
    // Wait for all data to be collected
    await new Promise(resolve => setTimeout(resolve, 500));

    setSessionState('uploading');
    await uploadVideo();
  }, [sessionState]);

  const uploadVideo = async () => {
    if (!context || recordedChunksRef.current.length === 0) return;

    try {
      setUploadProgress(10);

      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const fileName = `standing/${context.candidateProfileId}/${context.invitationId}.webm`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('challenge-videos')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      setUploadProgress(70);

      // Store the file path (not public URL) - signed URLs will be generated when viewing
      // Path format: standing/{candidateProfileId}/{invitationId}.webm
      const videoUrl = fileName;

      // Create/update submission
      const submissionPayload = {
        video_url: videoUrl,
        duration_seconds: recordingTime,
        prompt_count: prompts.length,
        prompts_shown: prompts,
        locale: context.locale,
        focus_lost_count: focusLostCount,
        started_at: new Date(Date.now() - recordingTime * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
      };

      setUploadProgress(85);

      if (submissionId) {
        await supabase
          .from('challenge_submissions')
          .update({
            submitted_payload: submissionPayload,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', submissionId);
      } else {
        const { data: newSubmission } = await supabase
          .from('challenge_submissions')
          .insert({
            invitation_id: context.invitationId,
            candidate_profile_id: context.candidateProfileId,
            business_id: context.businessId,
            hiring_goal_id: context.hiringGoalId,
            challenge_id: context.challengeId,
            submitted_payload: submissionPayload,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (newSubmission) {
          setSubmissionId(newSubmission.id);
        }
      }

      setUploadProgress(100);
      setIsSubmitted(true);
      setSubmittedAt(new Date().toISOString());
      setSessionState('submitted');

      // Cleanup stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      toast({ title: t('level3.standing.submitted_success') });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ 
        title: t('common.error'), 
        description: t('level3.standing.upload_failed'),
        variant: 'destructive' 
      });
      setSessionState('recording'); // Allow retry
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine if we should show the persistent video element
  const showVideoPreview = sessionState === 'permissions' || sessionState === 'countdown' || sessionState === 'recording';

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!context) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground">{t('level3.standing.not_found')}</p>
              <Button onClick={() => navigate('/profile')} className="mt-4">
                {t('common.back_to_profile')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // SUBMITTED STATE
  if (sessionState === 'submitted' && isSubmitted) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>{t('level3.standing.submitted_title')}</CardTitle>
              <CardDescription>{t('level3.standing.submitted_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{context.companyName}</span>
                </div>
                {context.roleTitle && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{context.roleTitle}</span>
                  </div>
                )}
                {submittedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(submittedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <Button onClick={() => navigate('/profile')} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back_to_profile')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // BRIEFING STATE
  if (sessionState === 'briefing') {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('level3.standing.briefing_title')}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {context.companyName}
                    {context.roleTitle && (
                      <>
                        <span className="text-border">•</span>
                        {context.roleTitle}
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* What happens */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">{t('level3.standing.what_happens')}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Video className="h-4 w-4 mt-0.5 text-primary" />
                    {t('level3.standing.briefing_1')}
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-primary" />
                    {t('level3.standing.briefing_2', { count: context.promptCount })}
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-4 w-4 mt-0.5 text-primary" />
                    {t('level3.standing.briefing_3', { minutes: context.durationMinutes })}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-primary" />
                    {t('level3.standing.briefing_4')}
                  </li>
                </ul>
              </div>

              {/* Rules */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  {t('level3.standing.rules_title')}
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• {t('level3.standing.rule_1')}</li>
                  <li>• {t('level3.standing.rule_2')}</li>
                  <li>• {t('level3.standing.rule_3')}</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate('/profile')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.back')}
                </Button>
                <Button onClick={requestPermissions} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  {t('level3.standing.start_session')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // UPLOADING STATE
  if (sessionState === 'uploading') {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-8 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-primary animate-pulse" />
              <div>
                <p className="font-medium">{t('level3.standing.uploading')}</p>
                <p className="text-sm text-muted-foreground">{t('level3.standing.please_wait')}</p>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // PERMISSIONS / COUNTDOWN / RECORDING STATES - Use single layout with persistent video
  const totalDuration = (context?.durationMinutes || 5) * 60;
  const progressPercent = (recordingTime / totalDuration) * 100;

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header - only show during recording */}
        {sessionState === 'recording' && (
          <div className="border-b bg-card/50 backdrop-blur">
            <div className="container max-w-4xl mx-auto p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="destructive" className="animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  {t('level3.standing.recording')}
                </Badge>
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
              <Button 
                onClick={finishRecording} 
                disabled={!canFinish}
                variant={canFinish ? 'default' : 'outline'}
              >
                <Square className="h-4 w-4 mr-2" />
                {t('level3.standing.finish_submit')}
              </Button>
            </div>
            <Progress value={progressPercent} className="h-1" />
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 container max-w-4xl mx-auto p-4 flex flex-col">
          {/* Permissions header */}
          {sessionState === 'permissions' && (
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{t('level3.standing.permissions_title')}</h2>
              <p className="text-muted-foreground">{t('level3.standing.permissions_desc')}</p>
            </div>
          )}

          {/* PERSISTENT VIDEO PREVIEW - Always rendered for permissions/countdown/recording */}
          <div className={`relative bg-muted rounded-lg overflow-hidden ${sessionState === 'recording' ? 'flex-1 min-h-[300px]' : 'aspect-video max-w-lg mx-auto w-full'}`}>
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Countdown overlay */}
            {sessionState === 'countdown' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70">
                <div className="text-9xl font-bold text-primary animate-pulse">{countdown}</div>
                <p className="text-muted-foreground mt-4">{t('level3.standing.get_ready')}</p>
              </div>
            )}

            {/* Loading overlay - only when waiting for permissions */}
            {sessionState === 'permissions' && cameraPermission === null && !previewError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Tap to enable overlay */}
            {previewError === 'tap_to_enable' && (
              <button 
                onClick={handleTapToPlay}
                className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 cursor-pointer hover:bg-background/70 transition-colors"
              >
                <Camera className="h-12 w-12 text-primary mb-2" />
                <span className="text-sm font-medium">{t('level3.standing.tap_to_enable')}</span>
              </button>
            )}

            {/* Camera live indicator */}
            {streamReady && cameraPermission && sessionState !== 'countdown' && (
              <div className="absolute top-3 left-3">
                <Badge variant="secondary" className="bg-green-500/90 text-white border-0">
                  <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  {t('level3.standing.camera_live')}
                </Badge>
              </div>
            )}

            {/* Recording indicator */}
            {sessionState === 'recording' && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-green-500/90 text-white border-0">
                  <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  {t('level3.standing.camera_live')}
                </Badge>
              </div>
            )}

            {/* Focus lost warning */}
            {sessionState === 'recording' && focusLostCount > 0 && (
              <div className="absolute top-4 left-4">
                <Badge variant="outline" className="bg-amber-500/90 text-white border-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t('level3.standing.focus_warning')}
                </Badge>
              </div>
            )}
          </div>

          {/* Permission status + start button */}
          {sessionState === 'permissions' && (
            <div className="mt-4 space-y-4 max-w-lg mx-auto w-full">
              {/* Permission status */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className={`h-4 w-4 ${cameraPermission ? 'text-green-500' : cameraPermission === false ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <span>{cameraPermission ? t('level3.standing.camera_ok') : cameraPermission === false ? t('level3.standing.camera_denied') : t('level3.standing.checking')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mic className={`h-4 w-4 ${micPermission ? 'text-green-500' : micPermission === false ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <span>{micPermission ? t('level3.standing.mic_ok') : micPermission === false ? t('level3.standing.mic_denied') : t('level3.standing.checking')}</span>
                </div>
              </div>

              {cameraPermission === false && (
                <div className="text-center text-sm text-destructive">
                  {t('level3.standing.permissions_required')}
                </div>
              )}

              {previewError === 'no_camera' && (
                <div className="text-center text-sm text-destructive">
                  {t('level3.standing.no_camera')}
                </div>
              )}

              {cameraPermission && micPermission && (
                <Button onClick={startRecording} className="w-full" disabled={!streamReady}>
                  {!streamReady && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Play className="h-4 w-4 mr-2" />
                  {t('level3.standing.begin_recording')}
                </Button>
              )}
            </div>
          )}

          {/* Current prompt - only during recording */}
          {sessionState === 'recording' && (
            <Card className="mt-4 bg-primary/5 border-primary/30">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">{currentPromptIndex + 1}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t('level3.standing.prompt_label', { current: currentPromptIndex + 1, total: prompts.length })}
                    </p>
                    <p className="font-medium">{prompts[currentPromptIndex]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
