import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadAloudButton } from '@/components/candidate/audio/ReadAloudButton';
import { cn } from '@/lib/utils';
import type { V2Field } from '@/lib/assessment/v2/model';
import type { PauseKind } from '@/lib/pauses/model';

/**
 * The frame every pause shares: the "pause" chip, the human line, the title,
 * the voice, the calm footer with "skip" and the one action. The questionnaire
 * progress is dimmed by the caller; here nothing counts down and nothing is
 * graded.
 */

export const fieldBase = (field: V2Field, kind: PauseKind) => `pauses.fields.${field}.${kind}`;

interface Props {
  field: V2Field;
  kind: PauseKind;
  /** Extra text the voice reads after the lead (instructions, labels). */
  spoken?: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  onSkip: () => void;
  /** A short amber note under the content (a constraint not met). */
  note?: string | null;
  children: React.ReactNode;
}

export const PauseShell: React.FC<Props> = ({ field, kind, spoken, primaryLabel, primaryDisabled, onPrimary, onSkip, note, children }) => {
  const { t } = useTranslation();
  const b = fieldBase(field, kind);
  const lead = t(`${b}.lead`);
  const sub = t(`${b}.sub`);
  const voice = [t(`${b}.title`), lead, sub, spoken].filter(Boolean).join('. ');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
          <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
          {t('pauses.common.chip')}
        </span>
        <ReadAloudButton text={voice} />
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">{t('pauses.common.breathe')}</p>
      <h2 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.5px] text-foreground sm:text-[28px]">{t(`${b}.title`)}</h2>
      <p className="mt-2 text-[15px] leading-[1.5] text-foreground">{lead}</p>
      <p className="text-[13.5px] text-muted-foreground">{sub}</p>

      <div className="mt-5 select-none">{children}</div>

      {note && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-[#c98a1a]/50 bg-[#fff4dd] px-3 py-2 text-[13px] text-[#7a5200] dark:bg-[#c98a1a]/15 dark:text-[#f0c877]">
          <span aria-hidden className="mt-[3px] inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-[#c98a1a]" />
          {note}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-4">
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-muted-foreground">{t('pauses.common.calm')}</span>
          <button type="button" onClick={onSkip} className="text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {t('pauses.common.skip')}
          </button>
        </div>
        <Button onClick={onPrimary} disabled={primaryDisabled}>
          {primaryLabel}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

/** What the person sees after the pause: no grade, a human line, back to the questions. */
export const PauseDone: React.FC<{ field: V2Field; kind: string; title?: string; remaining: number; continueLabel?: string; busy?: boolean; onContinue: () => void; onBack?: () => void }> = ({ field, kind, title, remaining, continueLabel, busy, onContinue, onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
      </div>
      <h2 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground">{title ?? t(`pauses.fields.${field}.done_title`)}</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-[1.55] text-muted-foreground">{t('pauses.common.done_text')}</p>
      {remaining > 0 && <p className="mt-4 text-[14px] text-foreground">{t('pauses.common.back_to_questions', { count: remaining })}</p>}
      <div className={cn('mt-5 flex items-center justify-center gap-3')}>
        {onBack && <Button variant="ghost" onClick={onBack} disabled={busy}>{t('common.previous', 'Back')}</Button>}
        <Button onClick={onContinue} disabled={busy}>{continueLabel ?? t('pauses.common.continue')}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
      </div>
      <p className="sr-only">{kind}</p>
    </div>
  );
};

export default PauseShell;
