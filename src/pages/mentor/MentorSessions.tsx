import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, ArrowLeft, CalendarClock } from 'lucide-react';
import NotAMentor from './NotAMentor';

export default function MentorSessions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMentor, mentorProfile, loading } = useMentorProfile();

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Not a mentor
  if (!isMentor || !mentorProfile) {
    return <NotAMentor />;
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
        {/* Back navigation */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/mentor')} 
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('mentor.back_to_portal', 'Back to Portal')}
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-primary" />
            {t('mentor.sessions_title', 'Coaching Sessions')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('mentor.sessions_description', 'Manage your coaching sessions with candidates')}
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              {t('mentor.sessions_coming_soon', 'Coming Soon: Session Management')}
            </CardTitle>
            <CardDescription>
              {t('mentor.sessions_coming_soon_desc', 'Full calendar integration and session booking will be available here soon.')}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Sessions Table Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>{t('mentor.upcoming_sessions', 'Upcoming Sessions')}</CardTitle>
            <CardDescription>
              {t('mentor.upcoming_sessions_desc', 'Your scheduled mentoring sessions will appear here')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Table header */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-4 bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('mentor.column_candidate', 'Candidate')}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('mentor.column_date', 'Date & Time')}
                </div>
                <div>{t('mentor.column_status', 'Status')}</div>
                <div>{t('mentor.column_notes', 'Notes')}</div>
              </div>
              
              {/* Empty state */}
              <div className="px-4 py-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {t('mentor.no_sessions_yet', 'No sessions yet')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('mentor.no_sessions_hint', 'Sessions will appear here when candidates book time with you')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">{t('mentor.how_sessions_work', 'How Sessions Work')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                {t('mentor.sessions_step_1', 'Candidates matched with you can request a 15-minute session')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                {t('mentor.sessions_step_2', 'You\'ll receive a notification and can confirm or reschedule')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                {t('mentor.sessions_step_3', 'Sessions are conducted via video call with built-in notes')}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
