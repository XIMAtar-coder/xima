import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parseISO } from 'date-fns';
import { log } from '@/lib/log';

/**
 * The video room of a mentor session, for both sides.
 *
 * The room lives on Daily and stays inside this page: the edge function
 * checks who is asking, creates the private room of the session if nobody
 * has yet, and hands back a token for this person only (the mentor's makes
 * them the owner). No one signs in anywhere else, no one leaves XIMA.
 */
type Problem = 'denied' | 'too_early' | 'ended' | 'not_confirmed' | 'not_configured' | 'provider';

const PROBLEM_FOR: Record<string, Problem> = {
  NOT_A_PARTICIPANT: 'denied',
  SESSION_NOT_FOUND: 'denied',
  UNAUTHENTICATED: 'denied',
  TOO_EARLY: 'too_early',
  ENDED: 'ended',
  NOT_CONFIRMED: 'not_confirmed',
  VIDEO_NOT_CONFIGURED: 'not_configured',
};

export default function SessionRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [room, setRoom] = useState<{ url: string; token: string } | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  // The mentor comes from the calendar and goes back there; the candidate to the session page.
  const [viewerIsMentor, setViewerIsMentor] = useState(false);
  const detailPath = viewerIsMentor ? `/mentor/calendar/${sessionId}` : `/sessions/${sessionId}`;

  const open = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setProblem(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      // Who is looking, for the way back, and when the session is, for the
      // waiting screens. RLS already limits this row to its two participants.
      const [{ data: mentorRecord }, { data: sessionRow }] = await Promise.all([
        supabase.from('mentors').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('mentor_sessions').select('mentor_id, starts_at').eq('id', sessionId).maybeSingle(),
      ]);
      setViewerIsMentor(!!mentorRecord && mentorRecord.id === sessionRow?.mentor_id);
      setStartsAt(sessionRow?.starts_at ?? null);

      const { data, error } = await supabase.functions.invoke('session-room-token', { body: { session_id: sessionId } });
      if (error || !data) {
        log.error('[SessionRoom] token request failed', error);
        setProblem('provider');
        return;
      }
      if (!data.success) {
        setProblem(PROBLEM_FOR[data.error as string] ?? 'provider');
        return;
      }
      setRoom({ url: data.url, token: data.token });
    } catch (err) {
      log.error('[SessionRoom] error', err);
      setProblem('provider');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => { open(); }, [open]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label={t('common.loading', 'Loading')} />
      </div>
    );
  }

  if (problem || !room) {
    const waiting = problem === 'too_early' || problem === 'ended';
    const title = {
      denied: t('sessions.access_denied', 'Access denied'),
      too_early: t('sessions.room_not_available', 'The room is not open yet'),
      ended: t('sessions.room_not_available', 'The room is not open yet'),
      not_confirmed: t('sessions.not_confirmed', 'Session not confirmed'),
      not_configured: t('sessions.video_error', 'Video not available'),
      provider: t('sessions.video_error', 'Video not available'),
    }[problem ?? 'provider'];
    const body = {
      denied: t('sessions.not_participant', 'You are not a participant in this session.'),
      too_early: t('sessions.too_early', 'The room opens 10 minutes before the session starts.'),
      ended: t('sessions.session_ended', 'This session has ended.'),
      not_confirmed: t('sessions.must_be_confirmed', 'The session must be confirmed before joining.'),
      not_configured: t('sessions.video_not_configured', 'The video room is not set up yet. Write to us and we will sort it out.'),
      provider: t('sessions.failed_to_load_video', 'The video service did not answer. Try again in a moment.'),
    }[problem ?? 'provider'];

    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="py-12 text-center">
            {waiting
              ? <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
              : <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden="true" />}
            <h1 className="mb-2 text-xl font-semibold">{title}</h1>
            <p className="mb-4 text-muted-foreground">{body}</p>
            {waiting && startsAt && (
              <div className="mb-6 rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">{t('sessions.scheduled_for', 'Session scheduled for:')}</p>
                <p className="font-medium">
                  {parseISO(startsAt).toLocaleString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {(problem === 'provider' || problem === 'too_early') && (
                <Button onClick={open}>{t('common.retry', 'Try again')}</Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(problem === 'denied' ? (viewerIsMentor ? '/mentor/calendar' : '/profile') : detailPath)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('sessions.view_details', 'Back to the session')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b bg-card px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(detailPath)} className="gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('sessions.exit_room', 'Exit room')}
        </Button>
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {t('sessions.live', 'Live')}
        </Badge>
      </div>
      <iframe
        title={t('sessions.video_room', 'Video room')}
        src={`${room.url}?t=${encodeURIComponent(room.token)}`}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        className="min-h-0 w-full flex-1 border-0 bg-black"
      />
    </div>
  );
}
