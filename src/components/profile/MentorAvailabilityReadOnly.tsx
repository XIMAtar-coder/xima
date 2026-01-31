import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Loader2, CalendarDays, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface MentorInfo {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
}

interface MentorAvailabilityReadOnlyProps {
  mentorId?: string;
  mentorName?: string;
}

export const MentorAvailabilityReadOnly: React.FC<MentorAvailabilityReadOnlyProps> = ({ 
  mentorId,
  mentorName 
}) => {
  const { t, i18n } = useTranslation();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const dateLocale = i18n.language?.startsWith('it') ? it : enUS;

  useEffect(() => {
    fetchAvailability();
  }, [mentorId]);

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        setMessage(t('profile.auth_required', 'Please log in to view availability'));
        return;
      }

      const { data, error } = await supabase.functions.invoke('fetch-mentor-availability', {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) {
        console.error('[MentorAvailabilityReadOnly] Error:', error);
        setMessage(t('profile.error_fetching_availability', 'Error loading availability'));
        return;
      }

      if (data?.success) {
        setSlots(data.slots || []);
        if (data.mentor) {
          setMentorInfo(data.mentor);
        }
        setMessage(data.message || null);
      }
    } catch (err) {
      console.error('[MentorAvailabilityReadOnly] Exception:', err);
      setMessage(t('profile.error_fetching_availability', 'Error loading availability'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatSlotDate = (dateStr: string): string => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return t('profile.today', 'Today');
    }
    if (isTomorrow(date)) {
      return t('profile.tomorrow', 'Tomorrow');
    }
    return format(date, 'EEEE, d MMMM', { locale: dateLocale });
  };

  const formatSlotTime = (startStr: string, endStr: string): string => {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  const formatTimezone = (tz: string): string => {
    // Human-readable timezone display
    const tzMap: Record<string, string> = {
      'Europe/Rome': 'CET (Rome)',
      'Europe/London': 'GMT (London)',
      'America/New_York': 'EST (New York)',
      'America/Los_Angeles': 'PST (Los Angeles)',
      'Asia/Tokyo': 'JST (Tokyo)',
    };
    return tzMap[tz] || tz;
  };

  // Group slots by date
  const groupedSlots = slots.reduce((acc, slot) => {
    const dateKey = format(parseISO(slot.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const displayName = mentorInfo?.name || mentorName || t('profile.your_mentor', 'Your Mentor');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            {t('profile.mentor_availability', 'Mentor Availability')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {t('profile.loading_availability', 'Loading availability...')}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5" />
          {t('profile.mentor_availability', 'Mentor Availability')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info banner - read-only notice */}
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t('profile.availability_read_only', 
              "View {{mentorName}}'s available slots. Booking will be available soon.",
              { mentorName: displayName }
            )}
          </AlertDescription>
        </Alert>

        {/* Empty state */}
        {slots.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {message || t('profile.no_availability_yet', 'Your mentor has not published availability yet')}
            </p>
          </div>
        )}

        {/* Slots grouped by date */}
        {Object.keys(groupedSlots).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('profile.upcoming_slots', 'Upcoming time slots')}
              </span>
              <Badge variant="secondary">
                {slots.length} {t('profile.slots', 'slots')}
              </Badge>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {Object.entries(groupedSlots).slice(0, 7).map(([dateKey, daySlots]) => (
                <div key={dateKey} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatSlotDate(daySlots[0].start_time)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm"
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatSlotTime(slot.start_time, slot.end_time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Timezone indicator */}
            {slots[0]?.timezone && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                {t('profile.timezone_note', 'All times in')} {formatTimezone(slots[0].timezone)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
