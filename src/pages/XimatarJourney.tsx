import React, { useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import MainLayout from '../components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '../context/UserContext';
import { ArrowRight, ArrowLeft, Check, Upload, FileText, Calendar, User, RotateCcw } from 'lucide-react';
import BaselineAssessment from '../components/ximatar-journey/BaselineAssessment';
import XimatarAssessment from '../components/ximatar-journey/XimatarAssessment';
import ResultsComparison from '../components/ximatar-journey/ResultsComparison';
import { Logo } from '../components/Logo';
import { CvAnalysisUpload } from '../components/ximatar-journey/CvAnalysisUpload';
import { useXimatarJourneyState } from '@/hooks/useXimatarJourneyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const XimatarJourney = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  
  const {
    step: currentStep,
    questionIndex,
    mcAnswers,
    openAnswers,
    baselineCompleted,
    cvUploaded,
    showResumeModal,
    setStep,
    setQuestionIndex,
    setMcAnswer,
    setOpenAnswer,
    setBaselineCompleted,
    setCvUploaded,
    goToNextQuestion,
    goToPrevQuestion,
    completeJourney,
    resumeJourney,
    startFresh,
    setShowResumeModal,
  } = useXimatarJourneyState();

  const steps = [
    { number: 1, title: t('ximatarJourney.step1_label'), icon: <FileText size={20} /> },
    { number: 2, title: t('ximatarJourney.step2_label'), icon: <User size={20} /> },
    { number: 3, title: t('ximatarJourney.step3_label'), icon: <Check size={20} /> }
  ];

  const handleStepComplete = (step: number) => {
    switch (step) {
      case 1:
        setBaselineCompleted(true);
        setStep(2);
        break;
      case 2:
        setStep(3);
        break;
      case 3:
        completeJourney();
        break;
    }
  };

  const goBack = () => {
    if (currentStep === 2 && questionIndex > 0) {
      goToPrevQuestion();
    } else if (currentStep > 1) {
      if (currentStep === 2) {
        setQuestionIndex(0);
      }
      setStep(currentStep - 1);
    }
  };

  const hasProgress = currentStep > 1 || questionIndex > 0 || Object.keys(mcAnswers).length > 0;

  return (
    <MainLayout>
      {/* Resume Modal */}
      <AlertDialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('journey.resume_title', 'Resume Your Journey?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('journey.resume_description', 'You have saved progress from a previous session. Would you like to continue where you left off?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={startFresh} className="flex items-center gap-2">
              <RotateCcw size={16} />
              {t('journey.start_over', 'Start Over')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={resumeJourney}>
              {t('journey.resume', 'Resume')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container max-w-5xl mx-auto pt-4 watermark-bg">
        <div className="text-center mb-8 relative z-10">
          <Logo 
            variant="full"
            alt="XIMA Logo" 
            className="h-14 w-auto mx-auto mb-4 logo-hover"
          />
          <h1 className="text-4xl font-bold mb-2 font-heading">{t('ximatarJourney.page_title')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('ximatarJourney.page_subtitle')}
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
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : currentStep > step.number
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                    }`}
                >
                  {currentStep > step.number ? <Check size={20} /> : step.icon}
                </div>
                <span 
                  className={`text-sm mt-2 text-center max-w-20
                    ${currentStep === step.number 
                      ? 'text-primary font-medium' 
                      : currentStep > step.number
                        ? 'text-green-600 font-medium'
                        : 'text-muted-foreground'
                    }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
            
            <div className="absolute h-1 bg-muted top-6 left-0 right-0 z-0">
              <div 
                className="h-full bg-primary transition-all duration-300"
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
              currentQuestionIndex={questionIndex}
              savedMcAnswers={mcAnswers}
              savedOpenAnswers={openAnswers}
              onQuestionChange={setQuestionIndex}
              onMcAnswerChange={setMcAnswer}
              onOpenAnswerChange={setOpenAnswer}
              onGoBack={goBack}
            />
          )}
          
          {currentStep === 3 && (
            <ResultsComparison 
              onComplete={handleStepComplete}
              hasCv={cvUploaded}
            />
          )}
        </Card>
        
        {/* Mentor Selection Required Message */}
        {currentStep === 3 && (
          <div className="mt-8 mb-6 text-center">
            <p className="text-lg font-semibold text-foreground bg-primary/10 border-2 border-primary/30 rounded-lg py-4 px-6 inline-block">
              {t('journey.choose_mentor_required')}
            </p>
          </div>
        )}
        
        {/* Navigation - only show for step 1 */}
        {currentStep === 1 && (
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
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('journey.step')} {currentStep} {t('assessment.of')} {steps.length}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default XimatarJourney;
