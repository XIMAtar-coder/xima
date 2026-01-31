import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Star, Edit, Eye } from 'lucide-react';
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

  // Mentor portal dashboard
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('mentor.portal_title', 'Mentor Portal')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('mentor.portal_description', 'Manage your mentor profile and how candidates see you')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mentorProfile.is_active ? (
              <Badge variant="default" className="bg-accent/50 text-accent-foreground border-accent/30">
                {t('mentor.status_active', 'Active')}
              </Badge>
            ) : (
              <Badge variant="secondary">
                {t('mentor.status_inactive', 'Inactive')}
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('mentor.your_profile', 'Your Profile')}
            </CardTitle>
            <CardDescription>
              {t('mentor.profile_card_description', 'This is how candidates see your mentor profile')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-muted ring-2 ring-primary/20">
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
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">{mentorProfile.name}</h3>
                  {mentorProfile.title && (
                    <p className="text-muted-foreground">{mentorProfile.title}</p>
                  )}
                </div>

                {mentorProfile.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium">{mentorProfile.rating.toFixed(1)}</span>
                  </div>
                )}

                {mentorProfile.xima_pillars && mentorProfile.xima_pillars.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mentorProfile.xima_pillars.map((pillar) => (
                      <Badge key={pillar} variant="outline" className="capitalize text-xs">
                        {pillar.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}

                {mentorProfile.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{mentorProfile.bio}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
              <Button onClick={() => navigate('/mentor/profile')} className="gap-2">
                <Edit className="h-4 w-4" />
                {t('mentor.edit_profile', 'Edit Profile')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/mentor/preview')} className="gap-2">
                <Eye className="h-4 w-4" />
                {t('mentor.preview_as_candidate', 'Preview as Candidate')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats (read-only) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{mentorProfile.rating?.toFixed(1) || '—'}</div>
              <p className="text-sm text-muted-foreground">{t('mentor.rating', 'Rating')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{mentorProfile.specialties?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t('mentor.specialties', 'Specialties')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{mentorProfile.xima_pillars?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t('mentor.pillars', 'Pillars')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
