import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The three steps of the guest journey, in the two shapes the redesign uses:
 * a full bar with numbered bubbles on the CV step, and a one-line text nav
 * ("01 · Profilo iniziale / 02 · Questionario / 03 · Risultati") on the
 * questionnaire and results pages.
 */
export const JourneyBar: React.FC<{ current: number; className?: string }> = ({ current, className }) => {
  const { t } = useTranslation();
  const steps = [t('guestJourney.steps.cv'), t('guestJourney.steps.questionnaire'), t('guestJourney.steps.ximatar')];
  return (
    <ol className={cn('grid max-w-[780px] grid-cols-3', className)} aria-label={t('guestJourney.questionnaire.rail_title')}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-start gap-2 border-t-2 pt-3 text-xs sm:items-center sm:gap-3 sm:pt-4 sm:text-sm',
              active ? 'border-primary text-foreground' : done ? 'border-primary/40 text-foreground' : 'border-[hsl(var(--xs-line))] text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-medium sm:h-7 sm:w-7 sm:text-xs',
                active ? 'border-primary bg-primary text-white' : done ? 'border-primary text-primary' : 'border-[hsl(var(--xs-line))]',
              )}
            >
              {done ? <Check size={13} /> : n}
            </span>
            <span className="leading-snug">{label}</span>
          </li>
        );
      })}
    </ol>
  );
};

export const JourneyInline: React.FC<{ current: number; className?: string }> = ({ current, className }) => {
  const { t } = useTranslation();
  const steps = [
    t('guestJourney.steps_inline.profile'),
    t('guestJourney.steps_inline.questionnaire'),
    t('guestJourney.steps_inline.results'),
  ];
  return (
    <nav className={cn('flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground', className)} aria-label={t('guestJourney.questionnaire.rail_title')}>
      {steps.map((label, i) => {
        const active = i + 1 === current;
        return (
          <span key={label} aria-current={active ? 'step' : undefined} className={cn('whitespace-nowrap tabular-nums', active && 'font-semibold text-primary')}>
            {String(i + 1).padStart(2, '0')} · {label}
          </span>
        );
      })}
    </nav>
  );
};
