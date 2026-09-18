import { cn } from '@/lib/utils';
import type { TranscriptEntry } from './types';

type Props = {
  entry: TranscriptEntry;
  counterpartName: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
}

export function L2MessageBubble({ entry, counterpartName }: Props) {
  const isCounterpart = entry.role === 'counterpart';

  if (isCounterpart) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
          {initialsOf(counterpartName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{counterpartName}</p>
          <div
            className={cn(
              'inline-block max-w-full rounded-2xl rounded-tl-md bg-muted text-foreground px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line',
              entry.degraded && 'opacity-80'
            )}
          >
            {entry.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 justify-end">
      <div className="flex-1 min-w-0 flex justify-end">
        <div className="inline-block max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line">
          {entry.text}
        </div>
      </div>
    </div>
  );
}
