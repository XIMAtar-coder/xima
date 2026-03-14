import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Clock, CheckCircle } from 'lucide-react';
import XimaAvatar from '../XimaAvatar';
import { Avatar } from '../../types';

const mentors = [
  {
    id: 'daniel',
    name: 'Daniel Rodriguez',
    specialty: 'Computational Power & Analysis',
    experience: '10+ years in Data Science',
    calendlyUrl: 'https://calendly.com/daniel-xima-mentor/30min',
    avatar: {
      animal: 'Elephant',
      image: '/placeholder.svg',
      features: [
        { name: 'Analytical Thinking', description: 'Expert in data analysis', strength: 9 },
        { name: 'Problem Solving', description: 'Complex problem resolution', strength: 8 },
        { name: 'Technical Leadership', description: 'Guides technical teams', strength: 8 }
      ]
    }
  },
  {
    id: 'pietro',
    name: 'Pietro Martinelli',
    specialty: 'Communication & Leadership',
    experience: '8+ years in Management',
    calendlyUrl: 'https://calendly.com/pietro-xima-mentor/30min',
    avatar: {
      animal: 'Lion',
      image: '/placeholder.svg',
      features: [
        { name: 'Leadership', description: 'Natural team leader', strength: 9 },
        { name: 'Communication', description: 'Excellent communicator', strength: 9 },
        { name: 'Mentoring', description: 'Develops talent effectively', strength: 8 }
      ]
    }
  },
  {
    id: 'antonella',
    name: 'Antonella Rossi',
    specialty: 'Creativity & Innovation',
    experience: '12+ years in Design & Strategy',
    calendlyUrl: 'https://calendly.com/antonella-xima-mentor/30min',
    avatar: {
      animal: 'Fox',
      image: '/placeholder.svg',
      features: [
        { name: 'Creative Thinking', description: 'Innovative problem solver', strength: 9 },
        { name: 'Strategic Planning', description: 'Long-term vision', strength: 8 },
        { name: 'Innovation', description: 'Drives creative solutions', strength: 9 }
      ]
    }
  }
];

const MentorBooking: React.FC = () => {
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [showCalendly, setShowCalendly] = useState(false);
  const { isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleMentorSelect = (mentorId: string) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    setSelectedMentor(mentorId);
  };

  const handleBookCall = () => {
    if (!selectedMentor) return;
    setShowCalendly(true);
  };

  const selectedMentorData = mentors.find(m => m.id === selectedMentor);

  if (showCalendly && selectedMentorData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">{t('mentor.book_title')}</h2>
          <p className="text-muted-foreground">
            {t('mentor.book_subtitle', { name: selectedMentorData.name })}
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <XimaAvatar avatar={selectedMentorData.avatar} size="sm" />
            <div>
              <h3 className="font-bold text-foreground">{selectedMentorData.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedMentorData.specialty}</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
            <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-foreground">{t('mentor.calendly_title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('mentor.calendly_description', { name: selectedMentorData.name })}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('mentor.calendly_url', { url: selectedMentorData.calendlyUrl })}</p>
              <p>{t('mentor.calendly_duration')}</p>
              <p>{t('mentor.calendly_type')}</p>
            </div>
            
            <Button 
              className="mt-4 bg-primary hover:bg-primary/90"
              onClick={() => window.open(selectedMentorData.calendlyUrl, '_blank')}
            >
              {t('mentor.open_calendly')}
            </Button>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setShowCalendly(false)}
            className="w-full mt-4"
          >
            {t('mentor.choose_different')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4 text-foreground">{t('mentor.title')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('mentor.subtitle')}
        </p>
        {!isAuthenticated && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-foreground">
              {t('mentor.login_required')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mentors.map((mentor) => (
          <Card 
            key={mentor.id}
            className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2
              ${selectedMentor === mentor.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary'
              }`}
            onClick={() => handleMentorSelect(mentor.id)}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <XimaAvatar avatar={mentor.avatar} size="md" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground">{mentor.name}</h3>
                <p className="text-sm text-primary font-medium">{mentor.specialty}</p>
                <p className="text-sm text-muted-foreground">{mentor.experience}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock size={16} />
                  <span>{t('mentor.intro_call')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={16} />
                  <span>{t('mentor.flexible_scheduling')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={16} />
                  <span>{t('mentor.personalized_guidance')}</span>
                </div>
              </div>

              {selectedMentor === mentor.id && (
                <div className="flex items-center justify-center gap-2 text-primary font-medium">
                  <CheckCircle size={16} />
                  <span>{t('mentor.selected')}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedMentor && (
        <div className="text-center">
          <Button 
            size="lg"
            onClick={handleBookCall}
            className="bg-primary hover:bg-primary/90 px-8 py-4"
          >
            {t('mentor.book_session', { name: selectedMentorData?.name })}
            <Calendar size={20} className="ml-2" />
          </Button>
        </div>
      )}

      {!selectedMentor && (
        <div className="text-center">
          <p className="text-muted-foreground">{t('mentor.select_mentor')}</p>
        </div>
      )}
    </div>
  );
};

export default MentorBooking;