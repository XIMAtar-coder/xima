import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ExternalLink } from 'lucide-react';

interface MentorSectionProps {
  mentor: {
    name: string;
    bio?: string;
    avatar_url?: string;
    calendar_url?: string;
  } | null;
}

export const MentorSection: React.FC<MentorSectionProps> = ({ mentor }) => {
  const { t } = useTranslation();

  if (!mentor || !mentor.name) {
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
            <AvatarImage src={mentor.avatar_url} alt={mentor.name} />
            <AvatarFallback>{mentor.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{mentor.name}</h3>
            {mentor.bio && (
              <p className="text-sm text-muted-foreground mt-1">{mentor.bio}</p>
            )}
          </div>
        </div>
        {mentor.calendar_url && (
          <Button 
            className="w-full" 
            onClick={() => window.open(mentor.calendar_url, '_blank')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {t('profile.book_15_min_session', 'Book your 15 minute session')}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};