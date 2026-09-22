import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MiniGameShell } from './MiniGameShell';
import { rng, saveMiniSignal, type MiniChoice } from '@/lib/minigames/signals';

/**
 * La Bilancia — a scale with a load on the left; pick weights for the right
 * pan until it balances, then press "Check". Weights are 1, 2, 3, 5 units and
 * can be used more than once. Estimation by eye, no words, no numbers to read
 * beyond the dots on each weight. Nothing about accuracy is scored.
 */
const ROUNDS = 3;
const WEIGHTS = [1, 2, 3, 5];

export const Bilancia: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useTranslation();
  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const [round, setRound] = useState(1);
  const [state, setState] = useState<'play' | 'miss' | 'done'>('play');
  const [right, setRight] = useState<number[]>([]);
  const stats = useRef({ attempted: 1, misses: 0, afterMiss: null as MiniChoice | null });

  // Round 1: 4–6. Round 2: 7–10. Round 3: 11–15.
  const target = useMemo(() => {
    const r = rng(seedRef.current + round * 61);
    const [lo, hi] = round === 1 ? [4, 6] : round === 2 ? [7, 10] : [11, 15];
    return lo + Math.floor(r() * (hi - lo + 1));
  }, [round]);

  const sum = right.reduce((a, b) => a + b, 0);
  const tilt = Math.max(-1, Math.min(1, (sum - target) / Math.max(target, 1)));

  const finish = (skipped: boolean) => {
    saveMiniSignal({ game: 'bilancia', roundsAttempted: stats.current.attempted, misses: stats.current.misses, afterMiss: stats.current.afterMiss, skipped, at: new Date().toISOString() });
    if (skipped) onDone(); else setState('done');
  };

  const check = () => {
    if (state !== 'play') return;
    if (sum !== target) { stats.current.misses += 1; setState('miss'); return; }
    setTimeout(() => {
      setRight([]);
      if (round >= ROUNDS) finish(false);
      else { stats.current.attempted += 1; setRound((r) => r + 1); }
    }, 400);
  };

  const choice = (c: MiniChoice) => {
    if (stats.current.afterMiss === null) stats.current.afterMiss = c;
    if (c === 'skip') { finish(true); return; }
    setRight([]);
    if (c === 'retry') { stats.current.attempted += 1; setState('play'); return; }
    if (round >= ROUNDS) finish(false); else { stats.current.attempted += 1; setRound((r) => r + 1); setState('play'); }
  };

  const Dots: React.FC<{ n: number }> = ({ n }) => (
    <span className="flex flex-wrap justify-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" />)}
    </span>
  );

  return (
    <MiniGameShell
      title={t('minigames.bilancia.title', 'Balance the scale')}
      howTo={t('minigames.bilancia.how', 'The left pan carries a load. Add weights to the right pan until the scale is level, then check. Each weight can be used more than once.')}
      round={round}
      rounds={ROUNDS}
      state={state}
      onChoice={choice}
      onFinish={onDone}
    >
      {/* The scale */}
      <div className="mx-auto max-w-[420px]">
        <div className="relative h-[120px]">
          <div className="absolute left-1/2 top-[54px] h-[60px] w-1 -translate-x-1/2 rounded bg-[hsl(var(--xs-line))]" />
          <div
            className="absolute left-1/2 top-[50px] h-1.5 w-[300px] -translate-x-1/2 rounded bg-foreground/60 transition-transform duration-300"
            style={{ transform: `translateX(-50%) rotate(${tilt * -10}deg)`, transformOrigin: 'center' }}
          >
            <div className="absolute -left-3 top-2 flex h-14 w-20 flex-col items-center justify-center rounded-b-xl border border-[hsl(var(--xs-line))] bg-card text-foreground/80" style={{ transform: `rotate(${tilt * 10}deg)` }}>
              <Dots n={target} />
            </div>
            <div className="absolute -right-3 top-2 flex h-14 w-20 flex-col items-center justify-center rounded-b-xl border border-[hsl(var(--xs-line))] bg-card text-primary" style={{ transform: `rotate(${tilt * 10}deg)` }}>
              {right.length === 0 ? <span className="text-[11px] text-muted-foreground">—</span> : <Dots n={sum} />}
            </div>
          </div>
        </div>

        {/* Weights to add; tap one on the pan to remove it */}
        <div className="mt-2 flex items-center justify-center gap-2" role="group" aria-label={t('minigames.bilancia.title', 'Balance the scale')}>
          {WEIGHTS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => state === 'play' && setRight((r) => [...r, w])}
              aria-label={`weight ${w}`}
              className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-[hsl(var(--xs-line))] bg-card text-foreground transition-all hover:border-primary/50 active:scale-95"
            >
              <Dots n={w} />
            </button>
          ))}
        </div>
        {right.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {right.map((w, i) => (
              <button key={i} type="button" onClick={() => setRight((r) => r.filter((_, k) => k !== i))} className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[12px] text-primary" aria-label={`remove weight ${w}`}>
                ×{w}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 text-center">
          <Button onClick={check} disabled={right.length === 0 || state !== 'play'} className={cn(sum === target && 'ring-2 ring-primary/30')}>
            {t('minigames.bilancia.check', 'Check')}
          </Button>
        </div>
      </div>
    </MiniGameShell>
  );
};

export default Bilancia;
