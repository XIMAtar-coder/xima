import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Video,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore, addMinutes, subMinutes } from 'date-fns';

// Video provider configuration
const VIDEO_PROVIDER = 'jitsi';
const VIDEO_BASE_URL = 'https://meet.jit.si';

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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      checkAccessAndLoadSession();
    }
  }, [sessionId]);

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
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: mentorRecord } = await supabase
        .from('mentors')
        .select('id')
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

      // Session is accessible - ensure video room exists
      let roomUrl = sessionData.video_room_url;
      const roomName = `xima-session-${sessionId}`;
      
      // Build Jitsi URL with config overrides to disable lobby/moderator gate
      // This allows both participants to start/join without waiting for a moderator
      const jitsiConfigParams = [
        'config.prejoinPageEnabled=false',
        'config.enableWelcomePage=false',
        'config.disableDeepLinking=true',
        'config.lobby.enabled=false',
        'config.requireDisplayName=false',
        'config.startWithAudioMuted=true',
        'config.startWithVideoMuted=false',
      ].join('&');
      
      const fullRoomUrl = `${VIDEO_BASE_URL}/${roomName}#${jitsiConfigParams}`;
      
      if (!roomUrl) {
        // Create room lazily - store base URL without config params
        roomUrl = `${VIDEO_BASE_URL}/${roomName}`;

        // Update the session with video room info
        await supabase
          .from('mentor_sessions')
          .update({
            video_provider: VIDEO_PROVIDER,
            video_room_name: roomName,
            video_room_url: roomUrl,
            video_room_created_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        // Log the room creation
        await supabase.from('mentor_session_audit_logs').insert({
          session_id: sessionId,
          actor_user_id: user.id,
          actor_role: isMentor ? 'mentor' : 'candidate',
          action: 'video_room_created',
          meta: { provider: VIDEO_PROVIDER, room_name: roomName },
        });
      }

      // Log the room join
      await supabase.from('mentor_session_audit_logs').insert({
        session_id: sessionId,
        actor_user_id: user.id,
        actor_role: isMentor ? 'mentor' : 'candidate',
        action: 'video_room_joined',
        meta: {},
      });

      setSession(sessionData as SessionData);
      // Use the full URL with config overrides for the iframe
      setVideoUrl(fullRoomUrl);
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
          onClick={() => navigate(`/sessions/${sessionId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('sessions.exit_room', 'Exit Room')}
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {t('sessions.refresh_hint', 'If the meeting loads forever, refresh once.')}
          </span>
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('sessions.live', 'Live')}
          </Badge>
        </div>
      </div>

      {/* Video Iframe */}
      <div className="flex-1 relative">
        {videoUrl && (
          <iframe
            src={videoUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="absolute inset-0 w-full h-full border-0"
            title={t('sessions.video_call', 'Video Call')}
          />
        )}
      </div>
    </div>
  );
}