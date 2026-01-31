import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Clock,
  CheckCircle2,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore, addMinutes, subMinutes } from 'date-fns';

// Video provider configuration - always use public Jitsi for MVP
const JITSI_DOMAIN = 'meet.jit.si';

// Restricted domains that require auth/moderator login - we skip these
const RESTRICTED_DOMAINS = ['8x8.vc', 'vpaas', 'jaas'];

// Declare JitsiMeetExternalAPI type for TypeScript
declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiAPI;
  }
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  userInfo?: { displayName: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

interface JitsiAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface SessionData {
  id: string;
  mentor_id: string;
  candidate_profile_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  video_provider: string | null;
  video_room_name: string | null;
  video_room_url: string | null;
}

export default function SessionRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notInWindow, setNotInWindow] = useState(false);
  const [timeMessage, setTimeMessage] = useState<string>('');
  const [readyToJoin, setReadyToJoin] = useState(false);
  const [displayName, setDisplayName] = useState<string>('Participant');
  const [usingFallbackProvider, setUsingFallbackProvider] = useState(false);
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<JitsiAPI | null>(null);

  useEffect(() => {
    if (sessionId) {
      checkAccessAndLoadSession();
    }
    
    // Cleanup Jitsi API on unmount
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [sessionId]);

  // Initialize Jitsi when ready
  useEffect(() => {
    if (readyToJoin && jitsiContainerRef.current && !jitsiApiRef.current) {
      initializeJitsi();
    }
  }, [readyToJoin]);

  const isRestrictedDomain = (url: string | null): boolean => {
    if (!url) return false;
    return RESTRICTED_DOMAINS.some(domain => url.toLowerCase().includes(domain));
  };

  const initializeJitsi = async () => {
    if (!jitsiContainerRef.current || !sessionId) return;

    // Load Jitsi IFrame API script if not already loaded
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => createJitsiMeeting();
      script.onerror = () => {
        console.error('[SessionRoom] Failed to load Jitsi API');
        toast({
          title: t('sessions.video_error', 'Video Error'),
          description: t('sessions.failed_to_load_video', 'Failed to load video service. Please refresh.'),
          variant: 'destructive',
        });
      };
      document.body.appendChild(script);
    } else {
      createJitsiMeeting();
    }
  };

  const createJitsiMeeting = () => {
    if (!jitsiContainerRef.current || !sessionId) return;
    if (jitsiApiRef.current) return; // Already created

    const roomName = `xima-session-${sessionId}`;

    try {
      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: jitsiContainerRef.current,
        userInfo: { 
          displayName: displayName 
        },
        configOverwrite: {
          // Disable pre-join page to go straight into the meeting
          prejoinPageEnabled: false,
          // Disable welcome page
          enableWelcomePage: false,
          // Disable deep linking prompts
          disableDeepLinking: true,
          // CRITICAL: Disable lobby/waiting room
          lobby: { enabled: false },
          'lobby.enabled': false,
          // CRITICAL: Disable user roles based on token - no external auth needed
          enableUserRolesBasedOnToken: false,
          // Don't require display name popup
          requireDisplayName: false,
          // Audio/video defaults
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // Disable invite functions (cleaner UI)
          disableInviteFunctions: true,
          // Hide moderator indicator since everyone is a moderator
          disableModeratorIndicator: true,
          // Hide some UI elements for cleaner experience
          hideConferenceSubject: false,
          hideConferenceTimer: false,
          // Disable recording/livestream prompts
          liveStreamingEnabled: false,
          fileRecordingsEnabled: false,
          // Disable third party requests
          disableThirdPartyRequests: true,
          // Disable self-view to reduce UI clutter (optional)
          doNotStoreRoom: true,
        },
        interfaceConfigOverwrite: {
          // Minimal toolbar
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 
            'fullscreen', 'hangup', 'chat', 'settings',
            'videoquality', 'tileview'
          ],
          // Hide watermarks
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          // Disable join/leave notifications
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          // Disable feedback
          DISABLE_FOCUS_INDICATOR: true,
          DISABLE_PRESENCE_STATUS: true,
          // Default view
          DEFAULT_BACKGROUND: '#1a1a2e',
          TILE_VIEW_MAX_COLUMNS: 2,
        },
      });

      jitsiApiRef.current = api;

      // CRITICAL: Grant moderator rights to every participant when they join
      // This ensures BOTH mentor and candidate can start/control the meeting
      api.addListener('videoConferenceJoined', (data: { id: string }) => {
        console.log('[SessionRoom] User joined conference, granting moderator:', data);
        // Grant moderator to the current participant
        api.executeCommand('grantModerator', data.id);
      });

      // Also grant moderator when any participant joins (for the other user)
      api.addListener('participantJoined', (data: { id: string; displayName: string }) => {
        console.log('[SessionRoom] Participant joined, granting moderator:', data);
        // Grant moderator to newly joined participant
        api.executeCommand('grantModerator', data.id);
      });

      // Handle conference exit
      api.addListener('videoConferenceLeft', () => {
        navigate(`/sessions/${sessionId}`);
      });

      api.addListener('readyToClose', () => {
        navigate(`/sessions/${sessionId}`);
      });

    } catch (error) {
      console.error('[SessionRoom] Failed to create Jitsi meeting:', error);
      toast({
        title: t('sessions.video_error', 'Video Error'),
        description: t('sessions.failed_to_create_video', 'Failed to create video meeting. Please refresh.'),
        variant: 'destructive',
      });
    }
  };

  const checkAccessAndLoadSession = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get user's profile ID and mentor ID (if any)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      const { data: mentorRecord } = await supabase
        .from('mentors')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('mentor_sessions')
        .select('id, mentor_id, candidate_profile_id, starts_at, ends_at, status, video_provider, video_room_name, video_room_url')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('[SessionRoom] Session not found:', sessionError);
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      // Check if user is a participant
      const isCandidate = profile?.id === sessionData.candidate_profile_id;
      const isMentor = mentorRecord?.id === sessionData.mentor_id;

      if (!isCandidate && !isMentor) {
        console.warn('[SessionRoom] User is not a participant');
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      // Set display name for Jitsi
      if (isMentor && mentorRecord?.name) {
        setDisplayName(mentorRecord.name);
      } else if (isCandidate && profile?.full_name) {
        setDisplayName(profile.full_name);
      }

      // Check if session is confirmed
      if (sessionData.status !== 'confirmed') {
        toast({
          title: t('sessions.not_confirmed', 'Session Not Confirmed'),
          description: t('sessions.must_be_confirmed', 'The session must be confirmed before joining.'),
          variant: 'destructive',
        });
        navigate(`/sessions/${sessionId}`);
        return;
      }

      // Check time window (10 min before start to 60 min after start)
      const now = new Date();
      const startsAt = parseISO(sessionData.starts_at);
      const windowStart = subMinutes(startsAt, 10);
      const windowEnd = addMinutes(startsAt, 60);

      if (isBefore(now, windowStart)) {
        setNotInWindow(true);
        setTimeMessage(t('sessions.too_early', 'Room opens 10 minutes before the session starts.'));
        setSession(sessionData as SessionData);
        setLoading(false);
        return;
      }

      if (isAfter(now, windowEnd)) {
        setNotInWindow(true);
        setTimeMessage(t('sessions.session_ended', 'This session has ended.'));
        setSession(sessionData as SessionData);
        setLoading(false);
        return;
      }

      // Check if stored URL is from a restricted domain
      if (isRestrictedDomain(sessionData.video_room_url)) {
        setUsingFallbackProvider(true);
      }

      // Session is accessible - ensure video room exists in DB
      const roomName = `xima-session-${sessionId}`;
      
      if (!sessionData.video_room_name) {
        // Store room info in DB
        await supabase
          .from('mentor_sessions')
          .update({
            video_provider: 'jitsi',
            video_room_name: roomName,
            video_room_url: `https://${JITSI_DOMAIN}/${roomName}`,
            video_room_created_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        // Log the room creation
        await supabase.from('mentor_session_audit_logs').insert({
          session_id: sessionId,
          actor_user_id: user.id,
          actor_role: isMentor ? 'mentor' : 'candidate',
          action: 'video_room_created',
          meta: { provider: 'jitsi', room_name: roomName, domain: JITSI_DOMAIN },
        });
      }

      // Log the room join
      await supabase.from('mentor_session_audit_logs').insert({
        session_id: sessionId,
        actor_user_id: user.id,
        actor_role: isMentor ? 'mentor' : 'candidate',
        action: 'video_room_joined',
        meta: { domain: JITSI_DOMAIN },
      });

      setSession(sessionData as SessionData);
      setReadyToJoin(true);
    } catch (error) {
      console.error('[SessionRoom] Error:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('sessions.access_denied', 'Access Denied')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('sessions.not_participant', 'You are not a participant in this session.')}
            </p>
            <Button onClick={() => navigate('/profile')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back_to_profile', 'Back to Profile')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notInWindow && session) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('sessions.room_not_available', 'Room Not Available')}</h2>
            <p className="text-muted-foreground mb-4">{timeMessage}</p>
            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">{t('sessions.scheduled_for', 'Session scheduled for:')}</p>
              <p className="font-medium">{format(parseISO(session.starts_at), 'PPp')}</p>
            </div>
            <Button onClick={() => navigate(`/sessions/${sessionId}`)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('sessions.view_details', 'View Session Details')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the video room
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal Header */}
      <div className="flex-shrink-0 h-14 border-b bg-card flex items-center justify-between px-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            if (jitsiApiRef.current) {
              jitsiApiRef.current.dispose();
              jitsiApiRef.current = null;
            }
            navigate(`/sessions/${sessionId}`);
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('sessions.exit_room', 'Exit Room')}
        </Button>
        <div className="flex items-center gap-3">
          {usingFallbackProvider && (
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <Info className="h-3 w-3" />
              {t('sessions.using_default_provider', 'Using XIMA default room provider')}
            </span>
          )}
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('sessions.live', 'Live')}
          </Badge>
        </div>
      </div>

      {/* Jitsi Container - API will inject the iframe here */}
      <div 
        ref={jitsiContainerRef}
        className="flex-1 relative bg-black"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
