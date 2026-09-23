import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO, addHours, startOfHour, isBefore, isAfter } from 'date-fns';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { useMentorCalendar, MentorSession } from '@/hooks/useMentorCalendar';
import MentorLayout from '@/components/mentor/MentorLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chip } from '@/components/business/XsBits';
import {
  Calendar as CalendarIcon, Clock, Plus, User,
  Check, X, Ban, RefreshCw, Trash2, ChevronRight, Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotAMentor from './NotAMentor';

type Tab = 'pending' | 'upcoming' | 'past';

const TIMEZONES = [
  'Europe/Rome', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore',
];

/**
 * Calendar, "meetings first" layout: the requests to handle are at the top and
 * the month is a day picker beside them. The page used to give the whole screen
 * to an empty month and hide the requests at the bottom.
 */
export default function MentorCalendar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isMentor, mentorProfile, loading: profileLoading } = useMentorProfile();
  const {
    slots, sessions, loading: calendarLoading,
    createSlot, deleteSlot, confirmSession, rejectSession, cancelSession, completeSession,
  } = useMentorCalendar(mentorProfile?.id || null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [tab, setTab] = useState<Tab>('pending');
  const [newSlotOpen, setNewSlotOpen] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotTimezone, setSlotTimezone] = useState('Europe/Rome');
  const [creating, setCreating] = useState(false);

  if (profileLoading) {
    return (
      <MentorLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MentorLayout>
    );
  }

  if (!isMentor || !mentorProfile) return <NotAMentor />;

  const now = new Date();
  const pendingSessions = sessions.filter((s) => s.status === 'requested');
  const upcomingSessions = sessions.filter((s) =>
    ['confirmed', 'rescheduled'].includes(s.status) && isAfter(parseISO(s.starts_at), now));
  const pastSessions = sessions.filter((s) =>
    ['completed', 'cancelled', 'rejected'].includes(s.status) || isBefore(parseISO(s.ends_at), now));

  const futureSlots = slots.filter((s) => s.status === 'open' && isAfter(parseISO(s.start_time), now));
  const datesWithSlots = new Set(futureSlots.map((s) => format(parseISO(s.start_time), 'yyyy-MM-dd')));
  const daySlots = selectedDate
    ? futureSlots.filter((s) => format(parseISO(s.start_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const longDate = (d: Date) => d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = (iso: string) => parseISO(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  const hhmm = (iso: string) => format(parseISO(iso), 'HH:mm');

  const handleCreateSlot = async () => {
    if (!slotDate || !slotStartTime || !slotEndTime) return;
    setCreating(true);
    await createSlot({
      start_time: new Date(`${slotDate}T${slotStartTime}:00`).toISOString(),
      end_time: new Date(`${slotDate}T${slotEndTime}:00`).toISOString(),
      timezone: slotTimezone,
    });
    setCreating(false);
    setNewSlotOpen(false);
    setSlotDate('');
  };

  const handleQuickSlot = async (hoursFromNow: number) => {
    const start = startOfHour(addHours(new Date(), hoursFromNow));
    const end = addHours(start, 1);
    await createSlot({ start_time: start.toISOString(), end_time: end.toISOString(), timezone: slotTimezone });
  };

  // Joinable from 10 minutes before the start to 60 minutes after it.
  const isSessionJoinable = (session: MentorSession): boolean => {
    if (session.status !== 'confirmed') return false;
    const startsAt = parseISO(session.starts_at).getTime();
    const t0 = Date.now();
    return t0 >= startsAt - 10 * 60 * 1000 && t0 <= startsAt + 60 * 60 * 1000;
  };

  const SessionRow = ({ session }: { session: MentorSession }) => {
    const joinable = isSessionJoinable(session);
    return (
      <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{session.candidate_name}</span>
            <Chip tone={session.status === 'confirmed' ? 'status' : 'neutral'}>
              {t(`mentor.session_status_${session.status}`, session.status)}
            </Chip>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {shortDate(session.starts_at)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {hhmm(session.starts_at)}–{hhmm(session.ends_at)}
            </span>
          </p>
          {session.reschedule_status === 'proposed' && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-amber-600 dark:text-amber-400">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {t('mentor.awaiting_reschedule_response', 'Waiting for the candidate to answer the new time')}
            </p>
          )}
          {session.reschedule_status === 'accepted' && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t('mentor.reschedule_accepted', 'New time accepted')}
            </p>
          )}
          {session.reschedule_status === 'rejected' && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <X className="h-3 w-3" aria-hidden="true" />
              {t('mentor.reschedule_rejected', 'New time declined')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {session.status === 'requested' && (
            <>
              <Button size="sm" onClick={() => confirmSession(session.id)}>
                <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('mentor.confirm_session', 'Confirm')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => rejectSession(session.id)}>
                {t('mentor.decline_session', 'Decline')}
              </Button>
            </>
          )}
          {session.status === 'confirmed' && (
            <>
              {joinable && (
                <Button size="sm" onClick={() => navigate(`/sessions/${session.id}/room`)}>
                  <Video className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {t('sessions.join_session', 'Join')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => completeSession(session.id)}>
                {t('mentor.done', 'Done')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => cancelSession(session.id)} aria-label={t('mentor.cancel_session', 'Cancel the session')}>
                <Ban className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/mentor/calendar/${session.id}`)}
            aria-label={t('mentor.open_session', 'Open the session')}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </li>
    );
  };

  const tabs: { id: Tab; label: string; rows: MentorSession[]; empty: string }[] = [
    { id: 'pending', label: t('mentor.pending', 'Requests'), rows: pendingSessions, empty: t('mentor.no_pending_sessions', 'No requests to handle.') },
    { id: 'upcoming', label: t('mentor.upcoming', 'Upcoming'), rows: upcomingSessions, empty: t('mentor.no_upcoming_sessions', 'No upcoming sessions') },
    { id: 'past', label: t('mentor.past', 'Past'), rows: pastSessions.slice(0, 10), empty: t('mentor.no_past_sessions', 'No past sessions yet') },
  ];
  const current = tabs.find((x) => x.id === tab)!;

  const newSlotDialog = (
    <Dialog open={newSlotOpen} onOpenChange={setNewSlotOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('mentor.add_availability', 'Add availability')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('mentor.create_slot_title', 'Open a time slot')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="slot-date">{t('mentor.slot_date', 'Day')}</Label>
            <Input id="slot-date" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot-start">{t('mentor.slot_start', 'From')}</Label>
              <Input id="slot-start" type="time" value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end">{t('mentor.slot_end', 'To')}</Label>
              <Input id="slot-end" type="time" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot-tz">{t('mentor.slot_timezone', 'Time zone')}</Label>
            <Select value={slotTimezone} onValueChange={setSlotTimezone}>
              <SelectTrigger id="slot-tz"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel', 'Cancel')}</Button>
          </DialogClose>
          <Button onClick={handleCreateSlot} disabled={creating || !slotDate}>
            {creating ? t('mentor.slot_creating', 'Opening…') : t('mentor.slot_create', 'Open the slot')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <MentorLayout breadcrumb={<span className="truncate">{t('mentor.nav_portal', 'Mentor portal')} / {t('mentor.calendar_title', 'Calendar and sessions')}</span>}>
      <PageHeader
        eyebrow={t('mentor.calendar_eyebrow', 'Organise your time')}
        title={t('mentor.calendar_title', 'Calendar and sessions')}
        subtitle={t('mentor.calendar_subtitle', 'Open your availability and walk every request through to a meeting.')}
        actions={newSlotDialog}
      />

      {/* Quick add: the fastest way out of an empty calendar */}
      <div className="xs-glass mb-6 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Eyebrow>{t('mentor.quick_add', 'Quick add')}</Eyebrow>
          <h2 className="mt-1.5 text-[19px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
            {t('mentor.quick_add_title', 'Open a time to listen')}
          </h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {t('mentor.quick_add_body', 'Start from one slot. You can remove it while it stays free.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleQuickSlot(24)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('mentor.quick_tomorrow', 'Tomorrow 9:00')}
          </Button>
          <Button variant="outline" onClick={() => handleQuickSlot(48)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('mentor.quick_day_after', 'Day after tomorrow 9:00')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* The month as a day picker */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Panel className="!p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasSlots: (date) => datesWithSlots.has(format(date, 'yyyy-MM-dd')) }}
              modifiersClassNames={{ hasSlots: 'font-semibold text-primary' }}
              className="w-full"
            />
            <p className="mt-2 flex items-center gap-2 border-t border-[hsl(var(--xs-line))] pt-3 text-[12px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {t('mentor.calendar_legend', 'Day with availability')}
            </p>
          </Panel>
          <div>
            <Eyebrow>{t('mentor.your_availability', 'Your availability')}</Eyebrow>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t('mentor.calendar_rule', 'A free slot can receive a request. A request becomes a session once you confirm it.')}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {t('mentor.calendar_timezone', 'Times in {{tz}}', { tz: slotTimezone })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Sessions first */}
          <Panel className="!p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5">
              <h2 className="text-[17px] font-semibold tracking-[-0.2px] text-foreground">{t('mentor.sessions_title', 'Your sessions')}</h2>
              <p className="text-[13px] text-muted-foreground">{t('mentor.sessions_hint', 'Every meeting in its place')}</p>
            </div>
            <div className="flex gap-1 border-b border-[hsl(var(--xs-line))] px-4" role="tablist">
              {tabs.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === x.id}
                  onClick={() => setTab(x.id)}
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors',
                    tab === x.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {x.label}
                  <span className="ml-1.5 font-mono text-[12px] tabular-nums">{x.rows.length}</span>
                </button>
              ))}
            </div>
            {calendarLoading ? (
              <div className="space-y-2 p-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : current.rows.length === 0 ? (
              <div className="flex items-start gap-3 px-5 py-8">
                <Clock className="h-5 w-5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                <p className="text-[14px] leading-relaxed text-muted-foreground">{current.empty}</p>
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--xs-line))]">
                {current.rows.map((s) => <SessionRow key={s.id} session={s} />)}
              </ul>
            )}
          </Panel>

          {/* The selected day */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.2px] text-foreground">
                  {t('mentor.day_availability', 'Availability for the day')}
                  <span className="ml-2 font-mono text-[13px] tabular-nums text-muted-foreground">{daySlots.length}</span>
                </h2>
              {selectedDate && <p className="mt-0.5 text-[13px] text-muted-foreground">{longDate(selectedDate)}</p>}
              </div>
              <Button variant="outline" onClick={() => setNewSlotOpen(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('mentor.add_availability', 'Add availability')}
              </Button>
            </div>

            {daySlots.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-[hsl(var(--xs-line))] px-5 py-8 text-center">
                <p className="text-[15px] font-medium text-foreground">{t('mentor.day_free_title', 'A free day, for now')}</p>
                <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
                  {t('mentor.day_free_body', 'You have not opened any slot for this day. Choose a time to offer to candidates.')}
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[hsl(var(--xs-line))]">
                {daySlots.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between py-3">
                    <span className="font-mono text-[14px] tabular-nums text-foreground">
                      {hhmm(slot.start_time)}–{hhmm(slot.end_time)}
                    </span>
                    <Button size="sm" variant="ghost" aria-label={t('a11y.delete')} onClick={() => deleteSlot(slot.id)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {futureSlots.length > 0 && (
              <p className="mt-4 border-t border-[hsl(var(--xs-line))] pt-3 text-[13px] text-muted-foreground">
                {t('mentor.open_slots_total', '{{count}} open slots in the coming days', { count: futureSlots.length })}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </MentorLayout>
  );
}
