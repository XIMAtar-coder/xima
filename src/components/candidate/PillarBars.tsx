import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { cn } from '@/lib/utils';

/**
 * The five pillars as horizontal bars on a 0–10 scale, from the candidate
 * redesign. Replaces the radar chart: the numbers are readable and the bars
 * compare at a glance.
 */
export type PillarKey = 'drive' | 'computational_power' | 'communication' | 'creativity' | 'knowledge';

export const PILLAR_ORDER: PillarKey[] = ['drive', 'computational_power', 'communication', 'creativity', 'knowledge'];

export type PillarScores = Partial<Record<PillarKey, number>> & { computational?: number };

export const readPillar = (scores: PillarScores | null | undefined, key: PillarKey): number | null => {
  if (!scores) return null;
  const raw = key === 'computational_power' ? (scores.computational_power ?? scores.computational) : scores[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
};

/** 5.5 → "5,5" in it, "5.5" in en. */
export const formatScore = (value: number | null, lang: string): string =>
  value === null ? '—' : value.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const pillarName = (t: TFunction, key: PillarKey): string => {
  if (key === 'drive') return 'Drive';
  return t(`pillars.${key}.name`, key.replace('_', ' '));
};

interface PillarBarsProps {
  scores: PillarScores | null | undefined;
  /** Pillar to emphasise (e.g. the growth path target). */
  focus?: string | null;
  compact?: boolean;
  showAxis?: boolean;
  className?: string;
}

export const PillarBars: React.FC<PillarBarsProps> = ({ scores, focus, compact, showAxis = true, className }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className={cn(compact ? 'space-y-2.5' : 'space-y-3.5', className)}>
      {PILLAR_ORDER.map((key) => {
        const value = readPillar(scores, key);
        const pct = value === null ? 0 : Math.max(0, Math.min(100, value * 10));
        const isFocus = focus === key;
        return (
          <div key={key} className={cn('grid items-center gap-x-3 gap-y-1.5', compact ? 'grid-cols-[1fr_auto]' : 'grid-cols-[minmax(0,1fr)_auto]')}>
            <span className={cn('truncate text-[13px]', isFocus ? 'font-semibold text-foreground' : 'text-foreground')}>
              {pillarName(t, key)}
            </span>
            <strong className="xs-num text-[13px] font-mono font-medium text-foreground">{formatScore(value, i18n.language)}</strong>
            <div className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-[hsl(var(--xs-line))]" role="img" aria-label={`${pillarName(t, key)}: ${formatScore(value, i18n.language)} / 10`}>
              <div className={cn('h-full rounded-sm bg-primary transition-[width] duration-500', isFocus && 'bg-primary')} style={{ width: `${pct}%`, opacity: focus && !isFocus ? 0.55 : 1 }} />
            </div>
          </div>
        );
      })}
      {showAxis && (
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground" aria-hidden="true">
          <span>0</span><span>5</span><span>10</span>
        </div>
      )}
    </div>
  );
};

export default PillarBars;
