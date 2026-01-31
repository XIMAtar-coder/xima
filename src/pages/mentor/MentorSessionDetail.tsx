import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { useMentorCalendar, MentorSession, SessionAuditLog } from '@/hooks/useMentorCalendar';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Calendar, Clock, User, Check, X, Ban, 
  RefreshCw, MessageSquare, FileText, History
} from 'lucide-react';
import NotAMentor from './NotAMentor';

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  requested: { variant: 'secondary', label: 'Pending Approval' },
  confirmed: { variant: 'default', label: 'Confirmed' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  completed: { variant: 'outline', label: 'Completed' },
  rescheduled: { variant: 'secondary', label: 'Rescheduled' },
};

const ACTION_LABELS: Record<string, string> = {
  create_request: 'Session requested',
  confirm: 'Session confirmed',
  reject: 'Session rejected',
  cancel: 'Session cancelled',
  reschedule: 'Session rescheduled',
  update_notes: 'Notes updated',
  complete: 'Session completed',
};

export default function MentorSessionDetail() {
  const { t } = useTranslation();
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

  const loading = profileLoading || calendarLoading;

  useEffect(() => {
    if (sessions.length > 0 && sessionId) {
      const found = sessions.find(s => s.id === sessionId);
      if (found) {
        setSession(found);
        setNotesPrivate(found.notes_private || '');
        setNotesShared(found.notes_shared || '');
      }
    }
  }, [sessions, sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchAuditLogs(sessionId).then(setAuditLogs);
    }
  }, [sessionId, fetchAuditLogs]);

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!isMentor || !mentorProfile) {
    return <NotAMentor />;
  }

  if (!session) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Button onClick={() => navigate('/mentor/calendar')} className="mt-4">
            Back to Calendar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const statusBadge = STATUS_BADGES[session.status] || STATUS_BADGES.requested;

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateSessionNotes(session.id, notesPrivate, notesShared);
    setSaving(false);
  };

  const handleReschedule = async () => {
    if (!newDate || !newStartTime || !newEndTime) return;
    
    const newStartsAt = new Date(`${newDate}T${newStartTime}:00`).toISOString();
    const newEndsAt = new Date(`${newDate}T${newEndTime}:00`).toISOString();
    
    await rescheduleSession(session.id, newStartsAt, newEndsAt);
    setRescheduleOpen(false);
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/mentor/calendar')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('mentor.back_to_calendar', 'Back to Calendar')}
          </Button>
        </div>

        {/* Session Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h1 className="text-2xl font-bold">{session.candidate_name}</h1>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(session.starts_at), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(parseISO(session.starts_at), 'HH:mm')} - {format(parseISO(session.ends_at), 'HH:mm')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {session.status === 'requested' && (
                  <>
                    <Button onClick={() => confirmSession(session.id)} className="gap-2">
                      <Check className="h-4 w-4" />
                      Confirm
                    </Button>
                    <Button variant="destructive" onClick={() => rejectSession(session.id)} className="gap-2">
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                {session.status === 'confirmed' && (
                  <>
                    <Button onClick={() => completeSession(session.id)} className="gap-2">
                      <Check className="h-4 w-4" />
                      Mark Complete
                    </Button>
                    <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Reschedule
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reschedule Session</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>New Date</Label>
                            <Input 
                              type="date" 
                              value={newDate} 
                              onChange={(e) => setNewDate(e.target.value)}
                              min={format(new Date(), 'yyyy-MM-dd')}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Time</Label>
                              <Input 
                                type="time" 
                                value={newStartTime} 
                                onChange={(e) => setNewStartTime(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End Time</Label>
                              <Input 
                                type="time" 
                                value={newEndTime} 
                                onChange={(e) => setNewEndTime(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleReschedule} disabled={!newDate || !newStartTime || !newEndTime}>
                            Reschedule
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" onClick={() => cancelSession(session.id)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('mentor.session_notes', 'Session Notes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Private Notes (only you can see)</Label>
                <Textarea
                  value={notesPrivate}
                  onChange={(e) => setNotesPrivate(e.target.value)}
                  placeholder="Your private notes about this session..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Shared Notes (visible to candidate)</Label>
                <Textarea
                  value={notesShared}
                  onChange={(e) => setNotesShared(e.target.value)}
                  placeholder="Notes to share with the candidate..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveNotes} disabled={saving}>
                {saving ? 'Saving...' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                {t('mentor.activity_log', 'Activity Log')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {ACTION_LABELS[log.action] || log.action}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {format(parseISO(log.created_at), 'MMM d, yyyy HH:mm')}
                          {' · '}
                          {log.actor_role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
