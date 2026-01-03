
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { scoreOpenResponse, type FieldKey } from '@/lib/scoring/openResponse';
import { useToast } from '@/hooks/use-toast';
import { useAssessment } from '@/contexts/AssessmentContext';
import QuestionExample from '@/components/QuestionExample';

interface XimatarAssessmentProps {
  onComplete: (step: number) => void;
  assessmentSetKey?: string;
  // New props for state management
  currentQuestionIndex?: number;
  savedMcAnswers?: Record<number, number>;
  savedOpenAnswers?: Record<string, string>;
  onQuestionChange?: (index: number) => void;
  onMcAnswerChange?: (questionId: number, answerIndex: number) => void;
  onOpenAnswerChange?: (questionId: string, answer: string) => void;
  onGoBack?: () => void;
}

const XimatarAssessment: React.FC<XimatarAssessmentProps> = ({ 
  onComplete, 
  assessmentSetKey = 'science_tech',
  currentQuestionIndex,
  savedMcAnswers,
  savedOpenAnswers,
  onQuestionChange,
  onMcAnswerChange,
  onOpenAnswerChange,
  onGoBack,
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { setAssessmentInProgress } = useAssessment();
  
  // Use external state if provided, otherwise use internal state
  const [internalQuestion, setInternalQuestion] = useState(currentQuestionIndex ?? 0);
  const [internalMcAnswers, setInternalMcAnswers] = useState<Record<number, number>>(savedMcAnswers ?? {});
  const [internalOpenAnswers, setInternalOpenAnswers] = useState<Record<string, string>>(savedOpenAnswers ?? {});
  const [isCompleting, setIsCompleting] = useState(false);
  const [attemptId] = useState(() => crypto.randomUUID());

  // Determine if we're using external state management
  const isExternallyControlled = onQuestionChange !== undefined;
  
  // Current values (external or internal)
  const currentQuestion = isExternallyControlled ? (currentQuestionIndex ?? 0) : internalQuestion;
  const answers = isExternallyControlled ? (savedMcAnswers ?? {}) : internalMcAnswers;
  const openAnswers = isExternallyControlled ? (savedOpenAnswers ?? {}) : internalOpenAnswers;

  // Sync internal state if external state is provided initially
  useEffect(() => {
    if (savedMcAnswers && Object.keys(savedMcAnswers).length > 0) {
      setInternalMcAnswers(savedMcAnswers);
    }
    if (savedOpenAnswers && Object.keys(savedOpenAnswers).length > 0) {
      setInternalOpenAnswers(savedOpenAnswers);
    }
    if (currentQuestionIndex !== undefined) {
      setInternalQuestion(currentQuestionIndex);
    }
  }, []);

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

  const setCurrentQuestion = (index: number) => {
    if (isExternallyControlled && onQuestionChange) {
      onQuestionChange(index);
    } else {
      setInternalQuestion(index);
    }
  };

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    // Update internal state
    setInternalMcAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    
    // Notify parent if externally controlled
    if (isExternallyControlled && onMcAnswerChange) {
      onMcAnswerChange(questionId, answerIndex);
    }
    
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }, 300);
  };

  const handleOpenAnswerChange = (questionId: string, value: string) => {
    setInternalOpenAnswers(prev => ({ ...prev, [questionId]: value }));
    
    if (isExternallyControlled && onOpenAnswerChange) {
      onOpenAnswerChange(questionId, value);
    }
  };

  const handleGoBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (onGoBack) {
      onGoBack();
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    // Use internal state for submission (most up-to-date)
    const submissionAnswers = { ...internalMcAnswers, ...answers };
    const submissionOpenAnswers = { ...internalOpenAnswers, ...openAnswers };
    
    try {
      const fieldKey = assessmentSetKey as FieldKey;
      const language = (i18n.language?.slice(0, 2) || 'it') as 'it' | 'en' | 'es';
      
      // Get current user (may be null for guest users)
      const { data: { user } } = await supabase.auth.getUser();
      
      // For guest users, store data locally and compute client-side
      if (!user) {
        // Store answers in localStorage for post-registration
        const guestData = {
          attemptId,
          assessmentSetKey: fieldKey,
          language,
          answers: submissionAnswers,
          openAnswers: submissionOpenAnswers,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('guest_assessment_data', JSON.stringify(guestData));
        
        // Client-side score computation with proper variance based on answers
        const computeGuestPillarScore = (questionIds: number[]) => {
          let total = 0;
          let count = 0;
          questionIds.forEach(qId => {
            if (submissionAnswers[qId] !== undefined) {
              // answers are 0-3, scale to 0-10 with some variance
              total += (submissionAnswers[qId] + 1) * 2.5 + (Math.random() * 1.5 - 0.75);
              count++;
            }
          });
          return count > 0 ? Math.max(0, Math.min(10, total / count)) : 5;
        };
        
        const mockPillarScores = {
          computational_power: computeGuestPillarScore([1, 2, 3, 4, 5]),
          communication: computeGuestPillarScore([6, 7, 8, 9, 10]),
          knowledge: computeGuestPillarScore([11, 12, 13, 14]),
          creativity: computeGuestPillarScore([15, 16, 17, 18]),
          drive: computeGuestPillarScore([19, 20, 21])
        };
        
        // Determine XIMAtar based on top 2 pillars
        const pillarEntries = Object.entries(mockPillarScores).sort((a, b) => b[1] - a[1]);
        const top2Pillars = [pillarEntries[0][0], pillarEntries[1][0]];
        
        let ximatarLabel = 'fox'; // fallback
        if (top2Pillars.includes('creativity') && top2Pillars.includes('communication')) {
          ximatarLabel = 'parrot';
        } else if (top2Pillars.includes('knowledge') && top2Pillars.includes('computational_power')) {
          ximatarLabel = 'owl';
        } else if (top2Pillars.includes('drive') && top2Pillars.includes('knowledge')) {
          ximatarLabel = 'elephant';
        } else if (top2Pillars.includes('communication') && top2Pillars.includes('drive')) {
          ximatarLabel = 'dolphin';
        } else if (top2Pillars.includes('computational_power') && top2Pillars.includes('creativity')) {
          ximatarLabel = 'cat';
        } else if (top2Pillars.includes('drive')) {
          ximatarLabel = 'horse';
        } else if (top2Pillars.includes('creativity')) {
          ximatarLabel = 'fox';
        } else if (top2Pillars.includes('computational_power')) {
          ximatarLabel = 'bee';
        } else if (top2Pillars.includes('knowledge')) {
          ximatarLabel = 'owl';
        } else if (top2Pillars.includes('communication')) {
          ximatarLabel = 'dolphin';
        } else {
          ximatarLabel = 'chameleon';
        }
        
        // Calculate drive level
        const driveScore = mockPillarScores.drive;
        const driveLevel = driveScore >= 7.5 ? 'high' : driveScore >= 5 ? 'medium' : 'low';
        
        // Find strongest and weakest pillars
        const strongest = pillarEntries[0][0];
        const weakest = pillarEntries[pillarEntries.length - 1][0];
        
        // Store ALL assessment data for sync after registration
        localStorage.setItem('guest_pillar_scores', JSON.stringify(mockPillarScores));
        localStorage.setItem('guest_ximatar', ximatarLabel);
        localStorage.setItem('guest_ximatar_name', ximatarLabel.charAt(0).toUpperCase() + ximatarLabel.slice(1));
        localStorage.setItem('guest_drive_level', driveLevel);
        localStorage.setItem('guest_strongest_pillar', strongest);
        localStorage.setItem('guest_weakest_pillar', weakest);
        localStorage.setItem('guest_ximatar_storytelling', t('ximatar_intro.storytelling'));
        localStorage.setItem('guest_ximatar_growth_path', t(`ximatar_intro.drive_paths.${driveLevel}_desc`));
        
        toast({
          title: t('assessment.guest_complete'),
          description: 'Your results will be saved after registration',
        });
        
        setTimeout(() => {
          onComplete(2);
        }, 500);
        return;
      }
      
      // 1. Score and persist open answers using AI
      const openResponses = await Promise.all(
        (['open1', 'open2'] as const).map(async (openKey) => {
          const answer = submissionOpenAnswers[openKey] || '';
          
          // Call edge function to analyze with Lovable AI
          const { data: aiResult, error: aiError } = await supabase.functions.invoke(
            'analyze-open-answer',
            {
              body: {
                text: answer,
                field: fieldKey,
                language,
                openKey
              }
            }
          );

          if (aiError) {
            console.error('AI analysis error:', aiError);
            // Fallback to local scoring if AI fails
            const fallbackRubric = scoreOpenResponse({
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
              score: fallbackRubric.total,
              rubric: fallbackRubric
            };
          }

          const rubric = {
            length: aiResult.score_breakdown.length,
            relevance: aiResult.score_breakdown.relevance,
            structure: aiResult.score_breakdown.structure,
            specificity: aiResult.score_breakdown.specificity,
            action: aiResult.score_breakdown.action,
            total: aiResult.score_total,
            steveJobsExplanation: aiResult.steve_jobs_explanation,
            improvementSuggestions: aiResult.improvement_suggestions
          };

          return {
            user_id: user.id,
            attempt_id: attemptId,
            field_key: fieldKey,
            language,
            open_key: openKey,
            answer: aiResult.cleaned_text || answer,
            score: rubric.total,
            rubric
          };
        })
      );

      const { error: openError } = await supabase
        .from('assessment_open_responses')
        .insert(openResponses);
      
      if (openError) {
        console.warn('Failed to store open responses:', openError);
      }

      // 2. Create assessment result (not yet completed)
      const { data: resultData, error: resultError } = await supabase
        .from('assessment_results')
        .insert({
          user_id: user.id,
          attempt_id: attemptId,
          field_key: fieldKey,
          language,
          completed: false // Will be set to true after storing answers
        })
        .select()
        .single();

      if (resultError) {
        throw resultError;
      }

      // 3. Store MC answers in assessment_answers table
      // Map question IDs to pillars
      const questionPillarMap: Record<number, string> = {
        // Questions 1-5: Computational Power
        1: 'computational_power', 2: 'computational_power', 3: 'computational_power', 
        4: 'computational_power', 5: 'computational_power',
        // Questions 6-10: Communication
        6: 'communication', 7: 'communication', 8: 'communication', 
        9: 'communication', 10: 'communication',
        // Questions 11-14: Knowledge
        11: 'knowledge', 12: 'knowledge', 13: 'knowledge', 14: 'knowledge',
        // Questions 15-18: Creativity
        15: 'creativity', 16: 'creativity', 17: 'creativity', 18: 'creativity',
        // Questions 19-21: Drive
        19: 'drive', 20: 'drive', 21: 'drive'
      };

      const answerRecords = Object.entries(submissionAnswers).map(([qId, answerIdx]) => ({
        result_id: resultData.id,
        question_id: parseInt(qId),
        answer_value: answerIdx,
        pillar: questionPillarMap[parseInt(qId)] || 'knowledge',
        weight: 1.0
      }));

      const { error: answersError } = await supabase
        .from('assessment_answers')
        .insert(answerRecords);

      if (answersError) {
        console.error('Failed to store assessment answers:', answersError);
        throw answersError;
      }

      // 4. Mark assessment as completed (triggers server-side computation)
      const { error: completeError } = await supabase
        .from('assessment_results')
        .update({ completed: true })
        .eq('id', resultData.id);

      if (completeError) {
        console.error('Failed to mark assessment complete:', completeError);
        throw completeError;
      }

      console.log('Assessment submitted successfully. Server is computing results...');

      // 5. Wait for server computation (poll for computed_at)
      let attempts = 0;
      let computedResult = null;
      
      while (attempts < 15 && !computedResult) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Wait 800ms
        
        const { data: checkResult } = await supabase
          .from('assessment_results')
          .select('computed_at, ximatar_id')
          .eq('id', resultData.id)
          .single();

        if (checkResult && checkResult.ximatar_id) {
          computedResult = checkResult;
          console.log('Computation complete!');
          break;
        }
        
        attempts++;
      }

      if (!computedResult) {
        console.warn('Server computation taking longer than expected');
        toast({
          title: t('assessment.computing'),
          description: 'Your results are being processed. This may take a moment...',
        });
      }
      
      // Store result_id in localStorage for results page
      localStorage.setItem('current_result_id', resultData.id);
      localStorage.setItem('current_attempt_id', attemptId);
      
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to complete assessment. Please try again.',
        variant: 'destructive'
      });
      setIsCompleting(false);
      return;
    }
    
    setTimeout(() => {
      onComplete(2);
    }, 500);
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
        <p className="text-muted-foreground">
          {t(`${baseKey}.subtitle`)}
        </p>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {t('assessment.question')} {currentQuestion + 1} {t('assessment.of')} {totalQuestions}
          </p>
        </div>
      </div>

      <Card className="p-8">
        {currentMultipleChoice && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {t(`${baseKey}.questions.${currentMultipleChoice.key}.category`)}
                </div>
                <QuestionExample
                  assessmentSetKey={assessmentSetKey as 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops'}
                  qKey={currentMultipleChoice.key}
                  categoryLabel={t(`${baseKey}.questions.${currentMultipleChoice.key}.category`)}
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
                  className={`p-4 text-left rounded-lg border-2 transition-all hover:border-primary hover:bg-primary/5
                    ${answers[currentMultipleChoice.id] === index 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0
                      ${answers[currentMultipleChoice.id] === index 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground/50'
                      }`}>
                      {answers[currentMultipleChoice.id] === index && (
                        <div className="w-2 h-2 bg-primary-foreground rounded-full m-0.5"></div>
                      )}
                    </div>
                    <span>{t(`${baseKey}.questions.${currentMultipleChoice.key}.options.${index}`)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Back button for multiple choice */}
            <div className="flex justify-start pt-4">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                {t('journey.back', 'Back')}
              </Button>
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
                  openFallbackCategory="creativity"
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
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  {t('journey.back', 'Back')}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {openAnswers[currentOpenQuestion.id]?.length || 0} {t('assessment.characters')}
                </p>
              </div>
              
              {currentQuestion === totalQuestions - 1 ? (
                <Button 
                  onClick={handleComplete}
                  disabled={!canProceed() || isCompleting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isCompleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
                  className="bg-primary hover:bg-primary/90"
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
