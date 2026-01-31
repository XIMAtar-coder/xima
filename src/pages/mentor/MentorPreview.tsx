import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star } from 'lucide-react';
import NotAMentor from './NotAMentor';

export default function MentorPreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMentor, mentorProfile, loading } = useMentorProfile();

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-md mx-auto py-12 px-4">
          <Card className="p-6">
            <Skeleton className="h-16 w-16 rounded-full mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Not a mentor
  if (!isMentor || !mentorProfile) {
    return <NotAMentor />;
  }

  // Normalize avatar URL
  const getAvatarUrl = () => {
    if (!mentorProfile.profile_image_url) return null;
    const path = mentorProfile.profile_image_url;
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `/avatars/${path}`;
  };

  const avatarUrl = getAvatarUrl();
  const compatibilityScore = mentorProfile.rating ? Math.round(mentorProfile.rating * 20) : 85;

  return (
    <MainLayout>
      <div className="container max-w-md mx-auto py-12 px-4 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/mentor')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>

        <div className="text-center mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">
            {t('mentor.preview_title', 'Preview: How candidates see you')}
          </h2>
        </div>

        {/* Mentor Card (same style as FeaturedProfessionals) */}
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-primary/20">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={mentorProfile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xl font-semibold">
                  {mentorProfile.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-lg truncate">{mentorProfile.name}</div>
              <div className="text-sm text-muted-foreground truncate">{mentorProfile.title}</div>
            </div>
          </div>

          <div className="text-sm font-medium rounded-full px-3 py-1 bg-primary/10 text-primary self-start">
            {compatibilityScore}% {t('professionals.compatibility', 'Compatibility')}
          </div>

          {mentorProfile.bio && (
            <p className="text-sm text-muted-foreground line-clamp-3">{mentorProfile.bio}</p>
          )}

          {/* Specialties */}
          {mentorProfile.specialties && mentorProfile.specialties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('professionals.specialties', 'Specialties')}
              </p>
              <div className="flex flex-wrap gap-1">
                {mentorProfile.specialties.slice(0, 3).map((specialty, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* XIMA Pillars */}
          {mentorProfile.xima_pillars && mentorProfile.xima_pillars.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('professionals.xima_pillars', 'XIMA Pillars')}
              </p>
              <div className="flex flex-wrap gap-1">
                {mentorProfile.xima_pillars.slice(0, 3).map((pillar, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs capitalize">
                    {pillar.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* First Session Expectations (if set) */}
          {mentorProfile.first_session_expectations && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('mentor.first_session_label', 'First Session Expectations')}
              </p>
              <p className="text-sm text-muted-foreground">
                {mentorProfile.first_session_expectations}
              </p>
            </div>
          )}

          <div className="mt-auto">
            <Button className="w-full" size="lg" disabled>
              {t('professionals.select', 'Select')}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {t('mentor.preview_note', 'This is a preview. Candidates can select you from their journey.')}
            </p>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
