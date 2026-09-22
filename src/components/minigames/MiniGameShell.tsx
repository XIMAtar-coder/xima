import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/layout/PageHeader';
import type { MiniChoice } from '@/lib/minigames/signals';

/**
 * The frame every mini-game sits in: an honest eyebrow ("does not count"),
 * the how-to line, the round counter, and — after a miss — the three real
 * choices. The games themselves only render the board.
 */
export const MiniGameShell: React.FC<{
  title: string;
  howTo: string;
  round: number;
  rounds: number;
  state: 'play' | 'miss' | 'done';
  onChoice: (c: MiniChoice) => void;
  onFinish: () => void;
  children: React.ReactNode;
}> = ({ title, howTo, round, rounds, state, onChoice, onFinish, children }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{t('minigames.eyebrow', 'A short break · does not count')}</Eyebrow>
        <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
          {t('minigames.round', { n: Math.min(round, rounds), total: rounds, defaultValue: 'Round {{n}} of {{total}}' })}
        </span>
      </div>
      <h2 className="mt-3 text-[22px] font-medium leading-[1.3] tracking-[-0.5px] text-foreground sm:text-[26px]">{title}</h2>
      <p className="mb-6 mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{howTo}</p>

      <div className={state === 'miss' ? 'pointer-events-none opacity-60' : undefined}>{children}</div>

      {state === 'miss' && (
        <div className="mt-6 border-t border-[hsl(var(--xs-line))] pt-5">
          <p className="text-[15px] font-semibold text-foreground">{t('minigames.miss_title', 'Not that one.')}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{t('minigames.miss_body', 'Nothing lost: this does not enter the result. What do you want to do?')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button onClick={() => onChoice('retry')}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('minigames.retry', 'Try again')}
            </Button>
            <Button variant="outline" onClick={() => onChoice('continue')}>{t('minigames.continue', 'Next round')}</Button>
            <Button variant="ghost" onClick={() => onChoice('skip')}>{t('minigames.skip', 'Skip the game')}</Button>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-5">
          <p className="text-[15px] font-semibold text-foreground">{t('minigames.done', 'Done. Back to the questions.')}</p>
          <Button onClick={onFinish}>
            {t('common.next', 'Next')}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {state === 'play' && (
        <div className="mt-5 text-right">
          <button type="button" onClick={() => onChoice('skip')} className="text-[12.5px] text-muted-foreground underline-offset-2 hover:underline">
            {t('minigames.skip', 'Skip the game')}
          </button>
        </div>
      )}
    </div>
  );
};

export default MiniGameShell;
