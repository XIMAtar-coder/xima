import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Video,
  RefreshCw
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionData {
  id: string;
  mentor_id: string;
  candidate_profile_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  title: string | null;
  notes_shared: string | null;
  session_type: string | null;
  duration_minutes: number | null;
  price_cents: number | null;
  created_at: string;
  requires_reschedule: boolean;
  // Reschedule proposal fields
  proposed_start_at: string | null;
  proposed_end_at: string | null;
  reschedule_status: 'none' | 'proposed' | 'accepted' | 'rejected';
}

interface MentorData {
  id: string;
  name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  title: string | null;
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [mentor, setMentor] = useState<MentorData | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRespondingReschedule, setIsRespondingReschedule] = useState(false);

  const dateLocale = i18n.language?.startsWith('it') ? it : enUS;

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  // Realtime subscription for session updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_sessions',
          filter: `id=eq.${sessionId}`
        },
        () => fetchSessionDetails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('mentor_sessions')
        .select('id, mentor_id, candidate_profile_id, starts_at, ends_at, status, title, notes_shared, session_type, duration_minutes, price_cents, created_at, proposed_start_at, proposed_end_at, reschedule_status, requires_reschedule')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('[SessionDetail] Error fetching session:', sessionError);
        toast({
          title: t('common.error'),
          description: t('sessions.session_not_found', 'Session not found'),
          variant: 'destructive',
        });
        navigate('/profile');
        return;
      }

      setSession({
        ...sessionData,
        reschedule_status: sessionData.reschedule_status || 'none',
        requires_reschedule: sessionData.requires_reschedule ?? false,
      } as SessionData);

      // Fetch mentor info
      const { data: mentorData } = await supabase
        .from('mentors_public')
        .select('id, name, bio, profile_image_url, title')
        .eq('id', sessionData.mentor_id)
        .single();

      if (mentorData) {
        setMentor(mentorData as MentorData);
      }
    } catch (error) {
      console.error('[SessionDetail] Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!session) return;

    setIsCancelling(true);
    try {
      const { data, error } = await supabase.rpc('candidate_cancel_session', {
        p_session_id: session.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to cancel session');
      }

      toast({
        title: t('sessions.cancelled', 'Session Cancelled'),
        description: t('sessions.cancelled_desc', 'Your session has been cancelled.'),
      });

      // Refresh session data
      await fetchSessionDetails();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAcceptReschedule = async () => {
    if (!session) return;

    setIsRespondingReschedule(true);
    try {
      const { data, error } = await supabase.rpc('candidate_accept_reschedule', {
        p_session_id: session.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to accept reschedule');
      }

      toast({
        title: t('sessions.reschedule_accepted', 'Reschedule Accepted'),
        description: t('sessions.reschedule_accepted_desc', 'Session time has been updated.'),
      });

      await fetchSessionDetails();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsRespondingReschedule(false);
    }
  };

  const handleRejectReschedule = async () => {
    if (!session) return;

    setIsRespondingReschedule(true);
    try {
      const { data, error } = await supabase.rpc('candidate_reject_reschedule', {
        p_session_id: session.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to reject reschedule');
      }

      toast({
        title: t('sessions.reschedule_rejected', 'Reschedule Rejected'),
        description: t('sessions.reschedule_rejected_desc', 'Original session time remains unchanged.'),
      });

      await fetchSessionDetails();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsRespondingReschedule(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'HH:mm', { locale: dateLocale });
  };

  const formatFullDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEEE, d MMMM yyyy', { locale: dateLocale });
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      requested: {
        variant: 'secondary',
        icon: <Clock className="h-3 w-3" />,
        label: t('sessions.status_pending', 'Pending confirmation'),
      },
      confirmed: {
        variant: 'default',
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: t('sessions.status_confirmed', 'Confirmed'),
      },
      cancelled: {
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3" />,
        label: t('sessions.status_cancelled', 'Cancelled'),
      },
      rejected: {
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3" />,
        label: t('sessions.status_rejected', 'Rejected'),
      },
      completed: {
        variant: 'outline',
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: t('sessions.status_completed', 'Completed'),
      },
      rescheduled: {
        variant: 'outline',
        icon: <Calendar className="h-3 w-3" />,
        label: t('sessions.status_rescheduled', 'Rescheduled'),
      },
    };

    const config = configs[status] || configs.requested;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const canCancel = session?.status && ['requested', 'confirmed', 'rescheduled'].includes(session.status) && !session?.requires_reschedule;
  const mentorName = mentor?.name || t('sessions.your_mentor', 'Your Mentor');

  // Check if session is joinable (10 min before to 60 min after start)
  const isJoinable = (() => {
    if (!session || session.status !== 'confirmed') return false;
    const now = new Date();
    const startsAt = parseISO(session.starts_at);
    const windowStart = subMinutes(startsAt, 10);
    const windowEnd = addMinutes(startsAt, 60);
    return isAfter(now, windowStart) && isBefore(now, windowEnd);
  })();

  // Check if session is upcoming but not yet joinable
  const isUpcoming = (() => {
    if (!session || session.status !== 'confirmed') return false;
    const now = new Date();
    const startsAt = parseISO(session.starts_at);
    const windowStart = subMinutes(startsAt, 10);
    return isBefore(now, windowStart);
  })();

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-2xl py-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!session) {
    return (
      <MainLayout>
        <div className="container max-w-2xl py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('sessions.session_not_found', 'Session not found')}</p>
              <Button variant="link" onClick={() => navigate('/profile')} className="mt-4">
                {t('common.back_to_profile', 'Back to Profile')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8 space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>

        {/* Session Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {session.title || t('sessions.intro_session', 'Intro Session')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {session.session_type === 'intro' && (
                    <span className="text-primary font-medium">{t('sessions.free_intro', 'Free Intro Session')}</span>
                  )}
                </CardDescription>
              </div>
              {getStatusBadge(session.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mentor Info */}
            <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-4">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={mentor?.profile_image_url || undefined} alt={mentorName} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {mentorName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{mentorName}</h3>
                {mentor?.title && (
                  <p className="text-sm text-muted-foreground">{mentor.title}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Session Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{formatFullDate(session.starts_at)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{session.duration_minutes || 30} {t('common.minutes', 'minutes')}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.price_cents === 0 
                      ? t('sessions.free', 'Free')
                      : `€${(session.price_cents || 0) / 100}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Reschedule Proposal Banner */}
            {session.reschedule_status === 'proposed' && session.proposed_start_at && session.proposed_end_at && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {t('sessions.reschedule_proposed', 'Reschedule Proposed')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sessions.mentor_proposed_new_time', 'Your mentor has proposed a new time for this session:')}
                    </p>
                    <div className="mt-3 bg-background rounded-md p-3 border">
                      <p className="font-medium">{formatFullDate(session.proposed_start_at)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(session.proposed_start_at)} - {formatTime(session.proposed_end_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handleAcceptReschedule}
                        disabled={isRespondingReschedule}
                        className="gap-2"
                      >
                        {isRespondingReschedule ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {t('sessions.accept_new_time', 'Accept New Time')}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleRejectReschedule}
                        disabled={isRespondingReschedule}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        {t('sessions.keep_original', 'Keep Original Time')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reschedule Accepted/Rejected Message */}
            {session.reschedule_status === 'accepted' && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t('sessions.reschedule_confirmed', 'Reschedule Confirmed')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sessions.reschedule_confirmed_desc', 'Session time has been updated to the new schedule above.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {session.reschedule_status === 'rejected' && (
              <div className="bg-muted border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t('sessions.reschedule_declined', 'Reschedule Declined')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sessions.reschedule_declined_desc', 'Original session time remains unchanged.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status explanation */}
            {session.status === 'requested' && (
              <div className="bg-muted border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t('sessions.awaiting_confirmation', 'Awaiting confirmation')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sessions.mentor_will_confirm', 'Your mentor will review and confirm this session request. You\'ll receive an update when they respond.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {session.status === 'confirmed' && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {t('sessions.session_confirmed', 'Session confirmed!')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isJoinable 
                          ? t('sessions.ready_to_join', 'Your session is ready. Click the button below to join.')
                          : isUpcoming
                            ? t('sessions.prepare_for_session', 'Your session is confirmed. Prepare any questions you\'d like to discuss with your mentor.')
                            : t('sessions.session_ended_msg', 'This session has ended.')
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Join Session Button */}
                {isJoinable && (
                  <Button 
                    onClick={() => navigate(`/sessions/${session.id}/room`)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Video className="h-5 w-5" />
                    {t('sessions.join_session', 'Join Session')}
                  </Button>
                )}

                {isUpcoming && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <Clock className="h-4 w-4" />
                    {t('sessions.opens_10_min_before', 'Room opens 10 minutes before the session')}
                  </div>
                )}
              </div>
            )}

            {session.status === 'rejected' && session.requires_reschedule && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <p className="font-medium text-foreground">
                      {t('sessions.free_intro_rejected_title', 'Your mentor is unavailable for this time')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('sessions.free_intro_rejected_msg', "Your mentor couldn't accept this time. You can pick another slot — your free intro is still available.")}
                    </p>
                    <Button 
                      className="w-full gap-2"
                      onClick={() => navigate('/profile')}
                    >
                      <Calendar className="h-4 w-4" />
                      {t('sessions.choose_another_slot', 'Choose another time')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {session.status === 'rejected' && !session.requires_reschedule && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {t('sessions.session_rejected', 'Session declined')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sessions.mentor_rejected', 'Your mentor was unable to accept this session request.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {session.status === 'cancelled' && (
              <div className="bg-muted border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {t('sessions.session_cancelled', 'Session cancelled')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sessions.session_was_cancelled', 'This session has been cancelled.')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => navigate('/profile')}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('sessions.book_new', 'Book a new session')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Shared notes */}
            {session.notes_shared && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('sessions.shared_notes', 'Notes')}
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {session.notes_shared}
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            {canCancel && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive hover:text-destructive" disabled={isCancelling}>
                        {isCancelling ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        {t('sessions.cancel_session', 'Cancel Session')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('sessions.confirm_cancel', 'Cancel Session?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('sessions.cancel_warning', 'Are you sure you want to cancel this session? This action cannot be undone.')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.no', 'No')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t('common.yes_cancel', 'Yes, cancel')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
