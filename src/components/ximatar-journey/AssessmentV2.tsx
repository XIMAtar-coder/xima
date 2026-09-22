import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eyebrow, Panel } from '@/components/layout/PageHeader';
import { ReadAloudButton } from '@/components/candidate/audio/ReadAloudButton';
import { SpeakAnswerButton } from '@/components/candidate/audio/SpeakAnswerButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { scoreOpenResponse } from '@/lib/scoring/openResponse';
import { selectArchetypeFromAssessmentPillars } from '@/lib/ximatarTaxonomy';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';
import { OPEN_ANSWER_MIN_CHARS } from './assessmentShape';
import { V2_CONTENT } from '@/lib/assessment/v2/content.generated';
import {
  CONTENT_PILLARS, DRIVE_AFTER_QUESTION, INTENSITY_DEFAULT, V2_MC_COUNT, V2_DRIVE_COUNT,
  computeScoresV2, weakestContentPillar,
  type AnswersV2, type ContentPillar, type DriveAnswerV2, type Intensity, type McAnswerV2, type V2Field,
} from '@/lib/assessment/v2/model';
import { pauseAfter, type PauseKind, type PauseResult, type PauseResults } from '@/lib/pauses/model';
import { PauseDone } from '@/components/pauses/PauseShell';
import { VanPause } from '@/components/pauses/VanPause';
import { HandoverPause } from '@/components/pauses/HandoverPause';
import { StockPause } from '@/components/pauses/StockPause';
import { YardPause } from '@/components/pauses/YardPause';

/**
 * The 2.0 questionnaire: 21 scenarios with one answer per content pillar,
 * five Drive scenarios (four interleaved, one adaptive on the weakest pillar)
 * and two written answers. Options are shuffled once per person and the
 * order is kept in the journey state, so resuming shows the same screen.
 */

type FlowItem =
  | { kind: 'mc'; q: number }
  | { kind: 'drive'; d: number; pillar?: ContentPillar }   // pillar known for 1-4; 5 is adaptive
  | { kind: 'open'; key: 'open1' | 'open2' }
  | { kind: 'pause'; pause: PauseKind };   // a work-sample break, after the Drive scenario at 5/10/15/20

const buildFlow = (): FlowItem[] => {
  const flow: FlowItem[] = [];
  for (let q = 1; q <= V2_MC_COUNT; q += 1) {
    flow.push({ kind: 'mc', q });
    const at = (DRIVE_AFTER_QUESTION as readonly number[]).indexOf(q);
    if (at >= 0) flow.push({ kind: 'drive', d: at + 1 });
    const pause = pauseAfter(q);
    if (pause) flow.push({ kind: 'pause', pause });
  }
  flow.push({ kind: 'drive', d: V2_DRIVE_COUNT });
  flow.push({ kind: 'open', key: 'open1' });
  flow.push({ kind: 'open', key: 'open2' });
  return flow;
};

const shuffle4 = (): number[] => {
  const a = [0, 1, 2, 3];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Props {
  fieldKey: V2Field;
  onComplete: (step: number) => void;
  onGoBack: () => void;
  cvAnalysed: boolean;
  questionIndex: number;
  onQuestionChange: (index: number) => void;
  v2: AnswersV2 & { order: Record<number, number[]>; pauses: PauseResults };
  openAnswers: Record<string, string>;
  onMcAnswer: (q: number, a: McAnswerV2) => void;
  onDriveAnswer: (d: number, a: DriveAnswerV2) => void;
  onOrder: (q: number, order: number[]) => void;
  onOpenAnswerChange: (key: string, value: string) => void;
  onPause: (kind: PauseKind, result: PauseResult) => void;
}

const AssessmentV2: React.FC<Props> = ({
  fieldKey, onComplete, onGoBack, questionIndex, onQuestionChange,
  v2, openAnswers, onMcAnswer, onDriveAnswer, onOrder, onOpenAnswerChange, onPause,
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const flow = useMemo(buildFlow, []);
  const base = `assessmentV2.${fieldKey}`;
  const content = V2_CONTENT[fieldKey];
  const index = Math.min(Math.max(questionIndex, 0), flow.length - 1);
  const item = flow[index];
  const answers: AnswersV2 = { mc: v2.mc, drive: v2.drive };

  // Each question gets its option order the first time it is shown.
  useEffect(() => {
    if (item.kind === 'mc' && !v2.order[item.q]) onOrder(item.q, shuffle4());
  }, [item, v2.order, onOrder]);

  const drivePillar = (d: number): ContentPillar =>
    d <= 4 ? content.drivePillars[d - 1] : weakestContentPillar(answers);

  const isAnswered = (it: FlowItem): boolean => {
    if (it.kind === 'mc') return Boolean(v2.mc[it.q]);
    if (it.kind === 'drive') return Boolean(v2.drive[it.d]);
    if (it.kind === 'pause') return Boolean(v2.pauses[it.pause]);
    return (openAnswers[it.key] || '').trim().length >= OPEN_ANSWER_MIN_CHARS;
  };
  const canContinue = isAnswered(item);
  const isLast = index === flow.length - 1;
  const answeredCount = flow.filter(isAnswered).length;
  // The pauses are breaks, not questions: the progress counts questions only.
  const questions = flow.filter((it) => it.kind !== 'pause');
  const questionNumber = flow.slice(0, index + 1).filter((it) => it.kind !== 'pause').length;
  const questionsAnswered = questions.filter(isAnswered).length;
  const questionsLeft = flow.slice(index + 1).filter((it) => it.kind !== 'pause').length;

  // What "Listen" reads out.
  const spoken = (() => {
    if (item.kind === 'mc') {
      const order = v2.order[item.q] ?? [0, 1, 2, 3];
      const q = t(`${base}.questions.q${item.q}.question`);
      return [q, ...order.map((ci, i) =>
        `${t('assessment.option_spoken', { letter: String.fromCharCode(65 + i), defaultValue: 'Answer {{letter}}' })}: ${t(`${base}.questions.q${item.q}.options.${ci}`)}`)].join('. ');
    }
    if (item.kind === 'drive') {
      const k = item.d <= 4 ? `${base}.drive.${item.d - 1}` : `${base}.driveFinal.${drivePillar(5)}`;
      return [t(`${k}.question`), `A: ${t(`${k}.comfort`)}`, `B: ${t(`${k}.stretch`)}`].join('. ');
    }
    if (item.kind === 'pause') return '';
    return t(`${base}.${item.key}`);
  })();

  const go = (next: number) => onQuestionChange(Math.min(Math.max(next, 0), flow.length - 1));

  const finish = async () => {
    setSubmitting(true);
    const scores = computeScoresV2(answers);
    const derived = selectArchetypeFromAssessmentPillars(scores);
    const language = ((i18n.language || 'en').split('-')[0] as 'it' | 'en' | 'es');
    try {
      if (!isAuthenticated || !user) {
        // Guest: the same keys the v1 flow leaves for the results page and
        // for the sync after registration.
        sessionStorage.setItem('guest_assessment_data', JSON.stringify({
          version: '2.0', field: fieldKey, answers: v2.mc, drive: v2.drive, openAnswers, pauses: v2.pauses,
          timestamp: new Date().toISOString(),
        }));
        sessionStorage.setItem('guest_pillar_scores', JSON.stringify(scores));
        sessionStorage.setItem('guest_ximatar', derived.label);
        sessionStorage.setItem('guest_ximatar_name', derived.name);
        sessionStorage.setItem('guest_drive_level', derived.driveLevel);
        sessionStorage.setItem('guest_strongest_pillar', derived.strongest);
        sessionStorage.setItem('guest_weakest_pillar', derived.weakest);
        sessionStorage.setItem('guest_ximatar_storytelling', t('ximatar_intro.storytelling'));
        sessionStorage.setItem('guest_ximatar_growth_path', t(`ximatar_intro.drive_paths.${derived.driveLevel}_desc`));
        toast({ title: t('assessment.guest_complete') });
        setTimeout(() => onComplete(2), 400);
        return;
      }

      const attemptId = crypto.randomUUID();

      // Written answers, scored as in v1 (AI first, local rubric as fallback).
      const openRows = await Promise.all((['open1', 'open2'] as const).map(async (openKey) => {
        const answer = openAnswers[openKey] || '';
        const { data: ai, error } = await supabase.functions.invoke('analyze-open-answer', {
          body: { text: answer, field: fieldKey, language, openKey },
        });
        if (error || !ai?.score_breakdown) {
          const r = scoreOpenResponse({ text: answer, field: fieldKey, language, openKey });
          return { user_id: user.id, attempt_id: attemptId, field_key: fieldKey, language, open_key: openKey, answer, score: r.total, rubric: r };
        }
        const rubric = {
          length: ai.score_breakdown.length, relevance: ai.score_breakdown.relevance, structure: ai.score_breakdown.structure,
          specificity: ai.score_breakdown.specificity, action: ai.score_breakdown.action, total: ai.score_total,
          steveJobsExplanation: ai.steve_jobs_explanation, improvementSuggestions: ai.improvement_suggestions,
        };
        return { user_id: user.id, attempt_id: attemptId, field_key: fieldKey, language, open_key: openKey, answer: ai.cleaned_text || answer, score: rubric.total, rubric };
      }));
      const { error: openError } = await supabase.from('assessment_open_responses').insert(openRows as never[]);
      if (openError) log.warn('[v2] open responses not stored', openError);

      const { data: result, error: resultError } = await supabase
        .from('assessment_results')
        .insert({ user_id: user.id, attempt_id: attemptId, field_key: fieldKey, language, completed: false, rationale: { version: '2.0', pauses: v2.pauses } } as never)
        .select()
        .single();
      if (resultError) throw resultError;

      // One row per question per pillar: the chosen pillar carries the
      // intensity, the other three carry zero. The database then normalises
      // every pillar over all 21 questions, as the model says, and Drive over
      // its five scenarios.
      const rows: { result_id: string; question_id: number; answer_value: number; pillar: string; weight: number }[] = [];
      for (let q = 1; q <= V2_MC_COUNT; q += 1) {
        const a = v2.mc[q];
        for (const p of CONTENT_PILLARS) {
          rows.push({ result_id: result.id, question_id: q, answer_value: a && a.pillar === p ? a.intensity : 0, pillar: p, weight: 1 });
        }
      }
      for (let d = 1; d <= V2_DRIVE_COUNT; d += 1) {
        const a = v2.drive[d];
        rows.push({ result_id: result.id, question_id: 100 + d, answer_value: a && a.stretch ? a.intensity : 0, pillar: 'drive', weight: 1 });
      }
      const { error: answersError } = await supabase.from('assessment_answers').insert(rows as never[]);
      if (answersError) throw answersError;

      const { error: completeError } = await supabase.from('assessment_results').update({ completed: true }).eq('id', result.id);
      if (completeError) throw completeError;

      // The trigger computes the pillars and assigns the animal; wait for it.
      let ready = false;
      for (let i = 0; i < 15 && !ready; i += 1) {
        await new Promise((r) => setTimeout(r, 800));
        const { data } = await supabase.from('assessment_results').select('ximatar_id').eq('id', result.id).single();
        ready = Boolean(data?.ximatar_id);
      }
      if (!ready) toast({ title: t('assessment.computing') });
      localStorage.setItem('current_result_id', result.id);
      localStorage.setItem('current_attempt_id', attemptId);
      setTimeout(() => onComplete(2), 400);
    } catch (err) {
      log.error('[v2] submit failed', err);
      toast({ title: t('common.error'), variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const IntensityDots: React.FC<{ value: Intensity; onChange: (v: Intensity) => void }> = ({ value, onChange }) => (
    <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px] text-[12.5px] text-muted-foreground">
      <span>{t('assessment.v2_intensity_prompt', 'How much is this like you?')}</span>
      <span className="flex gap-1.5" role="radiogroup" aria-label={t('assessment.v2_intensity_prompt', 'How much is this like you?')}>
        {([1, 2, 3] as Intensity[]).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={(e) => { e.stopPropagation(); onChange(v); }}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
              value === v ? 'border-primary bg-primary text-white' : 'border-[hsl(var(--xs-line))] bg-card text-muted-foreground hover:border-primary/50',
            )}
          >
            {t(`assessment.v2_intensity_${v}`)}
          </button>
        ))}
      </span>
    </div>
  );

  const Choice: React.FC<{ letter: string; text: string; selected: boolean; onSelect: () => void; children?: React.ReactNode }> = ({ letter, text, selected, onSelect, children }) => (
    <div
      className={cn(
        'rounded-lg border bg-card transition-colors',
        selected ? 'border-primary bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'border-[hsl(var(--xs-line))] hover:border-primary/60',
      )}
    >
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="flex w-full items-center gap-3.5 px-4 py-4 text-left text-sm leading-[1.55]">
        <span aria-hidden className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-muted-foreground/40')}>
          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="w-4 shrink-0 text-[11px] font-semibold text-muted-foreground" aria-hidden>{letter}</span>
        <span className="min-w-0 flex-1 text-foreground">{text}</span>
      </button>
      {selected && children && <div className="pb-3">{children}</div>}
    </div>
  );

  const footer = (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-5">
      <Button variant="ghost" onClick={() => (index === 0 ? onGoBack() : go(index - 1))} disabled={submitting}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        {t('common.previous', 'Back')}
      </Button>
      {isLast ? (
        <Button onClick={finish} disabled={!canContinue || answeredCount < flow.length || submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />}
          {t('assessment.finish', 'Finish')}
        </Button>
      ) : (
        <Button onClick={() => go(index + 1)} disabled={!canContinue}>
          {t('common.next', 'Next')}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground sm:text-[26px]">{t(`${base}.title`)}</h1>
        <p className="font-mono text-[12px] tabular-nums text-muted-foreground">
          {t('assessment.v2_progress', { n: questionNumber, total: questions.length, defaultValue: '{{n}} of {{total}}' })}
        </p>
      </div>
      <div className={cn('mb-6 h-1 w-full overflow-hidden rounded-full bg-[hsl(var(--xs-line))] transition-opacity', item.kind === 'pause' && 'opacity-30')} role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={questionsAnswered}>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${(questionsAnswered / questions.length) * 100}%` }} />
      </div>

      <Panel className="p-5 sm:p-8">
        {item.kind === 'pause' && (() => {
          const kind = item.pause;
          const done = (r: PauseResult) => { onPause(kind, r); go(index + 1); };
          const skip = () => done({ kind, skipped: true });
          if (v2.pauses[kind]) {
            return <PauseDone field={fieldKey} kind={kind} remaining={questionsLeft} onContinue={() => go(index + 1)} onBack={() => go(index - 1)} />;
          }
          const props = { field: fieldKey, onSkip: skip };
          if (kind === 'van') return <VanPause {...props} onDone={done} />;
          if (kind === 'handover') return <HandoverPause {...props} onDone={done} />;
          if (kind === 'stock') return <StockPause {...props} onDone={done} />;
          return <YardPause {...props} onDone={done} />;
        })()}

        {item.kind === 'mc' && (() => {
          const order = v2.order[item.q] ?? [0, 1, 2, 3];
          const current = v2.mc[item.q];
          return (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>{t('assessment.v2_scenario', { n: item.q, defaultValue: 'Scenario {{n}}' })}</Eyebrow>
                <ReadAloudButton text={spoken} />
              </div>
              <h2 className="mt-3 text-[22px] font-medium leading-[1.4] tracking-[-0.5px] text-foreground sm:text-[26px]">
                {t(`${base}.questions.q${item.q}.question`)}
              </h2>
              <p className="mb-6 mt-2.5 text-[13px] text-muted-foreground">{t('assessment.v2_mc_hint')}</p>
              <div role="radiogroup" className="grid gap-2.5">
                {order.map((ci, i) => {
                  const pillar = content.pillars[item.q - 1][ci];
                  const selected = current?.pillar === pillar;
                  return (
                    <Choice
                      key={ci}
                      letter={String.fromCharCode(65 + i)}
                      text={t(`${base}.questions.q${item.q}.options.${ci}`)}
                      selected={selected}
                      onSelect={() => onMcAnswer(item.q, { pillar, intensity: current?.pillar === pillar ? current.intensity : INTENSITY_DEFAULT })}
                    >
                      <IntensityDots value={current?.intensity ?? INTENSITY_DEFAULT} onChange={(v) => onMcAnswer(item.q, { pillar, intensity: v })} />
                    </Choice>
                  );
                })}
              </div>
              {footer}
            </div>
          );
        })()}

        {item.kind === 'drive' && (() => {
          const pillar = drivePillar(item.d);
          const k = item.d <= 4 ? `${base}.drive.${item.d - 1}` : `${base}.driveFinal.${pillar}`;
          const current = v2.drive[item.d];
          const pick = (stretch: boolean) =>
            onDriveAnswer(item.d, { stretch, intensity: current?.stretch === stretch ? current.intensity : INTENSITY_DEFAULT });
          return (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>{item.d === 5 ? t('assessment.v2_final_drive_tag') : t('assessment.v2_drive_tag')}</Eyebrow>
                <ReadAloudButton text={spoken} />
              </div>
              <h2 className="mt-3 text-[22px] font-medium leading-[1.4] tracking-[-0.5px] text-foreground sm:text-[26px]">{t(`${k}.question`)}</h2>
              <p className="mb-6 mt-2.5 text-[13px] text-muted-foreground">{t('assessment.v2_drive_hint')}</p>
              <div role="radiogroup" className="grid gap-2.5">
                {([false, true] as const).map((stretch, i) => (
                  <Choice
                    key={String(stretch)}
                    letter={String.fromCharCode(65 + i)}
                    text={t(`${k}.${stretch ? 'stretch' : 'comfort'}`)}
                    selected={current?.stretch === stretch}
                    onSelect={() => pick(stretch)}
                  >
                    <IntensityDots value={current?.intensity ?? INTENSITY_DEFAULT} onChange={(v) => onDriveAnswer(item.d, { stretch, intensity: v })} />
                  </Choice>
                ))}
              </div>
              {footer}
            </div>
          );
        })()}

        {item.kind === 'open' && (() => {
          const value = openAnswers[item.key] || '';
          const ok = value.trim().length >= OPEN_ANSWER_MIN_CHARS;
          const n = item.key === 'open1' ? 1 : 2;
          return (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>{t('guestJourney.questionnaire.open_tag', { n, total: 2 })}</Eyebrow>
                <ReadAloudButton text={spoken} />
              </div>
              <h2 className="mt-3 text-[22px] font-medium leading-[1.4] tracking-[-0.5px] text-foreground sm:text-[26px]">{t(`${base}.${item.key}`)}</h2>
              <p className="mt-2.5 text-[13px] text-muted-foreground">{t('guestJourney.questionnaire.open_hint', { count: OPEN_ANSWER_MIN_CHARS })}</p>
              <div className="mb-2.5 mt-6 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`v2-${item.key}`} className="text-[13px] font-semibold text-foreground">{t('guestJourney.questionnaire.open_field_label')}</label>
                <SpeakAnswerButton onAppend={(s) => onOpenAnswerChange(item.key, value ? `${value} ${s}` : s)} />
              </div>
              <Textarea
                id={`v2-${item.key}`}
                value={value}
                onChange={(e) => onOpenAnswerChange(item.key, e.target.value)}
                placeholder={t('assessment.placeholder')}
                className="min-h-[220px] resize-y rounded-lg border border-foreground/30 bg-background p-5 text-[15px] leading-[1.7]"
              />
              <p className={cn('mt-2.5 text-xs', ok ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')} aria-live="polite">
                {ok ? t('assessment.open_min_reached') : t('assessment.open_min_required', { count: OPEN_ANSWER_MIN_CHARS })}
                {' · '}
                <span className="tabular-nums">{t('guestJourney.questionnaire.counter', { count: value.trim().length, min: OPEN_ANSWER_MIN_CHARS })}</span>
              </p>
              {footer}
            </div>
          );
        })()}
      </Panel>
    </div>
  );
};

export default AssessmentV2;
