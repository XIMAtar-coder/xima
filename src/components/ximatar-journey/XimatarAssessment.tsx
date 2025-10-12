
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { scoreOpenResponse, type FieldKey } from '@/lib/scoring/openResponse';
import { useToast } from '@/hooks/use-toast';
import { useAssessment } from '@/contexts/AssessmentContext';
import QuestionExample from '@/components/QuestionExample';

interface XimatarAssessmentProps {
  onComplete: (step: number) => void;
  assessmentSetKey?: string;
}

const XimatarAssessment: React.FC<XimatarAssessmentProps> = ({ onComplete, assessmentSetKey = 'science_tech' }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { setAssessmentInProgress } = useAssessment();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [attemptId] = useState(() => crypto.randomUUID()); // Generate once per assessment

  useEffect(() => {
    setAssessmentInProgress(true);
    
    // Verification console log (dev-only)
    if (process.env.NODE_ENV === 'development') {
      console.info('[XIMA] Using assessment set:', assessmentSetKey, 'locale:', i18n.language);
      const testKey = `assessmentSets.${assessmentSetKey}.questions.q1.question`;
      const testValue = t(testKey);
      console.info('[XIMA] Test translation for q1:', testValue.includes('assessmentSets') ? '❌ MISSING' : '✅ OK');
    }
    
    return () => setAssessmentInProgress(false);
  }, [setAssessmentInProgress, assessmentSetKey, i18n.language, t]);

  // Define all 21 multiple choice questions
  const questions = [
    { id: 1, key: 'q1' },
    { id: 2, key: 'q2' },
    { id: 3, key: 'q3' },
    { id: 4, key: 'q4' },
    { id: 5, key: 'q5' },
    { id: 6, key: 'q6' },
    { id: 7, key: 'q7' },
    { id: 8, key: 'q8' },
    { id: 9, key: 'q9' },
    { id: 10, key: 'q10' },
    { id: 11, key: 'q11' },
    { id: 12, key: 'q12' },
    { id: 13, key: 'q13' },
    { id: 14, key: 'q14' },
    { id: 15, key: 'q15' },
    { id: 16, key: 'q16' },
    { id: 17, key: 'q17' },
    { id: 18, key: 'q18' },
    { id: 19, key: 'q19' },
    { id: 20, key: 'q20' },
    { id: 21, key: 'q21' }
  ];

  const openQuestions = [
    { id: 'open1', key: 'open1' },
    { id: 'open2', key: 'open2' }
  ];

  const totalQuestions = questions.length + openQuestions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }, 300);
  };

  const handleOpenAnswerChange = (questionId: string, value: string) => {
    setOpenAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Score and persist open answers
        const fieldKey = assessmentSetKey as FieldKey;
        const language = (i18n.language?.slice(0, 2) || 'it') as 'it' | 'en' | 'es';
        
        const openResponses = (['open1', 'open2'] as const).map(openKey => {
          const answer = openAnswers[openKey] || '';
          const rubric = scoreOpenResponse({ 
            text: answer, 
            field: fieldKey, 
            language, 
            openKey 
          });
          
          return {
            user_id: user.id,
            attempt_id: attemptId,
            field_key: fieldKey,
            language,
            open_key: openKey,
            answer,
            score: rubric.total,
            rubric
          };
        });

        // Store open responses (non-blocking - continue even if this fails)
        const { error } = await supabase
          .from('assessment_open_responses')
          .insert(openResponses);
        
        if (error) {
          console.warn('Failed to store open responses:', error);
        }
        
        // Store attempt_id in localStorage for results page
        localStorage.setItem('current_attempt_id', attemptId);
      }
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to save open responses, but continuing...',
        variant: 'destructive'
      });
    }
    
    setTimeout(() => {
      onComplete(2);
    }, 2000);
  };

  const canProceed = () => {
    if (currentQuestion < questions.length) {
      return answers[questions[currentQuestion].id] !== undefined;
    }
    const openQ = openQuestions[currentQuestion - questions.length];
    return openAnswers[openQ.id]?.trim().length > 0;
  };

  const isOpenQuestion = currentQuestion >= questions.length;
  const currentOpenQuestion = isOpenQuestion ? openQuestions[currentQuestion - questions.length] : null;
  const currentMultipleChoice = !isOpenQuestion ? questions[currentQuestion] : null;

  const baseKey = `assessmentSets.${assessmentSetKey}`;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t(`${baseKey}.title`)}</h2>
        <p className="text-gray-600 dark:text-gray-300">
          {t(`${baseKey}.subtitle`)}
        </p>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500">
            {t('assessment.question')} {currentQuestion + 1} {t('assessment.of')} {totalQuestions}
          </p>
        </div>
      </div>

      <Card className="p-8">
        {currentMultipleChoice && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-block px-3 py-1 bg-[#2C6CFF] bg-opacity-10 text-[#2C6CFF] rounded-full text-sm font-medium">
                  {t(`${baseKey}.questions.${currentMultipleChoice.key}.category`)}
                </div>
                <QuestionExample
                  assessmentSetKey={assessmentSetKey as 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops'}
                  qKey={currentMultipleChoice.key}
                  category={t(`${baseKey}.questions.${currentMultipleChoice.key}.category`)}
                />
              </div>
              <h3 className="text-xl font-medium">
                {t(`${baseKey}.questions.${currentMultipleChoice.key}.question`)}
              </h3>
            </div>
            
            <div className="grid gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentMultipleChoice.id, index)}
                  className={`p-4 text-left rounded-lg border-2 transition-all hover:border-[#2C6CFF] hover:bg-blue-50 dark:hover:bg-white/5
                    ${answers[currentMultipleChoice.id] === index 
                      ? 'border-[#2C6CFF] bg-blue-50 dark:bg-white/5 text-[#2C6CFF]' 
                      : 'border-gray-200 dark:border-white/10 hover:border-[#2C6CFF]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0
                      ${answers[currentMultipleChoice.id] === index 
                        ? 'border-[#2C6CFF] bg-[#2C6CFF]' 
                        : 'border-gray-300'
                      }`}>
                      {answers[currentMultipleChoice.id] === index && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <span>{t(`${baseKey}.questions.${currentMultipleChoice.key}.options.${index}`)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentOpenQuestion && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                  {t('assessment.open_question')} {currentQuestion - questions.length + 1}
                </div>
                <QuestionExample
                  assessmentSetKey={assessmentSetKey as 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops'}
                  qKey={currentOpenQuestion.key}
                  category="Creativity"
                />
              </div>
              <h3 className="text-xl font-medium">
                {t(`${baseKey}.questions.${currentOpenQuestion.key}.question`)}
              </h3>
            </div>
            
            <Textarea
              placeholder={t('assessment.placeholder')}
              value={openAnswers[currentOpenQuestion.id] || ''}
              onChange={(e) => handleOpenAnswerChange(currentOpenQuestion.id, e.target.value)}
              className="min-h-[150px] resize-none"
            />
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {openAnswers[currentOpenQuestion.id]?.length || 0} {t('assessment.characters')}
              </p>
              
              {currentQuestion === totalQuestions - 1 ? (
                <Button 
                  onClick={handleComplete}
                  disabled={!canProceed() || isCompleting}
                  className="bg-[#2C6CFF] hover:bg-[#2950a3]"
                >
                  {isCompleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t('assessment.completing')}
                    </>
                  ) : (
                    <>
                      {t('assessment.complete_assessment')}
                      <ArrowRight size={16} className="ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  disabled={!canProceed()}
                  className="bg-[#2C6CFF] hover:bg-[#2950a3]"
                >
                  {t('assessment.next_question')}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default XimatarAssessment;
