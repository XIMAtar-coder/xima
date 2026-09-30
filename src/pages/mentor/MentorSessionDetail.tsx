import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { useMentorCalendar, MentorSession, SessionAuditLog } from '@/hooks/useMentorCalendar';
import MentorLayout from '@/components/mentor/MentorLayout';
import { PageHeader, Panel } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, Clock, Check, X, Ban, RefreshCw, FileText, History, Video } from 'lucide-react';
import { ximatarDisplayName } from '@/lib/ximatarName';
import NotAMentor from './NotAMentor';

/**
 * One session, seen by the mentor: who, when, what to do next, the notes
 * and the trail of what happened. Lives in the mentor shell like the
 * calendar it comes from.
 */
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'secondary',
  confirmed: 'default',
  rejected: 'destructive',
  cancelled: 'destructive',
  completed: 'outline',
  rescheduled: 'secondary',
};

export default function MentorSessionDetail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isMentor, mentorProfile, loading: profileLoading } = useMentorProfile();
  const {
    sessions,
    loading: calendarLoading,
    confirmSession,
    rejectSession,
    cancelSession,
    completeSession,
    rescheduleSession,
    updateSessionNotes,
    fetchAuditLogs,
  } = useMentorCalendar(mentorProfile?.id || null);

  const [session, setSession] = useState<MentorSession | null>(null);
  const [auditLogs, setAuditLogs] = useState<SessionAuditLog[]>([]);
  const [notesPrivate, setNotesPrivate] = useState('');
  const [notesShared, setNotesShared] = useState('');
  const [saving, setSaving] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  useEffect(() => {
    if (sessions.length > 0 && sessionId) {
      const found = sessions.find((s) => s.id === sessionId);
      if (found) {
        setSession(found);
        setNotesPrivate(found.notes_private || '');
        setNotesShared(found.notes_shared || '');
      }
    }
  }, [sessions, sessionId]);

  useEffect(() => {
    if (sessionId) fetchAuditLogs(sessionId).then(setAuditLogs);
  }, [sessionId, fetchAuditLogs]);

  const pageName = t('mentor.session_detail_page', 'Session');
  const longDate = (iso: string) =>
    parseISO(iso).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDateTime = (iso: string) =>
    parseISO(iso).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (profileLoading || (calendarLoading && !session)) {
    return (
      <MentorLayout page={pageName}>
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </MentorLayout>
    );
  }

  if (!isMentor || !mentorProfile) return <NotAMentor />;

  if (!session) {
    return (
      <MentorLayout page={pageName}>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('mentor.session_not_found', 'Session not found')}</p>
          <Button onClick={() => navigate('/mentor/calendar')} className="mt-4">
            {t('mentor.back_to_calendar', 'Back to the calendar')}
          </Button>
        </div>
      </MentorLayout>
    );
  }

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateSessionNotes(session.id, notesPrivate, notesShared);
    setSaving(false);
  };

  const handleReschedule = async () => {
    if (!newDate || !newStartTime || !newEndTime) return;
    await rescheduleSession(
      session.id,
      new Date(`${newDate}T${newStartTime}:00`).toISOString(),
      new Date(`${newDate}T${newEndTime}:00`).toISOString(),
    );
    setRescheduleOpen(false);
  };

  const candidate = session.candidate_name || t('mentor.candidate_unnamed', 'Candidate');
  const ximatar = session.candidate_ximatar ? ximatarDisplayName(t, session.candidate_ximatar) : null;
  const now = Date.now();
  const joinable = session.status === 'confirmed'
    && now >= parseISO(session.starts_at).getTime() - 10 * 60 * 1000
    && now <= parseISO(session.ends_at).getTime();

  return (
    <MentorLayout page={pageName}>
      <Button variant="ghost" onClick={() => navigate('/mentor/calendar')} className="-ml-3 mb-2 gap-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('mentor.back_to_calendar', 'Back to the calendar')}
      </Button>

      <PageHeader
        eyebrow={ximatar ? `${pageName} · ${ximatar}` : pageName}
        title={candidate}
        subtitle={`${longDate(session.starts_at)} · ${format(parseISO(session.starts_at), 'HH:mm')}–${format(parseISO(session.ends_at), 'HH:mm')}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[session.status] || 'secondary'}>
          {t(`mentor.session_status_${session.status}`, session.status)}
        </Badge>
        {session.session_type === 'free_intro' && (
          <Badge variant="outline">{t('mentor.free_intro_badge', 'Free call')}</Badge>
        )}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />{longDate(session.starts_at)}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {format(parseISO(session.starts_at), 'HH:mm')}–{format(parseISO(session.ends_at), 'HH:mm')}
        </span>
      </div>

      {/* What the mentor can do now */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {session.status === 'requested' && (
          <>
            <Button onClick={() => confirmSession(session.id)} className="gap-2">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('mentor.confirm_session', 'Confirm')}
            </Button>
            <Button variant="outline" onClick={() => rejectSession(session.id)} className="gap-2">
              <X className="h-4 w-4" aria-hidden="true" />
              {t('mentor.decline_session', 'Decline')}
            </Button>
          </>
        )}
        {session.status === 'confirmed' && (
          <>
            {joinable && (
              <Button onClick={() => navigate(`/sessions/${session.id}/room`)} className="gap-2">
                <Video className="h-4 w-4" aria-hidden="true" />
                {t('sessions.join_session', 'Join')}
              </Button>
            )}
            <Button variant={joinable ? 'outline' : 'default'} onClick={() => completeSession(session.id)} className="gap-2">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('mentor.mark_complete', 'Mark as held')}
            </Button>
            <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('mentor.reschedule', 'Move')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('mentor.reschedule_title', 'Propose a new time')}</DialogTitle>
                  <DialogDescription>{t('mentor.reschedule_help', 'The candidate receives the proposal and can accept or decline it.')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-date">{t('mentor.new_date', 'New date')}</Label>
                    <Input id="reschedule-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-start">{t('mentor.start_time', 'Start')}</Label>
                      <Input id="reschedule-start" type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reschedule-end">{t('mentor.end_time', 'End')}</Label>
                      <Input id="reschedule-end" type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('mentor.cancel', 'Cancel')}</Button>
                  </DialogClose>
                  <Button onClick={handleReschedule} disabled={!newDate || !newStartTime || !newEndTime}>
                    {t('mentor.reschedule', 'Move')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" onClick={() => cancelSession(session.id)} className="gap-2 text-muted-foreground">
              <Ban className="h-4 w-4" aria-hidden="true" />
              {t('mentor.cancel_session', 'Cancel session')}
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5" aria-hidden="true" />
            {t('mentor.session_notes', 'Session notes')}
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes-private">{t('mentor.private_notes', 'Private notes (only you see them)')}</Label>
              <Textarea id="notes-private" value={notesPrivate} onChange={(e) => setNotesPrivate(e.target.value)} placeholder={t('mentor.private_notes_placeholder', 'Your notes about this session…')} rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-shared">{t('mentor.shared_notes', 'Shared notes (the candidate sees them)')}</Label>
              <Textarea id="notes-shared" value={notesShared} onChange={(e) => setNotesShared(e.target.value)} placeholder={t('mentor.shared_notes_placeholder', 'What you want to leave the candidate…')} rows={4} />
            </div>
            <Button onClick={handleSaveNotes} disabled={saving}>
              {saving ? t('mentor.saving', 'Saving…') : t('mentor.save_notes', 'Save notes')}
            </Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5" aria-hidden="true" />
            {t('mentor.activity_log', 'Activity')}
          </h2>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mentor.no_activity', 'No activity yet')}</p>
          ) : (
            <ol className="space-y-3">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t(`mentor.action_${log.action}`, log.action)}</div>
                    <div className="text-xs text-muted-foreground">
                      {shortDateTime(log.created_at)} · {t(`mentor.actor_${log.actor_role}`, log.actor_role)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </MentorLayout>
  );
}
