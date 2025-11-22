import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, Loader2, Clock, CheckCircle2 } from 'lucide-react';
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
      const { data, error } = await supabase.functions.invoke('fetch-mentor-availability', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching availability:', error);
        return;
      }

      if (data?.success) {
        setSlots(data.slots || []);
        if (data.mentor) {
          setMentorInfo(data.mentor);
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
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

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = new Date(slot.start_time).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

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
          {/* Mentor Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={photoUrl} alt={displayName || t('profile.your_mentor')} />
              <AvatarFallback>{(displayName || '?').charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {displayName && (
                <h3 className="font-semibold text-lg">{displayName}</h3>
              )}
              {mentor?.role && (
                <p className="text-sm text-muted-foreground mt-1">{mentor.role}</p>
              )}
              {mentor?.bio && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{mentor.bio}</p>
              )}
            </div>
          </div>

          {/* Available Slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('profile.available_slots', 'Available Slots')} (15 min)
              </h4>
              {slots.length > 0 && (
                <Badge variant="secondary">{slots.length} available</Badge>
              )}
            </div>

            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('profile.no_slots_available', 'No available slots at the moment')}</p>
                {bookingLink && (
                  <Button asChild variant="outline" className="mt-4">
                    <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('profile.external_booking', 'Book via external calendar')}
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(slotsByDate).slice(0, 7).map(([date, dateSlots]) => (
                  <div key={date} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatDate(dateSlots[0].start_time)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {dateSlots.map((slot) => (
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
                ))}
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
