import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import MainLayout from '../components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '../context/UserContext';
import { ArrowRight, ArrowLeft, Check, Upload, FileText, Calendar, User } from 'lucide-react';
import BaselineAssessment from '../components/ximatar-journey/BaselineAssessment';
import XimatarAssessment from '../components/ximatar-journey/XimatarAssessment';
import ResultsComparison from '../components/ximatar-journey/ResultsComparison';
import { XimatarTestButton } from '../components/ximatar-journey/XimatarTestButton';
import { Logo } from '../components/Logo';
import { CvAnalysisUpload } from '../components/ximatar-journey/CvAnalysisUpload';

const XimatarJourney = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [baselineCompleted, setBaselineCompleted] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [resultsViewed, setResultsViewed] = useState(false);
  const [cvUploaded, setCvUploaded] = useState(false);

  const steps = [
    { number: 1, title: t('journey.step_1'), icon: <FileText size={20} /> },
    { number: 2, title: t('journey.step_2'), icon: <User size={20} /> },
    { number: 3, title: t('journey.step_3'), icon: <Check size={20} /> }
  ];

  const handleStepComplete = (step: number) => {
    switch (step) {
      case 1:
        setBaselineCompleted(true);
        setCurrentStep(2);
        break;
      case 2:
        setAssessmentCompleted(true);
        setCurrentStep(3);
        break;
      case 3:
        setResultsViewed(true);
        // Results component will handle navigation to registration
        break;
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-5xl mx-auto pt-4 watermark-bg">
        <div className="text-center mb-8 relative z-10">
          <Logo 
            variant="full"
            alt="XIMA Logo" 
            className="h-14 w-auto mx-auto mb-4 logo-hover"
          />
          <h1 className="text-4xl font-bold mb-2 font-heading">{t('journey.title')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('journey.subtitle')}
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center relative">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center z-10 relative">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 
                    ${currentStep === step.number 
                      ? 'bg-[#4171d6] border-[#4171d6] text-white' 
                      : currentStep > step.number
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                >
                  {currentStep > step.number ? <Check size={20} /> : step.icon}
                </div>
                <span 
                  className={`text-sm mt-2 text-center max-w-20
                    ${currentStep === step.number 
                      ? 'text-[#4171d6] font-medium' 
                      : currentStep > step.number
                        ? 'text-green-600 font-medium'
                        : 'text-gray-500'
                    }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
            
            <div className="absolute h-1 bg-gray-200 top-6 left-0 right-0 z-0">
              <div 
                className="h-full bg-[#4171d6] transition-all duration-300"
                style={{ 
                  width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
        
        <Card className="p-8 shadow-lg border-0">
          {currentStep === 1 && (
            <div className="space-y-6">
              {isAuthenticated && user?.id && (
                <CvAnalysisUpload userId={user.id} />
              )}
              <BaselineAssessment 
                onComplete={handleStepComplete}
                onCvUpload={setCvUploaded}
              />
            </div>
          )}
          
          {currentStep === 2 && (
            <XimatarAssessment 
              onComplete={handleStepComplete}
              assessmentSetKey={(localStorage.getItem('preferred_field') as 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops') || 'science_tech'}
            />
          )}
          
          {currentStep === 3 && (
            <ResultsComparison 
              onComplete={handleStepComplete}
              hasCv={cvUploaded}
            />
          )}
        </Card>
        
        {/* Navigation */}
        {currentStep < 3 && (
          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={goBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              {t('journey.back')}
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {t('journey.step')} {currentStep} {t('assessment.of')} {steps.length}
            </div>
          </div>
        )}
      </div>
      
      <XimatarTestButton />
    </MainLayout>
  );
};

export default XimatarJourney;
