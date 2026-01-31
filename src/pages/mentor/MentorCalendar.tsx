import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO, addHours, startOfHour, isBefore, isAfter, addDays } from 'date-fns';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { useMentorCalendar, MentorSession } from '@/hooks/useMentorCalendar';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, Plus, User, 
  Check, X, Ban, RefreshCw, Trash2, ChevronRight, Video
} from 'lucide-react';
import NotAMentor from './NotAMentor';

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  requested: { variant: 'secondary', label: 'Pending' },
  confirmed: { variant: 'default', label: 'Confirmed' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  completed: { variant: 'outline', label: 'Completed' },
  rescheduled: { variant: 'secondary', label: 'Rescheduled' },
};

const TIMEZONES = [
  'Europe/Rome',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
];

export default function MentorCalendar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMentor, mentorProfile, loading: profileLoading } = useMentorProfile();
  const {
    slots,
    sessions,
    loading: calendarLoading,
    createSlot,
    deleteSlot,
    confirmSession,
    rejectSession,
    cancelSession,
    completeSession,
  } = useMentorCalendar(mentorProfile?.id || null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newSlotOpen, setNewSlotOpen] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotTimezone, setSlotTimezone] = useState('Europe/Rome');
  const [creating, setCreating] = useState(false);

  const loading = profileLoading || calendarLoading;

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="container max-w-6xl mx-auto py-12 px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!isMentor || !mentorProfile) {
    return <NotAMentor />;
  }

  const pendingSessions = sessions.filter(s => s.status === 'requested');
  const upcomingSessions = sessions.filter(s => 
    ['confirmed', 'rescheduled'].includes(s.status) && 
    isAfter(parseISO(s.starts_at), new Date())
  );
  const pastSessions = sessions.filter(s => 
    ['completed', 'cancelled', 'rejected'].includes(s.status) ||
    isBefore(parseISO(s.ends_at), new Date())
  );

  // Get open slots for the next 30 days
  const futureSlots = slots.filter(s => 
    s.status === 'open' && isAfter(parseISO(s.start_time), new Date())
  );

  // Dates with availability
  const datesWithSlots = new Set(
    futureSlots.map(s => format(parseISO(s.start_time), 'yyyy-MM-dd'))
  );

  const handleCreateSlot = async () => {
    if (!slotDate || !slotStartTime || !slotEndTime) return;
    
    setCreating(true);
    const startDateTime = `${slotDate}T${slotStartTime}:00`;
    const endDateTime = `${slotDate}T${slotEndTime}:00`;
    
    await createSlot({
      start_time: new Date(startDateTime).toISOString(),
      end_time: new Date(endDateTime).toISOString(),
      timezone: slotTimezone,
    });
    
    setCreating(false);
    setNewSlotOpen(false);
    setSlotDate('');
  };

  const handleQuickSlot = async (hoursFromNow: number = 24) => {
    const start = startOfHour(addHours(new Date(), hoursFromNow));
    const end = addHours(start, 1);
    
    await createSlot({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      timezone: slotTimezone,
    });
  };

  // Check if session is joinable (10 min before to 60 min after start)
  const isSessionJoinable = (session: MentorSession): boolean => {
    if (session.status !== 'confirmed') return false;
    const now = new Date();
    const startsAt = parseISO(session.starts_at);
    const windowStart = addDays(startsAt, -1); // subMinutes doesn't exist, use manual calc
    const windowEnd = addDays(startsAt, 1);
    // Simple check: is the session today or in the near future?
    const tenMinBefore = new Date(startsAt.getTime() - 10 * 60 * 1000);
    const sixtyMinAfter = new Date(startsAt.getTime() + 60 * 60 * 1000);
    return now >= tenMinBefore && now <= sixtyMinAfter;
  };

  const SessionCard = ({ session }: { session: MentorSession }) => {
    const statusBadge = STATUS_BADGES[session.status] || STATUS_BADGES.requested;
    const joinable = isSessionJoinable(session);
    
    return (
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate">{session.candidate_name}</span>
                <Badge variant={statusBadge.variant} className="ml-auto">
                  {statusBadge.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {format(parseISO(session.starts_at), 'MMM d, yyyy')}
                <Clock className="h-3 w-3 ml-2" />
                {format(parseISO(session.starts_at), 'HH:mm')} - {format(parseISO(session.ends_at), 'HH:mm')}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {session.status === 'requested' && (
                <>
                  <Button size="sm" variant="default" onClick={() => confirmSession(session.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => rejectSession(session.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              {session.status === 'confirmed' && (
                <>
                  {joinable && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => navigate(`/sessions/${session.id}/room`)}
                      className="gap-1"
                    >
                      <Video className="h-4 w-4" />
                      Join
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => completeSession(session.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Done
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => cancelSession(session.id)}>
                    <Ban className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => navigate(`/mentor/calendar/${session.id}`)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/mentor')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('mentor.back_to_portal', 'Back to Portal')}
            </Button>
          </div>
          <Dialog open={newSlotOpen} onOpenChange={setNewSlotOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('mentor.add_availability', 'Add Availability')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('mentor.create_slot_title', 'Create Availability Slot')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={slotDate} 
                    onChange={(e) => setSlotDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input 
                      type="time" 
                      value={slotStartTime} 
                      onChange={(e) => setSlotStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input 
                      type="time" 
                      value={slotEndTime} 
                      onChange={(e) => setSlotEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={slotTimezone} onValueChange={setSlotTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateSlot} disabled={creating || !slotDate}>
                  {creating ? 'Creating...' : 'Create Slot'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          {t('mentor.calendar_title', 'Calendar & Sessions')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Calendar & Availability */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('mentor.your_availability', 'Your Availability')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasSlots: (date) => datesWithSlots.has(format(date, 'yyyy-MM-dd'))
                  }}
                  modifiersClassNames={{
                    hasSlots: 'bg-primary/20 text-primary font-bold'
                  }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('mentor.quick_add', 'Quick Add')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleQuickSlot(24)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tomorrow 9:00 AM
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleQuickSlot(48)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Day after tomorrow 9:00 AM
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Slots */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('mentor.open_slots', 'Open Slots')} ({futureSlots.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {futureSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No open slots. Add some availability!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {futureSlots.slice(0, 5).map(slot => (
                      <div 
                        key={slot.id} 
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {format(parseISO(slot.start_time), 'MMM d')}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {format(parseISO(slot.start_time), 'HH:mm')} - {format(parseISO(slot.end_time), 'HH:mm')}
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => deleteSlot(slot.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Sessions */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="gap-1">
                  {t('mentor.pending', 'Pending')}
                  {pendingSessions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{pendingSessions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming">{t('mentor.upcoming', 'Upcoming')}</TabsTrigger>
                <TabsTrigger value="past">{t('mentor.past', 'Past')}</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-3 mt-4">
                {pendingSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('mentor.no_pending_sessions', 'No pending session requests')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingSessions.map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-3 mt-4">
                {upcomingSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('mentor.no_upcoming_sessions', 'No upcoming sessions')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingSessions.map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-3 mt-4">
                {pastSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t('mentor.no_past_sessions', 'No past sessions yet')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  pastSessions.slice(0, 10).map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
