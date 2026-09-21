
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { scoreOpenResponse, type FieldKey } from '@/lib/scoring/openResponse';
import { getPillarForQuestion, getQuestionIdsByPillar } from '@/lib/assessment/getPillarForQuestion';
import { useToast } from '@/hooks/use-toast';
import { useAssessment } from '@/context/AssessmentContext';
import { useUser } from '@/context/UserContext';
import { useQuestionExampleContent, QuestionExampleToggle, QuestionExamplePanel } from '@/components/QuestionExample';
import { Eyebrow, Panel } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { selectArchetypeFromAssessmentPillars } from '@/lib/ximatarTaxonomy';
import { log } from '@/lib/log';
import { ASSESSMENT_MC_COUNT, ASSESSMENT_OPEN_COUNT, ASSESSMENT_ESTIMATED_MINUTES, OPEN_ANSWER_MIN_CHARS } from './assessmentShape';

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
  /** True when the CV step just produced an analysis; the intro then confirms it. */
  cvAnalysed?: boolean;
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
  cvAnalysed = false,
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { setAssessmentInProgress } = useAssessment();
  const { user } = useUser();
  // The example panel; collapsed again on every new question so it never
  // pushes the next one down.
  const [exampleOpen, setExampleOpen] = useState(false);

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
      log.info('[XIMA] Using assessment set:', assessmentSetKey, 'locale:', i18n.language);
      const testKey = `assessmentSets.${assessmentSetKey}.questions.q1.question`;
      const testValue = t(testKey);
      log.info('[XIMA] Test translation for q1:', testValue.includes('assessmentSets') ? '❌ MISSING' : '✅ OK');
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

  useEffect(() => setExampleOpen(false), [assessmentSetKey, currentQuestion]);

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
      
      // For guest users, store data in sessionStorage (auto-clears on tab close for security)
      if (!user) {
        // Store answers in sessionStorage for post-registration (more secure than localStorage)
        const guestData = {
          attemptId,
          assessmentSetKey: fieldKey,
          language,
          answers: submissionAnswers,
          openAnswers: submissionOpenAnswers,
          timestamp: new Date().toISOString()
        };
        sessionStorage.setItem('guest_assessment_data', JSON.stringify(guestData));
        
        // Client-side score computation using correct cyclic pillar mapping
        const pillarGroups = getQuestionIdsByPillar();
        
        const computeGuestPillarScore = (questionIds: number[]) => {
          let total = 0;
          let count = 0;
          questionIds.forEach(qId => {
            if (submissionAnswers[qId] !== undefined) {
              // Answers are 0-3; scale linearly to 2.5-10. Deterministic on
              // purpose: this used to add Math.random()*1.5-0.75 per answer,
              // so the same answers could yield a different pillar profile and
              // a different XIMAtar on a retake. A psychometric result must be
              // reproducible from its inputs.
              total += (submissionAnswers[qId] + 1) * 2.5;
              count++;
            }
          });
          return count > 0 ? Math.max(0, Math.min(10, total / count)) : 5;
        };
        
        const mockPillarScores = {
          computational_power: computeGuestPillarScore(pillarGroups.computational_power),
          communication: computeGuestPillarScore(pillarGroups.communication),
          knowledge: computeGuestPillarScore(pillarGroups.knowledge),
          creativity: computeGuestPillarScore(pillarGroups.creativity),
          drive: computeGuestPillarScore(pillarGroups.drive),
        };
        
        if (process.env.NODE_ENV === 'development') {
          log.info('[XIMA] Guest pillar groups:', pillarGroups);
          log.info('[XIMA] Guest pillar scores:', mockPillarScores);
        }
        
        // Determine XIMAtar from pillar scores via shared helper.
        // The same helper is used by post-registration sync so the persisted
        // archetype always matches what the candidate sees here.
        const derived = selectArchetypeFromAssessmentPillars(mockPillarScores);
        const ximatarLabel = derived.label;
        const driveLevel = derived.driveLevel;
        const strongest = derived.strongest;
        const weakest = derived.weakest;

        // Store ALL assessment data in sessionStorage for sync after registration (more secure).
        // Writes are synchronous and grouped so guest_ximatar and guest_pillar_scores
        // can never diverge.
        sessionStorage.setItem('guest_pillar_scores', JSON.stringify(mockPillarScores));
        sessionStorage.setItem('guest_ximatar', ximatarLabel);
        sessionStorage.setItem('guest_ximatar_name', derived.name);
        sessionStorage.setItem('guest_drive_level', driveLevel);
        sessionStorage.setItem('guest_strongest_pillar', strongest);
        sessionStorage.setItem('guest_weakest_pillar', weakest);
        sessionStorage.setItem('guest_ximatar_storytelling', t('ximatar_intro.storytelling'));
        sessionStorage.setItem('guest_ximatar_growth_path', t(`ximatar_intro.drive_paths.${driveLevel}_desc`));
        
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
            log.error('AI analysis error:', aiError);
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
        log.warn('Failed to store open responses:', openError);
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
      // Use cyclic pillar mapping (single source of truth)
      const answerRecords = Object.entries(submissionAnswers).map(([qId, answerIdx]) => {
        const questionNum = parseInt(qId);
        const pillar = getPillarForQuestion(questionNum);

        if (process.env.NODE_ENV === 'development') {
          const categoryLabel = t(`${baseKey}.questions.q${questionNum}.category`);
          log.info(`[XIMA] q${questionNum}: category="${categoryLabel}" → pillar="${pillar}"`);
        }

        return {
          result_id: resultData.id,
          question_id: questionNum,
          answer_value: answerIdx,
          pillar,
          weight: 1.0,
        };
      });

      const { error: answersError } = await supabase
        .from('assessment_answers')
        .insert(answerRecords);

      if (answersError) {
        log.error('Failed to store assessment answers:', answersError);
        throw answersError;
      }

      // 4. Mark assessment as completed (triggers server-side computation)
      const { error: completeError } = await supabase
        .from('assessment_results')
        .update({ completed: true })
        .eq('id', resultData.id);

      if (completeError) {
        log.error('Failed to mark assessment complete:', completeError);
        throw completeError;
      }

      log.debug('Assessment submitted successfully. Server is computing results...');

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
          computedResult = checkResult as any;
          log.debug('Computation complete!');
          break;
        }
        
        attempts++;
      }

      if (!computedResult) {
        log.warn('Server computation taking longer than expected');
        toast({
          title: t('assessment.computing'),
          description: 'Your results are being processed. This may take a moment...',
        });
      }
      
      // Store result_id in localStorage for results page
      localStorage.setItem('current_result_id', resultData.id);
      localStorage.setItem('current_attempt_id', attemptId);
      
    } catch (error) {
      log.error('Error completing assessment:', error);
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

  // Written answers need OPEN_ANSWER_MIN_CHARS characters, as the placeholder
  // has always said. Validation used to accept a single character.
  const openAnswerLength = (id: string) => (openAnswers[id] || '').trim().length;
  const isOpenAnswerLongEnough = (id: string) => openAnswerLength(id) >= OPEN_ANSWER_MIN_CHARS;

  const canProceed = () => {
    if (currentQuestion < questions.length) {
      return answers[questions[currentQuestion].id] !== undefined;
    }
    const openQ = openQuestions[currentQuestion - questions.length];
    return isOpenAnswerLongEnough(openQ.id);
  };

  // An earlier written answer can be too short if it was saved before the
  // minimum was enforced; completing must not submit it as it is.
  const shortEarlierOpenAnswerIndex = openQuestions.findIndex(
    (q, i) => questions.length + i < currentQuestion && !isOpenAnswerLongEnough(q.id)
  );

  const isOpenQuestion = currentQuestion >= questions.length;
  const currentOpenQuestion = isOpenQuestion ? openQuestions[currentQuestion - questions.length] : null;
  const currentMultipleChoice = !isOpenQuestion ? questions[currentQuestion] : null;

  const baseKey = `assessmentSets.${assessmentSetKey}`;

  const fieldTitle = t(`field.${assessmentSetKey}.title`, { defaultValue: '' });
  const firstName = user?.name?.trim().split(/\s+/)[0] || '';
  const shape = { mc: ASSESSMENT_MC_COUNT, open: ASSESSMENT_OPEN_COUNT, minutes: ASSESSMENT_ESTIMATED_MINUTES };

  // Which of the 23 squares in the rail are filled.
  const isAnswered = (index: number) =>
    index < questions.length
      ? answers[questions[index].id] !== undefined
      : isOpenAnswerLongEnough(openQuestions[index - questions.length].id);

  const exampleKey = currentMultipleChoice?.key ?? currentOpenQuestion?.key ?? '';
  const categoryLabel = currentMultipleChoice
    ? t(`${baseKey}.questions.${currentMultipleChoice.key}.category`)
    : undefined;
  const exampleContent = useQuestionExampleContent({
    assessmentSetKey: assessmentSetKey as 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops',
    qKey: exampleKey,
    categoryLabel,
    openFallbackCategory: 'creativity',
  });
  const examplePanelId = `question-example-${exampleKey}`;

  const isLast = currentQuestion === totalQuestions - 1;
  const continueDisabled = isLast
    ? !canProceed() || shortEarlierOpenAnswerIndex !== -1 || isCompleting
    : !canProceed();

  const footer = (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-6">
      <Button type="button" variant="ghost" onClick={handleGoBack} className="h-10 gap-1.5 px-2 text-[13px] font-medium">
        <ArrowLeft size={15} aria-hidden />
        {t('guestJourney.questionnaire.back')}
      </Button>
      <Button
        type="button"
        onClick={isLast ? handleComplete : () => setCurrentQuestion(currentQuestion + 1)}
        disabled={continueDisabled}
        className="h-11 rounded-[7px] px-5 text-[13px]"
      >
        {isLast ? (
          isCompleting ? (
            <>
              <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              {t('assessment.completing')}
            </>
          ) : (
            <>
              {t('assessment.complete_assessment')}
              <ArrowRight size={15} aria-hidden />
            </>
          )
        ) : (
          <>
            {t('guestJourney.questionnaire.continue')}
            <ArrowRight size={15} aria-hidden />
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[235px_minmax(0,1fr)] lg:gap-x-10">
      {/* Left rail: who, which field, and the 23-square map of the questionnaire. */}
      <aside className="hidden self-start border-r border-[hsl(var(--xs-line))] pr-6 lg:block">
        <Eyebrow className="mb-6">{t('guestJourney.questionnaire.rail_title')}</Eyebrow>
        <h3 className="text-[19px] font-semibold tracking-[-0.3px] text-foreground">
          {firstName ? t('guestJourney.questionnaire.hello', { name: firstName }) : t('guestJourney.questionnaire.hello_plain')}
        </h3>
        {fieldTitle && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('guestJourney.questionnaire.field_label')}
            <br />
            <span className="text-foreground">{fieldTitle}</span>
          </p>
        )}
        <div className="mt-7 flex items-center justify-between border-t border-[hsl(var(--xs-line))] pt-4 text-xs">
          <strong className="font-semibold text-foreground">{t('guestJourney.questionnaire.questionnaire_label')}</strong>
          <span className="text-muted-foreground">{t('guestJourney.questionnaire.questions_count', { count: totalQuestions })}</span>
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-[7px]" aria-label={t('guestJourney.questionnaire.questionnaire_label')}>
          {Array.from({ length: totalQuestions }, (_, i) => {
            const current = i === currentQuestion;
            const answered = isAnswered(i);
            return (
              <li
                key={i}
                aria-current={current ? 'step' : undefined}
                aria-label={`${t('assessment.question')} ${i + 1}`}
                className={cn(
                  'h-3.5 rounded-[2px] border',
                  current
                    ? 'border-2 border-primary bg-transparent'
                    : answered
                      ? 'border-primary bg-primary'
                      : 'border-[hsl(var(--xs-line))] bg-transparent',
                )}
              />
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">{t('guestJourney.questionnaire.grid_hint')}</p>
        <dl className="mt-5 text-xs">
          {[
            [t('guestJourney.questionnaire.mc_label'), String(ASSESSMENT_MC_COUNT)],
            [t('guestJourney.questionnaire.open_label'), String(ASSESSMENT_OPEN_COUNT)],
            [t('guestJourney.questionnaire.duration_label'), t('guestJourney.questionnaire.duration_value', shape)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-t border-[hsl(var(--xs-line))] py-3.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="min-w-0">
        {/* Header line: title at the left, the shape of the questionnaire at the right. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.8px] text-foreground sm:text-[26px] sm:tracking-[-1px]">
            {t('guestJourney.questionnaire.title')}
          </h1>
          <p className="text-xs text-muted-foreground sm:max-w-[300px] sm:text-right">
            {t('guestJourney.questionnaire.meta_shape', shape)}
            <br />
            {t('guestJourney.questionnaire.meta_minutes', shape)}
          </p>
        </div>

        {/* Progress: the slim bar stays on every size. */}
        <div className="my-5 sm:my-6" aria-label={t('assessment.question')}>
          <div className="mb-2.5 flex items-center justify-between text-xs">
            <strong className="font-semibold text-foreground">
              {t('assessment.question')} {currentQuestion + 1} {t('assessment.of')} {totalQuestions}
            </strong>
            <span className="text-muted-foreground">{t('guestJourney.questionnaire.previous_count', { count: currentQuestion })}</span>
          </div>
          <div
            className="h-1 bg-[hsl(var(--xs-line))]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
            aria-valuenow={currentQuestion}
          >
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }} />
          </div>
        </div>

        {/* Start of the questionnaire: confirms the CV step (when there was one)
            and says what is ahead. This replaces a separate "baseline complete"
            screen that cost a click and read as if everything was done. */}
        {currentQuestion === 0 && (
          <div className="mb-4 border-l-[3px] border-primary pl-4 text-[13px] text-muted-foreground">
            {cvAnalysed && (
              <p className="mb-0.5 flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 size={14} className="shrink-0" />
                {t('assessment.intro_cv_done')}
              </p>
            )}
            <p>{t('assessment.intro_whats_next', shape)}</p>
          </div>
        )}

        {/* The question in one panel; the example opens beside it on desktop
            (without pushing the question down) and right under the toggle on
            narrow screens. */}
        <Panel className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-x-8">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:col-start-1 lg:row-start-1">
            <span className="xs-eyebrow min-w-0 break-words">
              {currentMultipleChoice
                ? categoryLabel
                : t('guestJourney.questionnaire.open_tag', { n: currentQuestion - questions.length + 1, total: ASSESSMENT_OPEN_COUNT })}
            </span>
            <QuestionExampleToggle open={exampleOpen} onToggle={() => setExampleOpen((o) => !o)} panelId={examplePanelId} className="shrink-0" />
          </div>

          {exampleOpen && (
            <QuestionExamplePanel
              id={examplePanelId}
              {...exampleContent}
              onClose={() => setExampleOpen(false)}
              className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            />
          )}

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {currentMultipleChoice && (
              <div>
                <h2 className="text-[22px] font-medium leading-[1.4] tracking-[-0.5px] text-foreground sm:text-[26px] sm:tracking-[-0.7px]">
                  {t(`${baseKey}.questions.${currentMultipleChoice.key}.question`)}
                </h2>
                <p className="mb-6 mt-2.5 text-[13px] text-muted-foreground">{t('guestJourney.questionnaire.mc_hint')}</p>

                <div role="radiogroup" aria-label={t(`${baseKey}.questions.${currentMultipleChoice.key}.question`)} className="grid gap-2.5">
                  {Array.from({ length: 4 }, (_, index) => {
                    const selected = answers[currentMultipleChoice.id] === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => handleAnswerSelect(currentMultipleChoice.id, index)}
                        className={cn(
                          'flex w-full items-center gap-3.5 rounded-lg border bg-card px-4 py-4 text-left text-sm leading-[1.55] transition-colors',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                          selected
                            ? 'border-primary bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]'
                            : 'border-[hsl(var(--xs-line))] hover:border-primary/60 hover:bg-primary/[0.03]',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2',
                            selected ? 'border-primary' : 'border-muted-foreground/40',
                          )}
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        <span className="w-4 shrink-0 text-[11px] font-semibold text-muted-foreground" aria-hidden>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="min-w-0 flex-1 text-foreground">
                          {t(`${baseKey}.questions.${currentMultipleChoice.key}.options.${index}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {footer}
              </div>
            )}

            {currentOpenQuestion && (
              <div>
                <h2 className="text-[22px] font-medium leading-[1.4] tracking-[-0.5px] text-foreground sm:text-[26px] sm:tracking-[-0.7px]">
                  {t(`${baseKey}.questions.${currentOpenQuestion.key}.question`)}
                </h2>
                <p className="mt-2.5 text-[13px] text-muted-foreground">
                  {t('guestJourney.questionnaire.open_hint', { count: OPEN_ANSWER_MIN_CHARS })}
                </p>

                <label htmlFor={`open-answer-${currentOpenQuestion.id}`} className="mb-2.5 mt-6 block text-[13px] font-semibold text-foreground">
                  {t('guestJourney.questionnaire.open_field_label')}
                </label>
                {/* The shared Textarea is styled for dark surfaces (10% white
                    border), which vanished on the light theme. Give this one a
                    border that reads on both. */}
                <Textarea
                  id={`open-answer-${currentOpenQuestion.id}`}
                  aria-describedby={`open-answer-${currentOpenQuestion.id}-count`}
                  placeholder={t('assessment.placeholder')}
                  value={openAnswers[currentOpenQuestion.id] || ''}
                  onChange={(e) => handleOpenAnswerChange(currentOpenQuestion.id, e.target.value)}
                  className="min-h-[220px] resize-y rounded-lg border border-foreground/30 bg-background p-5 text-[15px] leading-[1.7] placeholder:text-muted-foreground"
                />
                <div
                  id={`open-answer-${currentOpenQuestion.id}-count`}
                  className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  <span className={isOpenAnswerLongEnough(currentOpenQuestion.id) ? 'text-green-700 dark:text-green-400' : undefined}>
                    {isOpenAnswerLongEnough(currentOpenQuestion.id)
                      ? t('assessment.open_min_reached')
                      : t('assessment.open_min_required', { count: OPEN_ANSWER_MIN_CHARS })}
                  </span>
                  <span
                    role="status"
                    className={cn('tabular-nums font-medium', isOpenAnswerLongEnough(currentOpenQuestion.id) && 'text-green-700 dark:text-green-400')}
                  >
                    {t('guestJourney.questionnaire.counter', { count: openAnswerLength(currentOpenQuestion.id), min: OPEN_ANSWER_MIN_CHARS })}
                  </span>
                </div>
                {isLast && shortEarlierOpenAnswerIndex !== -1 && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {t('assessment.open_earlier_too_short', {
                      number: shortEarlierOpenAnswerIndex + 1,
                      count: OPEN_ANSWER_MIN_CHARS,
                    })}
                  </p>
                )}
                {footer}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default XimatarAssessment;
