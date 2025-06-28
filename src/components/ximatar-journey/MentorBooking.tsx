
import React, { useState } from 'react';
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
    calendlyUrl: 'https://calendly.com/daniel-xima-mentor/15min',
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
    calendlyUrl: 'https://calendly.com/pietro-xima-mentor/15min',
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
    calendlyUrl: 'https://calendly.com/antonella-xima-mentor/15min',
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
          <h2 className="text-3xl font-bold mb-4">Book Your Mentor Call</h2>
          <p className="text-gray-600">
            Schedule a 15-minute introduction call with {selectedMentorData.name}
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <XimaAvatar avatar={selectedMentorData.avatar} size="sm" />
            <div>
              <h3 className="font-bold">{selectedMentorData.name}</h3>
              <p className="text-sm text-gray-600">{selectedMentorData.specialty}</p>
            </div>
          </div>

          {/* Calendly Embed Simulation */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
            <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Calendly Integration</h3>
            <p className="text-gray-600 mb-4">
              In a real implementation, this would embed the Calendly widget for {selectedMentorData.name}
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>Calendly URL: {selectedMentorData.calendlyUrl}</p>
              <p>Duration: 15 minutes</p>
              <p>Type: Video call introduction</p>
            </div>
            
            <Button 
              className="mt-4 bg-[#4171d6] hover:bg-[#2950a3]"
              onClick={() => window.open(selectedMentorData.calendlyUrl, '_blank')}
            >
              Open Calendly (Demo)
            </Button>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setShowCalendly(false)}
            className="w-full mt-4"
          >
            Choose Different Mentor
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Start Your Xima Journey</h2>
        <p className="text-gray-600 text-lg">
          Choose your mentor for a personalized 15-minute introduction call
        </p>
        {!isAuthenticated && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              <strong>Registration required:</strong> Please register to book a mentor call
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
                ? 'border-[#4171d6] bg-blue-50' 
                : 'border-gray-200 hover:border-[#4171d6]'
              }`}
            onClick={() => handleMentorSelect(mentor.id)}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <XimaAvatar avatar={mentor.avatar} size="md" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">{mentor.name}</h3>
                <p className="text-sm text-[#4171d6] font-medium">{mentor.specialty}</p>
                <p className="text-sm text-gray-600">{mentor.experience}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={16} />
                  <span>15-minute intro call</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>Flexible scheduling</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={16} />
                  <span>Personalized guidance</span>
                </div>
              </div>

              {selectedMentor === mentor.id && (
                <div className="flex items-center justify-center gap-2 text-[#4171d6] font-medium">
                  <CheckCircle size={16} />
                  <span>Selected</span>
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
            className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
          >
            Book 15min Call with {selectedMentorData?.name}
            <Calendar size={20} className="ml-2" />
          </Button>
        </div>
      )}

      {!selectedMentor && (
        <div className="text-center">
          <p className="text-gray-500">Select a mentor above to continue</p>
        </div>
      )}
    </div>
  );
};

export default MentorBooking;
