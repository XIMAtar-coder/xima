import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, ExternalLink, Loader2, Clock, CheckCircle2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  is_booked: boolean;
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

export const MentorSection: React.FC<MentorSectionProps> = ({ mentor, onBookingSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const displayName = mentor?.full_name || mentor?.name || '';
  const photoUrl = mentor?.photo_url || mentor?.avatar_url || undefined;
  const bookingLink = mentor?.booking_link || mentor?.calendar_url || undefined;

  useEffect(() => {
    if (mentor) {
      fetchAvailability();
    }
  }, [mentor]);

  const fetchAvailability = async () => {
    setIsLoadingSlots(true);
    try {
      console.log('[MentorSection] Fetching availability for mentor:', displayName);
      
      const { data, error } = await supabase.functions.invoke('fetch-mentor-availability', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      console.log('[MentorSection] Availability response:', { data, error });

      if (error) {
        console.error('[MentorSection] Error fetching availability:', error);
        toast({
          title: t('common.error'),
          description: t('profile.error_fetching_slots', 'Error fetching availability'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        console.log('[MentorSection] Slots received:', data.slots?.length || 0);
        setSlots(data.slots || []);
        if (data.mentor) {
          setMentorInfo(data.mentor);
        }
        
        // If no slots, show message
        if (data.message && (!data.slots || data.slots.length === 0)) {
          console.log('[MentorSection] No slots message:', data.message);
        }
      }
    } catch (error) {
      console.error('[MentorSection] Exception fetching availability:', error);
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
        // Refresh slots
        await fetchAvailability();
        // Notify parent
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
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' });
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

  if (!mentor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('profile.your_mentor', 'Il Tuo Mentore')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center py-8">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('profile.your_mentor', 'Il Tuo Mentore')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mentor Summary Panel */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={photoUrl} alt={displayName || t('profile.your_mentor')} />
                <AvatarFallback className="bg-primary/10 text-primary">{(displayName || '?').charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {displayName && (
                  <h3 className="font-semibold text-xl text-foreground">{displayName}</h3>
                )}
                {mentor?.role && (
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{mentor.role}</p>
                )}
              </div>
            </div>
            
            {mentor?.bio && (
              <div className="space-y-2">
                <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">
                  {mentor.bio}
                </p>
              </div>
            )}
            
            {/* Key Strengths from mentor info */}
            {mentorInfo?.title && (
              <div className="flex flex-wrap gap-2 mt-3">
                {mentorInfo.title.split(/[,&]/).slice(0, 3).map((specialty, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    {specialty.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Booking Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('profile.book_session', 'Book a Session')} (15 min)
              </h4>
              {slots.length > 0 && (
                <Badge variant="secondary">{slots.length} {t('profile.slots_available', 'slots available')}</Badge>
              )}
            </div>

            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground ml-2">
                  {t('profile.loading_availability', 'Loading availability...')}
                </p>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">{t('profile.no_slots_available', 'No available slots at the moment')}</p>
                <Button onClick={fetchAvailability} variant="outline" size="sm">
                  {t('profile.retry', 'Retry')}
                </Button>
                {bookingLink && (
                  <Button asChild variant="outline">
                    <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('profile.external_booking', 'Book via external calendar')}
                    </a>
                  </Button>
                )}
              </div>
            ) : (
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
              </div>
            )}
          </div>

          {/* External Booking Link (if available) */}
          {bookingLink && slots.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="w-full">
              <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('profile.view_full_calendar', 'View full calendar')}
              </a>
            </Button>
          )}
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
