import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ExternalLink } from 'lucide-react';

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

interface MentorSectionProps {
  mentor: MentorLike | null;
}

export const MentorSection: React.FC<MentorSectionProps> = ({ mentor }) => {
  const { t } = useTranslation();

  const displayName = mentor?.full_name || mentor?.name || '';
  const photoUrl = mentor?.photo_url || mentor?.avatar_url || undefined;
  const bookingLink = mentor?.booking_link || mentor?.calendar_url || undefined;

  if (!mentor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('profile.your_mentor', 'Your Mentor')}
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('profile.your_mentor', 'Your Mentor')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={photoUrl} alt={displayName || t('profile.your_mentor', 'Your Mentor')} />
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
              <p className="text-sm text-muted-foreground mt-1">{mentor.bio}</p>
            )}
          </div>
        </div>
        {bookingLink && (
          <Button asChild className="w-full">
            <a href={bookingLink} target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-4 w-4" />
              {t('profile.book_15_min_session', 'Book your 15 minute session')}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};