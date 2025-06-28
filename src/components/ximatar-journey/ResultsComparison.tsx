
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import XimaScoreCard from '../XimaScoreCard';
import XimaAvatar from '../XimaAvatar';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { XimaPillars } from '../../types';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);

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

  const avatar = {
    animal: 'Fox',
    image: '/placeholder.svg',
    features: [
      { name: 'Adaptability', description: 'Quick to learn and adjust to new environments', strength: 8 },
      { name: 'Focus', description: 'Maintains concentration on tasks', strength: 6 },
      { name: 'Creativity', description: 'Finds unique solutions to problems', strength: 7 }
    ]
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigate('/profile');
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
          <XimaScoreCard pillars={finalPillars} />
        </Card>
      )}

      {/* Insights Section */}
      {hasCv && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-500" size={24} />
            {t('results.key_insights')}
          </h3>
          
          <div className="space-y-4">
            <p className="text-gray-600">{t('results.insights_intro')}</p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4171d6] mt-2 flex-shrink-0"></div>
                <span>{t('results.insight_1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4171d6] mt-2 flex-shrink-0"></div>
                <span>{t('results.insight_2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4171d6] mt-2 flex-shrink-0"></div>
                <span>{t('results.insight_3')}</span>
              </li>
            </ul>
          </div>
        </Card>
      )}

      {/* Continue Button */}
      <div className="text-center">
        <Button 
          onClick={handleContinue}
          size="lg"
          className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
        >
          {t('results.continue_journey')}
          <ArrowRight size={20} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ResultsComparison;
