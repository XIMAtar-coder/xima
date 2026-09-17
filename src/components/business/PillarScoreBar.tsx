import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PillarScoreBarProps {
  label: string;
  value: number | null | undefined;
  max?: number;
  compact?: boolean;
  /** Shown instead of a number when value is null: "no data" is not a zero. */
  unavailableLabel?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const formatRoundedScore = (value: number | null | undefined) => {
  const numeric = Number(value ?? 0);
  return Math.round(Number.isFinite(numeric) ? numeric : 0);
};

export const PillarScoreBar: React.FC<PillarScoreBarProps> = ({ label, value, max = 100, compact = false, unavailableLabel }) => {
  const unavailable = value == null && unavailableLabel !== undefined;
  const rounded = formatRoundedScore(value);
  const safeMax = Math.max(1, max);
  const percent = clamp((rounded / safeMax) * 100, 0, 100);

  return (
    <div className="flex items-center gap-2 text-xs min-w-0">
      <span className={compact ? 'w-12 text-muted-foreground truncate shrink-0' : 'w-20 text-muted-foreground truncate shrink-0'}>
        {label}
      </span>
      <Progress value={unavailable ? 0 : percent} className="h-1.5 flex-1 overflow-hidden" />
      {unavailable ? (
        <span className="w-8 text-right text-muted-foreground shrink-0" title={unavailableLabel}>—</span>
      ) : (
        <span className="w-8 text-right font-mono text-muted-foreground shrink-0">{rounded}</span>
      )}
    </div>
  );
};