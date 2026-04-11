import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  ExternalLink, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  Star, 
  CalendarDays,
  RefreshCw,
  User,
  AlertCircle,
  Eye,
  Video,
  XCircle,
  Coins,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore, addMinutes, subMinutes } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MentorLike {
  name?: string;
  full_name?: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  photo_url?: string;
  calendar_url?: string;
  booking_link?: string;
}

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked?: boolean;
  timezone?: string;
}

interface MentorInfo {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
}

interface PendingSession {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

interface MentorSectionProps {
  mentor: MentorLike | null;
  onBookingSuccess?: () => void;
}

type AvailabilityState = 'loading' | 'no_availability' | 'no_slots' | 'has_slots' | 'has_pending_session' | 'free_intro_used';

export const MentorSection: React.FC<MentorSectionProps> = ({ mentor, onBookingSuccess }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>('loading');
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [freeIntroUsed, setFreeIntroUsed] = useState(false);

  const dateLocale = i18n.language?.startsWith('it') ? it : enUS;
  const displayName = mentor?.full_name || mentor?.name || '';
  const photoUrl = mentor?.photo_url || mentor?.avatar_url || undefined;
  const bookingLink = mentor?.booking_link || mentor?.calendar_url || undefined;

  useEffect(() => {
    if (mentor) {
      fetchAvailability();
    } else {
      setIsLoadingSlots(false);
      setAvailabilityState('no_availability');
    }
  }, [mentor]);

  const fetchAvailability = async () => {
    setIsLoadingSlots(true);
    setAvailabilityState('loading');
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        setAvailabilityMessage(t('profile.auth_required', 'Please log in to view availability'));
        setAvailabilityState('no_availability');
        return;
      }

      // Check if user has used free intro
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, free_intro_session_used_at')
        .eq('user_id', session.data.session.user.id)
        .single();

      const usedFreeIntro = !!profileData?.free_intro_session_used_at;
      setFreeIntroUsed(usedFreeIntro);

      // Check for existing pending/confirmed sessions with this mentor
      if (profileData?.id) {
        const { data: existingSessions } = await supabase
          .from('mentor_sessions')
          .select('id, starts_at, ends_at, status, session_type')
          .eq('candidate_profile_id', profileData.id)
          .in('status', ['requested', 'confirmed', 'rescheduled'])
          .order('starts_at', { ascending: true })
          .limit(1);

        if (existingSessions && existingSessions.length > 0) {
          setPendingSession(existingSessions[0] as PendingSession);
          setAvailabilityState('has_pending_session');
          setIsLoadingSlots(false);
          return;
        }
      }

      // If free intro is completed (used_at set), show that state
      if (usedFreeIntro) {
        setAvailabilityState('free_intro_used');
        setIsLoadingSlots(false);
        return;
      }

      // If there's a rejected/cancelled free_intro but used_at is null,
      // the candidate can rebook — fall through to show slots

      const { data, error } = await supabase.functions.invoke('fetch-mentor-availability', {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) {
        console.error('[MentorSection] Error fetching availability:', error);
        setAvailabilityState('no_availability');
        setAvailabilityMessage(t('profile.error_fetching_availability', 'Error loading availability'));
        // Silently fail — don't show disruptive toast for non-critical feature
        return;
      }

      if (data?.success) {
        setSlots(data.slots || []);
        if (data.mentor) {
          setMentorInfo(data.mentor);
        }
        setAvailabilityMessage(data.message || null);
        
        if (!data.slots || data.slots.length === 0) {
          if (data.message?.includes('not published')) {
            setAvailabilityState('no_availability');
          } else {
            setAvailabilityState('no_slots');
          }
        } else {
          setAvailabilityState('has_slots');
        }
      }
    } catch (error) {
      console.error('[MentorSection] Exception fetching availability:', error);
      setAvailabilityState('no_availability');
      // Silently handle — don't show error toast for mentor availability
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setShowConfirmDialog(true);
  };

  const handleBookingConfirm = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);
    try {
      // Use the new request_free_intro_session RPC
      const { data, error } = await supabase.rpc('request_free_intro_session', {
        p_slot_id: selectedSlot.id,
      });

      if (error) {
        console.error('[MentorSection] RPC error:', error);
        toast({
          title: t('common.error'),
          description: error.message || t('profile.booking_failed'),
          variant: 'destructive',
        });
        return;
      }

      const result = data as { success: boolean; error?: string; message?: string; session_id?: string; starts_at?: string; ends_at?: string };

      if (result?.success) {
        toast({
          title: t('profile.booking_success', 'Request Sent!'),
          description: t('profile.booking_success_desc', 'Your mentor will confirm shortly.'),
        });
        setShowConfirmDialog(false);
        setSelectedSlot(null);
        
        // Update state to show pending session
        if (result.session_id) {
          setPendingSession({
            id: result.session_id,
            starts_at: result.starts_at || selectedSlot.start_time,
            ends_at: result.ends_at || selectedSlot.end_time,
            status: 'requested'
          });
        }
        setAvailabilityState('has_pending_session');
        // Don't set freeIntroUsed here — it's only consumed on completion
        onBookingSuccess?.();
      } else {
        // Handle specific error codes
        if (result?.error === 'FREE_INTRO_ALREADY_USED') {
          toast({
            title: t('profile.free_intro_used_title', 'Free Intro Already Used'),
            description: t('profile.free_intro_used_desc', 'You already used your free intro session. Next sessions will be available soon.'),
            variant: 'destructive',
          });
          setFreeIntroUsed(true);
          setAvailabilityState('free_intro_used');
        } else {
          toast({
            title: t('common.error'),
            description: result?.message || t('profile.booking_failed'),
            variant: 'destructive',
          });
        }
        setShowConfirmDialog(false);
      }
    } catch (error: any) {
      console.error('[MentorSection] Booking error:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('profile.booking_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'HH:mm', { locale: dateLocale });
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'EEEE, d MMMM', { locale: dateLocale });
  };

  const formatTimezone = (tz: string): string => {
    const tzMap: Record<string, string> = {
      'Europe/Rome': 'CET (Rome)',
      'Europe/London': 'GMT (London)',
      'America/New_York': 'EST (New York)',
      'America/Los_Angeles': 'PST (Los Angeles)',
      'Asia/Tokyo': 'JST (Tokyo)',
    };
    return tzMap[tz] || tz;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'requested': return 'secondary';
      case 'rescheduled': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return t('profile.session_confirmed', 'Confirmed');
      case 'requested': return t('profile.session_pending', 'Pending confirmation');
      case 'rescheduled': return t('profile.session_rescheduled', 'Rescheduled');
      default: return status;
    }
  };

  // Get dates that have available slots
  const datesWithSlots = slots.reduce((acc, slot) => {
    const date = new Date(slot.start_time);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toDateString();
    if (!acc.includes(dateStr)) {
      acc.push(dateStr);
    }
    return acc;
  }, [] as string[]);

  // Filter slots for selected date
  const slotsForSelectedDate = selectedDate
    ? slots.filter((slot) => {
        const slotDate = new Date(slot.start_time);
        slotDate.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        return slotDate.getTime() === selected.getTime();
      })
    : [];

  // Disable dates that don't have slots
  const disabledDates = (date: Date) => {
    const dateStr = new Date(date).setHours(0, 0, 0, 0);
    const hasSlot = datesWithSlots.some((slotDateStr) => {
      const slotDate = new Date(slotDateStr).setHours(0, 0, 0, 0);
      return slotDate === dateStr;
    });
    return !hasSlot || date < new Date(new Date().setHours(0, 0, 0, 0));
  };

  // Sub-component: Free intro used state with credit gating
  const FreeIntroUsedState: React.FC<{ bookingLink?: string }> = ({ bookingLink: bLink }) => {
    const [credits, setCredits] = useState<number | null>(null);
    const [loadingCredits, setLoadingCredits] = useState(true);

    useEffect(() => {
      supabase.rpc('get_my_credit_balance').then(({ data, error }) => {
        if (!error && data != null) setCredits(data as number);
        setLoadingCredits(false);
      });
    }, []);

    const hasEnoughCredits = (credits ?? 0) >= 5;

    return (
      <div className="text-center py-6 space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-primary/50" />
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground font-medium">
            {t('profile.free_intro_completed', 'Free intro session completed')}
          </p>
        </div>

        {/* Credit-gated standard session */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-left">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {t('booking.standard_session_title', 'Book a 45-minute session')}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('booking.standard_session_subtitle', 'Unlocked with credits (5 credits).')}
          </p>

          {loadingCredits ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('credits.available', 'Available credits')}</span>
                <span className="font-semibold text-foreground">{credits ?? 0}</span>
              </div>
              {hasEnoughCredits ? (
                <Button variant="default" size="sm" className="w-full" disabled>
                  {t('booking.standard_session_title', 'Book a 45-minute session')}
                  <span className="ml-1 text-xs opacity-70">({t('settings.coming_soon', 'Coming soon')})</span>
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t('credits.not_enough', 'You need 5 credits to book a 45-minute session.')}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Users className="h-3.5 w-3.5" />
                    {t('credits.cta_invite', 'Invite people to earn credits')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {bLink && (
          <Button asChild variant="secondary" size="sm">
            <a href={bLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('profile.external_booking', 'External calendar')}
            </a>
          </Button>
        )}
      </div>
    );
  };

  // No mentor selected state
  if (!mentor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.your_mentor', 'Your Mentor')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center py-8">
          <div className="flex justify-center">
            <User className="h-16 w-16 text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground">
            {t('profile.no_mentor_assigned', 'Complete your first evaluation to receive a mentor')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.your_mentor', 'Your Mentor')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mentor Identity Section */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20 ring-2 ring-background shadow-md">
              <AvatarImage src={photoUrl} alt={displayName || t('profile.your_mentor')} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {(displayName || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {displayName && (
                <h3 className="font-semibold text-xl text-foreground truncate">{displayName}</h3>
              )}
              {mentor?.role && (
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">{mentor.role}</p>
              )}
              {mentorInfo?.title && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {mentorInfo.title.split(/[,&]/).slice(0, 2).map((specialty, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3" />
                      {specialty.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {mentor?.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
              {mentor.bio}
            </p>
          )}

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            {t('profile.mentor_value_prop', 'Your mentor will guide your professional development with personalized advice based on your XIMA profile.')}
          </div>

          <Separator />

          {/* Availability Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {t('profile.availability', 'Availability')}
              </h4>
              {availabilityState === 'has_slots' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {slots.length} {t('profile.slots_available', 'slots')}
                </Badge>
              )}
            </div>

            {/* Loading State */}
            {isLoadingSlots && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('profile.loading_availability', 'Loading availability...')}
                </span>
              </div>
            )}

            {/* STATE: Has pending/confirmed session */}
            {!isLoadingSlots && availabilityState === 'has_pending_session' && pendingSession && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusBadgeVariant(pendingSession.status)}>
                      {getStatusLabel(pendingSession.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t('profile.free_intro', 'Free Intro')}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(pendingSession.starts_at)}
                    </p>
                    <p className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatTime(pendingSession.starts_at)} - {formatTime(pendingSession.ends_at)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingSession.status === 'requested' 
                      ? t('profile.waiting_confirmation', 'Your mentor will confirm this session shortly.')
                      : pendingSession.status === 'confirmed'
                        ? t('profile.session_ready', 'Your session is confirmed and ready.')
                        : pendingSession.status === 'rejected'
                          ? t('profile.session_declined', 'Your mentor was unable to accept this request.')
                          : t('profile.session_scheduled', 'Your session is scheduled.')}
                  </p>
                </div>

                {/* Show Join button if confirmed and in time window */}
                {pendingSession.status === 'confirmed' && (() => {
                  const now = new Date();
                  const startsAt = parseISO(pendingSession.starts_at);
                  const windowStart = subMinutes(startsAt, 10);
                  const windowEnd = addMinutes(startsAt, 60);
                  const isJoinable = isAfter(now, windowStart) && isBefore(now, windowEnd);
                  const isUpcoming = isBefore(now, windowStart);

                  return isJoinable ? (
                    <Button 
                      className="w-full gap-2"
                      size="lg"
                      onClick={() => navigate(`/sessions/${pendingSession.id}/room`)}
                    >
                      <Video className="h-5 w-5" />
                      {t('profile.join_session', 'Join Session')}
                    </Button>
                  ) : isUpcoming ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                      <Clock className="h-4 w-4" />
                      {t('profile.opens_10_min_before', 'Room opens 10 minutes before the session')}
                    </div>
                  ) : null;
                })()}

                {pendingSession.status === 'rejected' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => fetchAvailability()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('profile.try_another_slot', 'Try another slot')}
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/sessions/${pendingSession.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('profile.view_session_details', 'View details')}
                </Button>
              </div>
            )}

            {/* STATE: Free intro already used — show credit-gated standard session */}
            {!isLoadingSlots && availabilityState === 'free_intro_used' && (
              <FreeIntroUsedState bookingLink={bookingLink} />
            )}

            {/* STATE A: No availability published */}
            {!isLoadingSlots && availabilityState === 'no_availability' && (
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground font-medium">
                    {t('profile.no_availability_yet', 'Your mentor has not published availability yet')}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {t('profile.check_back_later_desc', 'Check back soon or use external booking if available')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={fetchAvailability}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('profile.check_again', 'Check again')}
                  </Button>
                  {bookingLink && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('profile.external_booking', 'External calendar')}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* STATE B: No slots currently available */}
            {!isLoadingSlots && availabilityState === 'no_slots' && (
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <Clock className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground font-medium">
                    {t('profile.no_slots_available', 'No available slots at the moment')}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {t('profile.slots_taken_desc', 'All current slots may be booked. Try again later.')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAvailability}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('profile.retry', 'Retry')}
                </Button>
              </div>
            )}

            {/* STATE C: Available slots present */}
            {!isLoadingSlots && availabilityState === 'has_slots' && (
              <div className="space-y-4">
                {/* Free intro banner */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {t('profile.free_intro_available', 'Free 30-minute intro session')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.select_slot_to_book', 'Select a slot to request your session')}
                    </p>
                  </div>
                </div>

                {/* Calendar Widget */}
                <div className="border border-border rounded-lg p-4 bg-card">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDates}
                    className="mx-auto"
                    modifiers={{
                      available: (date) => {
                        const dateStr = new Date(date).setHours(0, 0, 0, 0);
                        return datesWithSlots.some((slotDateStr) => {
                          const slotDate = new Date(slotDateStr).setHours(0, 0, 0, 0);
                          return slotDate === dateStr;
                        });
                      },
                    }}
                    modifiersClassNames={{
                      available: 'bg-primary/10 font-semibold',
                    }}
                  />
                </div>

                {/* Available Time Slots for Selected Date */}
                {selectedDate && slotsForSelectedDate.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {formatDate(selectedDate.toISOString())}
                      </p>
                      <Badge variant="outline">{slotsForSelectedDate.length} {t('profile.available', 'available')}</Badge>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotsForSelectedDate.map((slot) => (
                        <Button
                          key={slot.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSlotSelect(slot)}
                          className="hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {formatTime(slot.start_time)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && slotsForSelectedDate.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('profile.no_slots_for_date', 'No available slots for this date')}
                  </p>
                )}

                {!selectedDate && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('profile.select_date', 'Select a date to view available time slots')}
                  </p>
                )}

                {/* Timezone indicator */}
                {slots[0]?.timezone && (
                  <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                    {t('profile.timezone_note', 'All times in')} {formatTimezone(slots[0].timezone)}
                  </div>
                )}
              </div>
            )}

            {/* External Booking Link (if available and has slots) */}
            {bookingLink && availabilityState === 'has_slots' && (
              <Button asChild variant="ghost" size="sm" className="w-full">
                <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('profile.view_full_calendar', 'View full calendar')}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.confirm_intro_request', 'Request Free Intro Session')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                {selectedSlot && (
                  <>
                    <p>{t('profile.requesting_with', 'You are requesting a session with')} <strong>{displayName}</strong></p>
                    <div className="bg-muted p-3 rounded-md space-y-1">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedSlot.start_time)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="text-xs">
                          {t('profile.free_intro', 'Free Intro')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">30 {t('common.minutes', 'minutes')}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-muted border border-border rounded-md p-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {t('profile.one_free_intro_note', 'This is your one-time free intro session. Your mentor will need to confirm.')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBooking}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBookingConfirm} disabled={isBooking}>
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('profile.requesting', 'Requesting...')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('profile.request_session', 'Request Session')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
