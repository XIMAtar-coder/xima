import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { log } from '@/lib/log';
import type { McAnswerV2, DriveAnswerV2 } from '@/lib/assessment/v2/model';
import type { PauseResult, PauseResults, PauseSlot } from '@/lib/pauses/model';

const STORAGE_KEY = 'xima.ximatarJourney.v1';

interface JourneyState {
  step: number; // 1 = baseline, 2 = assessment, 3 = results
  questionIndex: number; // within assessment (0-based)
  mcAnswers: Record<number, number>; // multiple choice answers
  openAnswers: Record<string, string>; // open question answers
  // Assessment 2.0 (four answers = four pillars, Drive apart): the chosen
  // pillar with its intensity per question, the Drive choices, and the
  // per-question option order so a resumed session shows the same order.
  v2: {
    mc: Record<number, McAnswerV2>;
    drive: Record<number, DriveAnswerV2>;
    order: Record<number, number[]>;
    /** The four work-sample pauses, done or skipped. */
    pauses: PauseResults;
  };
  baselineCompleted: boolean;
  cvUploaded: boolean;
  completed: boolean;
  startedAt: string;
}

const defaultState: JourneyState = {
  step: 1,
  questionIndex: 0,
  mcAnswers: {},
  openAnswers: {},
  v2: { mc: {}, drive: {}, order: {}, pauses: {} },
  baselineCompleted: false,
  cvUploaded: false,
  completed: false,
  startedAt: new Date().toISOString(),
};

export function useXimatarJourneyState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<JourneyState>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as JourneyState;
        if (!parsed.completed) {
          const v2 = (parsed.v2 ?? {}) as Partial<JourneyState['v2']>;
          return { ...parsed, v2: { mc: v2.mc ?? {}, drive: v2.drive ?? {}, order: v2.order ?? {}, pauses: v2.pauses ?? {} } };
        }
      } catch (e) {
        log.warn('Failed to parse journey state:', e);
      }
    }
    return defaultState;
  });

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);

  // Check if we should show resume modal
  useEffect(() => {
    if (hasCheckedResume) return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as JourneyState;
        if (!parsed.completed && (parsed.step > 1 || parsed.questionIndex > 0 || Object.keys(parsed.mcAnswers).length > 0)) {
          // Has saved progress, check URL
          const urlStep = searchParams.get('step');
          const urlQ = searchParams.get('q');
          if (!urlStep && !urlQ) {
            // No URL params, show resume modal
            setShowResumeModal(true);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    setHasCheckedResume(true);
  }, [hasCheckedResume, searchParams]);

  // Sync URL params on mount and when they change
  useEffect(() => {
    const urlStep = searchParams.get('step');
    const urlQ = searchParams.get('q');
    
    if (urlStep) {
      const stepNum = parseInt(urlStep, 10);
      if (stepNum >= 1 && stepNum <= 3 && stepNum !== state.step) {
        setState(prev => ({ ...prev, step: stepNum }));
      }
    }
    
    if (urlQ) {
      const qNum = parseInt(urlQ, 10);
      if (qNum >= 0 && qNum !== state.questionIndex) {
        setState(prev => ({ ...prev, questionIndex: qNum }));
      }
    }
  }, [searchParams]);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (!state.completed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Update URL when step/question changes
  const updateUrl = useCallback((step: number, questionIndex?: number) => {
    const params = new URLSearchParams();
    params.set('step', String(step));
    if (step === 2 && questionIndex !== undefined) {
      params.set('q', String(questionIndex));
    }
    setSearchParams(params, { replace: false });
  }, [setSearchParams]);

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
    updateUrl(step, step === 2 ? state.questionIndex : undefined);
  }, [updateUrl, state.questionIndex]);

  const setQuestionIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, questionIndex: index }));
    updateUrl(state.step, index);
  }, [updateUrl, state.step]);

  const setMcAnswer = useCallback((questionId: number, answerIndex: number) => {
    setState(prev => ({
      ...prev,
      mcAnswers: { ...prev.mcAnswers, [questionId]: answerIndex }
    }));
  }, []);

  const setOpenAnswer = useCallback((questionId: string, answer: string) => {
    setState(prev => ({
      ...prev,
      openAnswers: { ...prev.openAnswers, [questionId]: answer }
    }));
  }, []);

  const setV2McAnswer = useCallback((questionId: number, answer: McAnswerV2) => {
    setState(prev => ({ ...prev, v2: { ...prev.v2, mc: { ...prev.v2.mc, [questionId]: answer } } }));
  }, []);

  const setV2DriveAnswer = useCallback((driveId: number, answer: DriveAnswerV2) => {
    setState(prev => ({ ...prev, v2: { ...prev.v2, drive: { ...prev.v2.drive, [driveId]: answer } } }));
  }, []);

  const setV2Order = useCallback((questionId: number, order: number[]) => {
    setState(prev => ({ ...prev, v2: { ...prev.v2, order: { ...prev.v2.order, [questionId]: order } } }));
  }, []);

  const setV2Pause = useCallback((kind: PauseSlot, result: PauseResult) => {
    setState(prev => ({ ...prev, v2: { ...prev.v2, pauses: { ...prev.v2.pauses, [kind]: result } } }));
  }, []);

  const setBaselineCompleted = useCallback((completed: boolean) => {
    setState(prev => ({ ...prev, baselineCompleted: completed }));
  }, []);

  const setCvUploaded = useCallback((uploaded: boolean) => {
    setState(prev => ({ ...prev, cvUploaded: uploaded }));
  }, []);

  const goToNextQuestion = useCallback((totalQuestions: number) => {
    if (state.questionIndex < totalQuestions - 1) {
      const next = state.questionIndex + 1;
      setState(prev => ({ ...prev, questionIndex: next }));
      updateUrl(state.step, next);
    }
  }, [state.questionIndex, state.step, updateUrl]);

  const goToPrevQuestion = useCallback(() => {
    if (state.questionIndex > 0) {
      const prev = state.questionIndex - 1;
      setState(p => ({ ...p, questionIndex: prev }));
      updateUrl(state.step, prev);
    }
  }, [state.questionIndex, state.step, updateUrl]);

  const completeJourney = useCallback(() => {
    setState(prev => ({ ...prev, completed: true }));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const resetJourney = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...defaultState, startedAt: new Date().toISOString() });
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const resumeJourney = useCallback(() => {
    setShowResumeModal(false);
    updateUrl(state.step, state.step === 2 ? state.questionIndex : undefined);
  }, [state.step, state.questionIndex, updateUrl]);

  const startFresh = useCallback(() => {
    resetJourney();
    setShowResumeModal(false);
  }, [resetJourney]);

  return {
    // State
    step: state.step,
    questionIndex: state.questionIndex,
    mcAnswers: state.mcAnswers,
    openAnswers: state.openAnswers,
    v2: state.v2,
    baselineCompleted: state.baselineCompleted,
    cvUploaded: state.cvUploaded,
    completed: state.completed,
    showResumeModal,
    
    // Actions
    setStep,
    setQuestionIndex,
    setMcAnswer,
    setOpenAnswer,
    setV2McAnswer,
    setV2DriveAnswer,
    setV2Order,
    setV2Pause,
    setBaselineCompleted,
    setCvUploaded,
    goToNextQuestion,
    goToPrevQuestion,
    completeJourney,
    resetJourney,
    resumeJourney,
    startFresh,
    setShowResumeModal,
  };
}
