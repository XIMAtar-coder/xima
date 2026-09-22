import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import { RotateCcw } from 'lucide-react';
import BaselineAssessment from '../components/ximatar-journey/BaselineAssessment';
import XimatarAssessment from '../components/ximatar-journey/XimatarAssessment';
import AssessmentV2 from '../components/ximatar-journey/AssessmentV2';
import { isV2Field, type V2Field } from '@/lib/assessment/v2/model';
import ResultsComparison from '../components/ximatar-journey/ResultsComparison';
import { JourneyBar, JourneyInline } from '../components/ximatar-journey/JourneySteps';
import { Panel } from '@/components/layout/PageHeader';
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
import Seo from '@/components/Seo';
import type { FieldKey } from '@/components/FieldSelector';
import { useBusinessRole } from '@/hooks/useBusinessRole';

/**
 * The guest journey: field and CV, questionnaire, results. Each step carries
 * its own header (eyebrow, title, actions); this page only adds the shell
 * width and the step indicator.
 */
const XimatarJourney = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useUser();
  const { isBusiness, loading: businessRoleLoading } = useBusinessRole();
  const { t } = useTranslation();

  const {
    step: currentStep,
    questionIndex,
    mcAnswers,
    openAnswers,
    v2,
    setV2McAnswer,
    setV2DriveAnswer,
    setV2Order,
    setV2Pause,
    cvUploaded,
    showResumeModal,
    setStep,
    setQuestionIndex,
    setMcAnswer,
    setOpenAnswer,
    setBaselineCompleted,
    setCvUploaded,
    goToPrevQuestion,
    completeJourney,
    resumeJourney,
    startFresh,
    setShowResumeModal,
  } = useXimatarJourneyState();

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

  // The journey saves its answers to whoever is signed in. A company account
  // that opened it (easy to do: the landing page links here) got a candidate
  // assessment written onto the business user and was then sent to the
  // candidate dashboard instead of registration. Stop before the first answer.
  if (isAuthenticated && !businessRoleLoading && isBusiness) {
    return (
      <MainLayout>
        <Seo title="XIMAtar Journey — XIMA" description="Your personalized assessment journey." path="/ximatar-journey" noindex />
        <div className="mx-auto max-w-lg px-4 py-16">
          <Panel className="space-y-4">
            <h1 className="text-xl font-semibold">{t('ximatarJourney.business_account_title')}</h1>
            <p className="text-muted-foreground">{t('ximatarJourney.business_account_body')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => navigate('/business/dashboard')}>{t('ximatarJourney.business_account_dashboard')}</Button>
              <Button variant="outline" onClick={async () => { await signOut(); navigate('/ximatar-journey', { replace: true }); }}>
                {t('ximatarJourney.business_account_sign_out')}
              </Button>
            </div>
          </Panel>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Seo title="XIMAtar Journey — XIMA" description="Your personalized assessment journey." path="/ximatar-journey" noindex />
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

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-5 sm:px-6 sm:pt-7">
        {currentStep === 1 && (
          <>
            <JourneyBar current={1} className="mb-7 sm:mb-9" />
            <BaselineAssessment
              onComplete={handleStepComplete}
              onCvUpload={setCvUploaded}
            />
          </>
        )}

        {currentStep === 2 && (
          <>
            <JourneyInline current={2} className="mb-6 sm:mb-8" />
            {isV2Field(localStorage.getItem('preferred_field')) ? (
              <AssessmentV2
                fieldKey={localStorage.getItem('preferred_field') as V2Field}
                onComplete={handleStepComplete}
                onGoBack={goBack}
                cvAnalysed={cvUploaded}
                questionIndex={questionIndex}
                onQuestionChange={setQuestionIndex}
                v2={v2}
                openAnswers={openAnswers}
                onMcAnswer={setV2McAnswer}
                onDriveAnswer={setV2DriveAnswer}
                onOrder={setV2Order}
                onPause={setV2Pause}
                onOpenAnswerChange={setOpenAnswer}
              />
            ) : (
            <XimatarAssessment
              onComplete={handleStepComplete}
              assessmentSetKey={(localStorage.getItem('preferred_field') as FieldKey) || 'science_tech'}
              currentQuestionIndex={questionIndex}
              savedMcAnswers={mcAnswers}
              savedOpenAnswers={openAnswers}
              onQuestionChange={setQuestionIndex}
              onMcAnswerChange={setMcAnswer}
              onOpenAnswerChange={setOpenAnswer}
              onGoBack={goBack}
              cvAnalysed={cvUploaded}
            />
            )}
          </>
        )}

        {currentStep === 3 && (
          <ResultsComparison
            onComplete={handleStepComplete}
            hasCv={cvUploaded}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default XimatarJourney;
