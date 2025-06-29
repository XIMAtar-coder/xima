
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import XimaScoreCard from '../XimaScoreCard';
import XimaAvatar from '../XimaAvatar';
import { ArrowRight, CheckCircle, UserPlus } from 'lucide-react';
import { XimaPillars } from '../../types';
import { useUser } from '../../context/UserContext';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useUser();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Mock data for demonstration with proper animal images
  const baselinePillars: XimaPillars = {
    computational: 6,
    communication: 5,
    knowledge: 8,
    creativity: 4,
    drive: 7
  };

  const finalPillars: XimaPillars = {
    computational: 7,
    communication: 8,
    knowledge: 8,
    creativity: 9,
    drive: 8
  };

  const avatar = {
    animal: t('results.fox_animal'),
    image: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=400&h=400&fit=crop&crop=face',
    features: [
      { name: t('results.adaptability'), description: t('results.adaptability_desc'), strength: 8 },
      { name: t('results.focus'), description: t('results.focus_desc'), strength: 6 },
      { name: t('results.creativity_trait'), description: t('results.creativity_desc'), strength: 7 }
    ]
  };

  // Matched professional based on assessment results
  const matchedProfessional = {
    name: "Dr. Sarah Chen",
    title: t('results.business_strategist'),
    specialization: t('results.communication_leadership'),
    bio: t('results.expert_bio'),
    avatar: {
      animal: t('results.eagle_animal'),
      image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=400&h=400&fit=crop&crop=face',
      features: [
        { name: t('results.vision'), description: t('results.vision_desc'), strength: 9 },
        { name: t('results.leadership'), description: t('results.leadership_desc'), strength: 8 },
        { name: t('results.focus'), description: t('results.focus_desc'), strength: 7 }
      ]
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleRegisterToContinue = () => {
    navigate('/register');
  };

  const handleBookingClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      handleRegisterToContinue();
    }
  };

  if (isAnalyzing) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4171d6]"></div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('results.analyzing')}</h2>
          <p className="text-gray-600">{t('results.analyzing_subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t('results.title')}</h2>
        <p className="text-gray-600">
          {hasCv ? t('results.subtitle_with_cv') : t('results.subtitle_without_cv')}
        </p>
      </div>

      {/* Ximatar Avatar Section */}
      <Card className="p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">
          {t('results.your_animal', { animal: avatar.animal })}
        </h3>
        <div className="flex justify-center mb-6">
          <XimaAvatar avatar={avatar} size="lg" showDetails />
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('results.animal_description')}
        </p>
      </Card>

      {/* Matched Professional Section */}
      <Card className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center">{t('results.matched_expert')}</h3>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="md:w-1/3 flex justify-center">
            <XimaAvatar avatar={matchedProfessional.avatar} size="lg" showDetails />
          </div>
          
          <div className="md:w-2/3 space-y-4 text-center md:text-left">
            <div>
              <h4 className="text-2xl font-bold">{matchedProfessional.name}</h4>
              <p className="text-lg text-gray-600">{matchedProfessional.title}</p>
              <p className="text-sm text-[#4171d6] font-medium">{matchedProfessional.specialization}</p>
            </div>
            
            <p className="text-gray-600">{matchedProfessional.bio}</p>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="outline">{t('results.experience_badge')}</Badge>
              <Badge variant="outline">{t('results.communication_expert')}</Badge>
              <Badge variant="outline">{t('results.leadership_coach')}</Badge>
            </div>

            <Button 
              onClick={handleBookingClick}
              className="bg-[#4171d6] hover:bg-[#2950a3] mt-4"
            >
              {isAuthenticated ? t('results.book_appointment') : t('results.register_to_book')}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Comparison Section */}
      {hasCv && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="text-center mb-4">
              <Badge variant="outline" className="mb-2">
                {t('results.baseline_vs_final')}
              </Badge>
              <h3 className="text-lg font-semibold">{t('results.baseline_description')}</h3>
            </div>
            <XimaScoreCard pillars={baselinePillars} compact />
          </Card>

          <Card className="p-6">
            <div className="text-center mb-4">
              <Badge className="mb-2 bg-[#4171d6]">
                {t('results.full_assessment')}
              </Badge>
              <h3 className="text-lg font-semibold">{t('results.full_description')}</h3>
            </div>
            <XimaScoreCard pillars={finalPillars} compact />
          </Card>
        </div>
      )}

      {/* Single Assessment Results */}
      {!hasCv && (
        <Card className="p-8">
          <XimaScoreCard pillars={finalPillars} showTooltip />
        </Card>
      )}

      {/* Registration Prompt - only show if not authenticated */}
      {!isAuthenticated && (
        <Card className="p-8 text-center bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-[#4171d6]">
          <UserPlus size={48} className="mx-auto mb-4 text-[#4171d6]" />
          <h3 className="text-2xl font-bold mb-4">{t('results.continue_journey')}</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('results.registration_prompt')}
          </p>
          
          <Button 
            onClick={handleRegisterToContinue}
            size="lg"
            className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
          >
            {t('results.create_account')}
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ResultsComparison;
