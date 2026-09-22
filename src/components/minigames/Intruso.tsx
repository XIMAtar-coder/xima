import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MiniGameShell } from './MiniGameShell';
import { rng, saveMiniSignal, type MiniChoice } from '@/lib/minigames/signals';

/**
 * L'Intruso — nine shapes, one is different; tap it. The difference gets
 * subtler each round (colour, then rotation, then a small notch). Attention,
 * no words. Nothing about accuracy is scored.
 */
const ROUNDS = 3;

type Cell = { rot: number; hue: number; notch: boolean };

const makeRound = (round: number, seed: number): { cells: Cell[]; odd: number } => {
  const r = rng(seed + round * 131);
  const odd = Math.floor(r() * 9);
  const baseHue = 205 + Math.floor(r() * 60);
  const baseRot = Math.floor(r() * 4) * 90;
  const cells: Cell[] = Array.from({ length: 9 }, () => ({ rot: baseRot, hue: baseHue, notch: false }));
  // Round 1: colour. Round 2: rotation. Round 3: a notch.
  if (round === 1) cells[odd] = { ...cells[odd], hue: baseHue + 70 };
  else if (round === 2) cells[odd] = { ...cells[odd], rot: baseRot + 90 };
  else cells[odd] = { ...cells[odd], notch: true };
  return { cells, odd };
};

export const Intruso: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useTranslation();
  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const [round, setRound] = useState(1);
  const [state, setState] = useState<'play' | 'miss' | 'done'>('play');
  const [picked, setPicked] = useState<number | null>(null);
  const stats = useRef({ attempted: 1, misses: 0, afterMiss: null as MiniChoice | null });
  const { cells, odd } = useMemo(() => makeRound(round, seedRef.current), [round]);

  const finish = (skipped: boolean) => {
    saveMiniSignal({ game: 'intruso', roundsAttempted: stats.current.attempted, misses: stats.current.misses, afterMiss: stats.current.afterMiss, skipped, at: new Date().toISOString() });
    if (skipped) onDone(); else setState('done');
  };

  const pick = (i: number) => {
    if (state !== 'play') return;
    setPicked(i);
    if (i !== odd) { stats.current.misses += 1; setState('miss'); return; }
    setTimeout(() => {
      setPicked(null);
      if (round >= ROUNDS) finish(false);
      else { stats.current.attempted += 1; setRound((r) => r + 1); }
    }, 350);
  };

  const choice = (c: MiniChoice) => {
    if (stats.current.afterMiss === null) stats.current.afterMiss = c;
    setPicked(null);
    if (c === 'skip') { finish(true); return; }
    if (c === 'retry') { seedRef.current += 1; stats.current.attempted += 1; setRound((r) => r); setState('play'); return; }
    if (round >= ROUNDS) finish(false); else { stats.current.attempted += 1; setRound((r) => r + 1); setState('play'); }
  };

  return (
    <MiniGameShell
      title={t('minigames.intruso.title', 'Find the odd one out')}
      howTo={t('minigames.intruso.how', 'Nine shapes, one is not like the others. Tap it. Each round the difference is smaller.')}
      round={round}
      rounds={ROUNDS}
      state={state}
      onChoice={choice}
      onFinish={onDone}
    >
      <div className="mx-auto grid max-w-[320px] grid-cols-3 gap-2.5" role="group" aria-label={t('minigames.intruso.title', 'Find the odd one out')}>
        {cells.map((c, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            onClick={() => pick(i)}
            aria-label={`shape ${i + 1}`}
            className={cn(
              'aspect-square rounded-xl border bg-card p-3 transition-all active:scale-95',
              picked === i ? (i === odd ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10') : 'border-[hsl(var(--xs-line))] hover:border-primary/40',
            )}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full" style={{ transform: `rotate(${c.rot}deg)` }} aria-hidden="true">
              <path d="M20 20 H80 V60 L50 80 L20 60 Z" fill={`hsl(${c.hue} 70% 52%)`} />
              {c.notch && <circle cx={50} cy={40} r={8} fill="white" opacity={0.9} />}
            </svg>
          </button>
        ))}
      </div>
    </MiniGameShell>
  );
};

export default Intruso;
