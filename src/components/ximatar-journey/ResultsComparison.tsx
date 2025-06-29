
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
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

  // Mock data for demonstration
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

  const userAvatar = {
    animal: t('results.fox_animal'),
    image: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=400&h=400&fit=crop&crop=face',
    features: [
      { name: t('results.adaptability'), description: t('results.adaptability_desc'), strength: 8 },
      { name: t('results.focus'), description: t('results.focus_desc'), strength: 6 },
      { name: t('results.creativity_trait'), description: t('results.creativity_desc'), strength: 7 }
    ]
  };

  // Three matched professionals to choose from
  const matchedProfessionals = [
    {
      id: 'sarah',
      name: 'Dr. Sarah Chen',
      title: t('results.business_strategist'),
      specialization: t('results.communication_leadership'),
      bio: t('results.expert_bio'),
      matchPercentage: 95,
      avatar: {
        animal: t('results.eagle_animal'),
        image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=400&h=400&fit=crop&crop=face',
        features: [
          { name: t('results.vision'), description: t('results.vision_desc'), strength: 9 },
          { name: t('results.leadership'), description: t('results.leadership_desc'), strength: 8 },
          { name: t('results.focus'), description: t('results.focus_desc'), strength: 7 }
        ]
      }
    },
    {
      id: 'marcus',
      name: 'Marcus Rodriguez',
      title: t('results.technical_lead'),
      specialization: t('results.computational_analytics'),
      bio: t('results.technical_expert_bio'),
      matchPercentage: 88,
      avatar: {
        animal: t('results.wolf_animal'),
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        features: [
          { name: t('results.analytical_thinking'), description: t('results.analytical_desc'), strength: 9 },
          { name: t('results.problem_solving'), description: t('results.problem_solving_desc'), strength: 8 },
          { name: t('results.technical_leadership'), description: t('results.technical_leadership_desc'), strength: 8 }
        ]
      }
    },
    {
      id: 'elena',
      name: 'Elena Rossi',
      title: t('results.creative_director'),
      specialization: t('results.innovation_creativity'),
      bio: t('results.creative_expert_bio'),
      matchPercentage: 92,
      avatar: {
        animal: t('results.dolphin_animal'),
        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face',
        features: [
          { name: t('results.creative_thinking'), description: t('results.creative_thinking_desc'), strength: 9 },
          { name: t('results.innovation'), description: t('results.innovation_desc'), strength: 9 },
          { name: t('results.collaboration'), description: t('results.collaboration_desc'), strength: 8 }
        ]
      }
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleProfessionalSelect = (professionalId: string) => {
    setSelectedProfessional(professionalId);
  };

  const handleProceedWithSelection = () => {
    if (!selectedProfessional) return;
    
    if (isAuthenticated) {
      // User is already authenticated, go to dashboard
      navigate('/profile', { 
        state: { 
          selectedProfessional: matchedProfessionals.find(p => p.id === selectedProfessional),
          assessmentResults: finalPillars,
          userAvatar: userAvatar
        }
      });
    } else {
      // User needs to register, store selection and redirect
      localStorage.setItem('selectedProfessional', JSON.stringify({
        professional: matchedProfessionals.find(p => p.id === selectedProfessional),
        assessmentResults: finalPillars,
        userAvatar: userAvatar
      }));
      navigate('/register');
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

      {/* User Avatar Section */}
      <Card className="p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">
          {t('results.your_animal', { animal: userAvatar.animal })}
        </h3>
        <div className="flex justify-center mb-6">
          <XimaAvatar avatar={userAvatar} size="lg" showDetails />
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('results.animal_description')}
        </p>
      </Card>

      {/* Professional Selection Section */}
      <Card className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center">{t('results.choose_your_expert')}</h3>
        <p className="text-center text-gray-600 mb-8">{t('results.expert_selection_subtitle')}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {matchedProfessionals.map((professional) => (
            <Card 
              key={professional.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2
                ${selectedProfessional === professional.id 
                  ? 'border-[#4171d6] bg-blue-50' 
                  : 'border-gray-200 hover:border-[#4171d6]'
                }`}
              onClick={() => handleProfessionalSelect(professional.id)}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <XimaAvatar avatar={professional.avatar} size="md" />
                </div>
                
                <div className="text-center space-y-2">
                  <div className="flex justify-center mb-2">
                    <Badge className="bg-green-100 text-green-800">
                      {professional.matchPercentage}% {t('results.match')}
                    </Badge>
                  </div>
                  <h4 className="text-xl font-bold">{professional.name}</h4>
                  <p className="text-sm text-[#4171d6] font-medium">{professional.title}</p>
                  <p className="text-xs text-gray-600">{professional.specialization}</p>
                </div>

                <p className="text-sm text-gray-600 text-center">{professional.bio}</p>

                {selectedProfessional === professional.id && (
                  <div className="flex items-center justify-center gap-2 text-[#4171d6] font-medium">
                    <CheckCircle size={16} />
                    <span>{t('results.selected')}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {selectedProfessional && (
          <div className="text-center mt-8">
            <Button 
              size="lg"
              onClick={handleProceedWithSelection}
              className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
            >
              {isAuthenticated ? t('results.proceed_to_dashboard') : t('results.register_to_continue')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {/* Comparison Section */}
      {hasCv && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="text-center mb-4">
              <Badge variant="outline" className="mb-2">
                {t('results.baseline_assessment')}
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

      {!selectedProfessional && (
        <div className="text-center">
          <p className="text-gray-500">{t('results.select_professional_prompt')}</p>
        </div>
      )}
    </div>
  );
};

export default ResultsComparison;
