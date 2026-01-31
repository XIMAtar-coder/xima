import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Bell,
  RefreshCw,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
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

interface MentorSectionProps {
  mentor: MentorLike | null;
  onBookingSuccess?: () => void;
}

type AvailabilityState = 'loading' | 'no_availability' | 'no_slots' | 'has_slots';

export const MentorSection: React.FC<MentorSectionProps> = ({ mentor, onBookingSuccess }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>('loading');
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

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

      const { data, error } = await supabase.functions.invoke('fetch-mentor-availability', {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) {
        console.error('[MentorSection] Error fetching availability:', error);
        setAvailabilityState('no_availability');
        setAvailabilityMessage(t('profile.error_fetching_availability', 'Error loading availability'));
        toast({
          title: t('common.error'),
          description: t('profile.error_fetching_slots', 'Error fetching availability'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        setSlots(data.slots || []);
        if (data.mentor) {
          setMentorInfo(data.mentor);
        }
        setAvailabilityMessage(data.message || null);
        
        // Determine availability state
        if (!data.slots || data.slots.length === 0) {
          // Check if mentor has ever published availability
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
      toast({
        title: t('common.error'),
        description: t('profile.error_fetching_slots', 'Error fetching availability'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    setShowConfirmDialog(true);
  };

  const handleBookingConfirm = async () => {
    if (!selectedSlot || !mentorInfo) return;

    setIsBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-mentor-meeting', {
        body: {
          slot_id: selectedSlot.id,
          mentor_id: mentorInfo.id,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message || t('profile.booking_failed'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        toast({
          title: t('profile.booking_success'),
          description: t('profile.booking_success_desc'),
        });
        setShowConfirmDialog(false);
        setSelectedSlot(null);
        await fetchAvailability();
        onBookingSuccess?.();
      } else {
        toast({
          title: t('common.error'),
          description: data?.message || t('profile.booking_failed'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
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
              {/* Key specialties */}
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
          
          {/* Mentor Bio (truncated) */}
          {mentor?.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
              {mentor.bio}
            </p>
          )}

          {/* Value Proposition */}
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
            <AlertDialogTitle>{t('profile.confirm_booking', 'Confirm Booking')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSlot && (
                <div className="space-y-2 text-left">
                  <p>{t('profile.booking_with', 'You are booking a session with')} <strong>{displayName}</strong></p>
                  <div className="bg-muted p-3 rounded-md space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedSlot.start_time)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.duration_15', 'Duration: 15 minutes')}
                    </p>
                  </div>
                </div>
              )}
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
                  {t('profile.booking', 'Booking...')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('profile.confirm', 'Confirm Booking')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
