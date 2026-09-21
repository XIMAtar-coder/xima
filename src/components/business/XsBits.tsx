import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PILLAR_KEYS, readPillar } from '@/lib/pillarKeys';

/**
 * Small pieces shared by the restyled company pages (dashboard, shortlist,
 * challenge creation): the chip and the five-pillar bars from the mockups.
 */

export const Chip: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'status' | 'blue' }> = ({ tone = 'neutral', className, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-2 py-1 text-[11px] font-medium leading-none',
      tone === 'neutral' && 'border-[hsl(var(--xs-line))] bg-card text-foreground',
      tone === 'status' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
      tone === 'blue' && 'border-primary/30 bg-primary/10 text-primary',
      className,
    )}
    {...props}
  >
    {tone === 'status' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />}
    {children}
  </span>
);

interface PillarBarsProps {
  scores: Record<string, unknown> | null | undefined;
  /** Company profile to draw as a tick on each track. */
  reference?: Record<string, unknown> | null;
  /** Label under the bars: shown as "— = not available" only when a value is missing. */
  unavailableLabel?: string;
  showAxis?: boolean;
  className?: string;
}

/** Five horizontal bars, 0-100, with the number on the right (dashboard and shortlist detail). */
export const PillarBars: React.FC<PillarBarsProps> = ({ scores, reference, showAxis = false, className }) => {
  const { t } = useTranslation();
  return (
    <div className={cn('space-y-3', className)} aria-label={t('businessPortal.pillars_aria', 'Five pillars, values out of 100')}>
      {PILLAR_KEYS.map((key) => {
        const value = readPillar(scores, key);
        const ref = reference ? readPillar(reference, key) : null;
        return (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-xs sm:grid-cols-[150px_minmax(0,1fr)_28px]">
            <span className="truncate text-foreground">{t(`shortlist.pillar.${key}`)}</span>
            <span className="text-right font-mono tabular-nums text-foreground sm:order-3">{value ?? '—'}</span>
            <div className="relative col-span-2 h-[5px] rounded-sm bg-[hsl(var(--xs-line))] sm:col-span-1 sm:order-2">
              <div className="h-full rounded-sm bg-primary" style={{ width: `${value ?? 0}%` }} />
              {ref != null && (
                <span
                  className="absolute -top-[3px] h-[11px] w-[2px] bg-foreground"
                  style={{ left: `calc(${ref}% - 1px)` }}
                  title={t('shortlist.company_reference', 'Company profile: {{value}}', { value: ref })}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        );
      })}
      {showAxis && (
        <div className="hidden justify-between font-mono text-[10px] text-muted-foreground sm:flex sm:pl-[162px] sm:pr-10" aria-hidden="true">
          <span>0</span><span>50</span><span>100</span>
        </div>
      )}
    </div>
  );
};
