import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MiniGameShell } from './MiniGameShell';
import { rng, saveMiniSignal, type MiniChoice } from '@/lib/minigames/signals';

/**
 * Il Ritmo — four pads light up in a sequence; repeat it. The sequence grows
 * by one each round (3, 4, 5). A wrong pad ends the round and asks what to do.
 * Memory, no words. Nothing about accuracy is scored.
 */
const ROUNDS = 3;
const PADS = ['#007AFF', '#0f766e', '#b45309', '#7e22ce'];

export const Ritmo: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useTranslation();
  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const [round, setRound] = useState(1);
  const [state, setState] = useState<'play' | 'miss' | 'done'>('play');
  const [showing, setShowing] = useState(true);
  const [lit, setLit] = useState<number | null>(null);
  const [input, setInput] = useState<number[]>([]);
  const stats = useRef({ attempted: 0, misses: 0, afterMiss: null as MiniChoice | null, skipped: false });

  const sequence = useMemo(() => {
    const r = rng(seedRef.current + round * 97);
    return Array.from({ length: 2 + round }, () => Math.floor(r() * 4));
  }, [round]);

  // Play the sequence, one pad at a time.
  useEffect(() => {
    if (state !== 'play') return;
    setShowing(true);
    setInput([]);
    let i = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      if (i >= sequence.length) { setLit(null); setShowing(false); return; }
      setLit(sequence[i]);
      setTimeout(() => { setLit(null); i += 1; setTimeout(step, 220); }, 480);
    };
    const start = setTimeout(step, 500);
    stats.current.attempted += 1;
    return () => { cancelled = true; clearTimeout(start); };
  }, [sequence, state]);

  const finish = (skipped: boolean) => {
    saveMiniSignal({ game: 'ritmo', roundsAttempted: stats.current.attempted, misses: stats.current.misses, afterMiss: stats.current.afterMiss, skipped, at: new Date().toISOString() });
    if (skipped) onDone(); else setState('done');
  };

  const tapPad = (p: number) => {
    if (showing || state !== 'play') return;
    const next = [...input, p];
    setLit(p);
    setTimeout(() => setLit(null), 160);
    if (sequence[next.length - 1] !== p) {
      stats.current.misses += 1;
      setState('miss');
      return;
    }
    setInput(next);
    if (next.length === sequence.length) {
      if (round >= ROUNDS) finish(false);
      else setTimeout(() => setRound((r) => r + 1), 500);
    }
  };

  const choice = (c: MiniChoice) => {
    if (stats.current.afterMiss === null && state === 'miss') stats.current.afterMiss = c;
    if (c === 'skip') { stats.current.skipped = true; finish(true); return; }
    if (c === 'retry') { setState('play'); seedRef.current += 1; setRound((r) => r); setInput([]); setShowing(true); setTimeout(() => setState('play'), 0); return; }
    // continue: next round, or done
    if (round >= ROUNDS) finish(false); else { setRound((r) => r + 1); setState('play'); }
  };

  return (
    <MiniGameShell
      title={t('minigames.ritmo.title', 'Follow the rhythm')}
      howTo={t('minigames.ritmo.how', 'Watch the pads light up, then tap them in the same order. The sequence gets one step longer each round.')}
      round={round}
      rounds={ROUNDS}
      state={state}
      onChoice={choice}
      onFinish={onDone}
    >
      <div className="mx-auto grid max-w-[300px] grid-cols-2 gap-3" role="group" aria-label={t('minigames.ritmo.title', 'Follow the rhythm')}>
        {PADS.map((color, p) => (
          <button
            key={p}
            type="button"
            onClick={() => tapPad(p)}
            aria-label={`pad ${p + 1}`}
            className={cn('aspect-square rounded-2xl border transition-all active:scale-95', lit === p ? 'scale-[1.03] border-transparent' : 'border-[hsl(var(--xs-line))]')}
            style={{ background: lit === p ? color : `${color}22` }}
          />
        ))}
      </div>
      <p className="mt-4 text-center font-mono text-[12px] tabular-nums text-muted-foreground">
        {showing ? t('minigames.ritmo.watch', 'Watch…') : t('minigames.ritmo.your_turn', 'Your turn: {{n}} of {{total}}', { n: input.length, total: sequence.length })}
      </p>
    </MiniGameShell>
  );
};

export default Ritmo;
