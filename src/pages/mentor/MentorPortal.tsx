import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, Star, Edit, Eye, CalendarClock, AlertTriangle, CheckCircle, Users, Sparkles, UserCheck } from 'lucide-react';
import { MentorCVAccessSection } from '@/components/mentor/MentorCVAccessSection';
import NotAMentor from './NotAMentor';

export default function MentorPortal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMentor, mentorProfile, loading, error } = useMentorProfile();

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
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-32" />
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

  // Check for incomplete profile
  const isProfileIncomplete = !mentorProfile.bio || !mentorProfile.title || 
    !mentorProfile.profile_image_url || !mentorProfile.xima_pillars?.length;

  // Mentor portal dashboard
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('mentor.portal_title', 'Mentor Portal')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('mentor.portal_description', 'Manage your mentor profile and coaching sessions')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mentorProfile.is_active ? (
              <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('mentor.status_active', 'Active')}
              </Badge>
            ) : (
              <Badge variant="secondary">
                {t('mentor.status_inactive', 'Inactive')}
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Incomplete Warning */}
        {isProfileIncomplete && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('mentor.profile_incomplete_title', 'Complete Your Profile')}</AlertTitle>
            <AlertDescription className="mt-2">
              {t('mentor.profile_incomplete_desc', 'Your profile is missing some information. Complete it to appear in candidate recommendations.')}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/mentor/profile')}
                className="mt-2 border-amber-500/30 hover:bg-amber-500/10"
              >
                <Edit className="h-3 w-3 mr-1" />
                {t('mentor.complete_profile', 'Complete Profile')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Mentor Mini Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-muted ring-2 ring-primary/20">
                  {mentorProfile.profile_image_url ? (
                    <img
                      src={mentorProfile.profile_image_url.startsWith('http') 
                        ? mentorProfile.profile_image_url 
                        : mentorProfile.profile_image_url.startsWith('/') 
                          ? mentorProfile.profile_image_url 
                          : `/avatars/${mentorProfile.profile_image_url}`}
                      alt={mentorProfile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                      {mentorProfile.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-xl font-semibold">{mentorProfile.name}</h3>
                  {mentorProfile.title && (
                    <p className="text-muted-foreground text-sm">{mentorProfile.title}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {mentorProfile.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium text-sm">{mentorProfile.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {mentorProfile.xima_pillars && mentorProfile.xima_pillars.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mentorProfile.xima_pillars.map((pillar) => (
                      <Badge key={pillar} variant="outline" className="capitalize text-xs">
                        {pillar.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Edit Profile */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => navigate('/mentor/profile')}
          >
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Edit className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t('mentor.action_edit_profile', 'Edit Profile')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('mentor.action_edit_profile_desc', 'Update your bio, pillars, and specialties')}
              </p>
            </CardContent>
          </Card>

          {/* Preview as Candidate */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => navigate('/mentor/preview')}
          >
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t('mentor.action_preview', 'Preview as Candidate')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('mentor.action_preview_desc', 'See how candidates view your profile')}
              </p>
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => navigate('/mentor/sessions')}
          >
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t('mentor.action_sessions', 'Sessions')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('mentor.action_sessions_desc', 'View and manage coaching sessions')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('mentor.how_it_works_title', 'How It Works')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{t('mentor.how_step_1_title', 'Appear in Results')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('mentor.how_step_1_desc', 'Candidates see you based on XIMAtar pillar match')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Edit className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{t('mentor.how_step_2_title', 'Manage Your Profile')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('mentor.how_step_2_desc', 'Keep your bio, pillars, and expectations updated')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{t('mentor.how_step_3_title', 'Conduct Sessions')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('mentor.how_step_3_desc', 'Session management coming soon')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CV Access Section */}
        <MentorCVAccessSection mentorId={mentorProfile.id} />

        {/* Quick Stats - Updated with coaching counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{mentorProfile.rating?.toFixed(1) || '—'}</div>
              <p className="text-sm text-muted-foreground">{t('mentor.rating', 'Rating')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                <UserCheck className="h-5 w-5" />
                {(mentorProfile as any).active_coached_profiles_count || 0}
              </div>
              <p className="text-sm text-muted-foreground">{t('mentor.active_coachees', 'Active Coachees')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{(mentorProfile as any).total_coached_profiles_count || 0}</div>
              <p className="text-sm text-muted-foreground">{t('mentor.total_coached', 'Total Coached')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{mentorProfile.xima_pillars?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t('mentor.pillars', 'Pillars')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
