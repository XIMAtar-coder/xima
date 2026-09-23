import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CAPACITY, EASY, HARD, canPour, isSolved, isStuck, pour, type Layer, type State } from '@/lib/games/pour';
import type { GameRun } from '@/lib/games/model';
import { GameShell, type GameApi } from './GameShell';

/**
 * «Separa i colori». Tap the container to pour from, then the one to pour
 * into: one layer at a time, onto an empty container or onto the same kind.
 * The layers carry a texture as well as a shade, so the game works for
 * whoever cannot tell the shades apart.
 */

const FILL: Record<Layer, { fill: string; pattern: string }> = {
  a: { fill: '#162e43', pattern: '' },
  b: { fill: '#8a93a6', pattern: 'url(#dots)' },
  c: { fill: '#c6ccd4', pattern: 'url(#lines)' },
};

const Defs = () => (
  <defs>
    <pattern id="dots" width={4} height={4} patternUnits="userSpaceOnUse">
      <rect width={4} height={4} fill="#8a93a6" />
      <circle cx={2} cy={2} r={1} fill="#f7f6f2" />
    </pattern>
    <pattern id="lines" width={4} height={4} patternUnits="userSpaceOnUse">
      <rect width={4} height={4} fill="#c6ccd4" />
      <path d="M0 4 L4 0" stroke="#5b6b7a" strokeWidth={1} />
    </pattern>
  </defs>
);

const Container: React.FC<{
  tube: Layer[]; index: number; capacity: number;
  selected?: boolean; target?: boolean; amber?: boolean; onClick?: () => void; label: string;
}> = ({ tube, capacity, selected, target, amber, onClick, label }) => {
  const h = 26; const w = 62;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'rounded-xl border-2 bg-card p-1.5 transition-colors',
        selected ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]'
          : amber ? 'border-[#c98a1a]'
          : target ? 'border-dashed border-primary' : 'border-foreground/70',
      )}
    >
      <svg viewBox={`0 0 ${w} ${h * capacity}`} className="h-[132px] w-[56px]" aria-hidden="true">
        <Defs />
        {Array.from({ length: capacity }, (_, i) => (
          <rect key={`g${i}`} x={2} y={i * h + 2} width={w - 4} height={h - 4} rx={3} fill="none" stroke="hsl(var(--xs-line))" strokeWidth={1} />
        ))}
        {tube.map((l, i) => (
          <rect key={i} x={2} y={(capacity - 1 - i) * h + 2} width={w - 4} height={h - 4} rx={3}
            fill={FILL[l].pattern || FILL[l].fill} stroke="#162e43" strokeWidth={1} />
        ))}
      </svg>
    </button>
  );
};

interface Props { position: 1 | 2; onDone: (r: GameRun) => void; onSkip: (r: GameRun) => void }

export const PourGame: React.FC<Props> = ({ position, onDone, onSkip }) => {
  const { t } = useTranslation();
  const [easy, setEasy] = useState<State>(EASY);
  const [hard, setHard] = useState<State>(HARD);
  const [history, setHistory] = useState<State[]>([]);
  const [from, setFrom] = useState<number | null>(null);
  const [amber, setAmber] = useState<number | null>(null);

  const render = (api: GameApi) => {
    const isHard = api.stage !== 'demo' && api.stage !== 'easy' && api.stage !== 'bridge';
    const state = isHard ? hard : easy;
    const setState = isHard ? setHard : setEasy;
    const live = api.stage === 'easy' || api.stage === 'hard';
    const capacity = isHard ? CAPACITY : 2;

    const tap = (i: number) => {
      if (!live) return;
      api.acted();
      if (from === null) {
        if (state[i].length === 0) return;      // an empty container is not a source
        setFrom(i);
        return;
      }
      if (from === i) { setFrom(null); return; }
      const next = pour(state, from, i);
      if (!next) {
        setAmber(i);
        setTimeout(() => setAmber(null), 900);
        setFrom(null);
        if (api.stage === 'hard') api.failed('invalid', t('games.pour.no_room'));
        return;
      }
      if (isHard) setHistory((h) => [...h, state]);
      setState(next);
      setFrom(null);
      if (isSolved(next)) { api.solved(); return; }
      if (isStuck(next) && api.stage === 'hard') api.failed('stuck', t('games.pour.stuck'));
    };

    return (
      <div>
        <div className="flex flex-wrap items-end justify-center gap-2.5">
          {state.map((tube, i) => (
            <Container
              key={i}
              tube={tube}
              index={i}
              capacity={capacity}
              selected={from === i}
              target={from !== null && from !== i && canPour(state, from, i)}
              amber={amber === i}
              onClick={live ? () => tap(i) : undefined}
              label={t('games.pour.container', { n: i + 1 })}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          {api.stage === 'demo' ? t('games.pour.demo') : from === null ? t('games.pour.pick_from') : t('games.pour.pick_to')}
        </p>
      </div>
    );
  };

  // The explanation: the free container used, then made free again.
  const step1 = pour(HARD, 0, 3)!;
  const step2 = pour(step1, 1, 0)!;
  const explanation = (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure>
          <div className="flex items-end justify-center gap-2">
            {step1.map((tube, i) => <Container key={i} tube={tube} index={i} capacity={CAPACITY} selected={i === 3} label={`${i + 1}`} />)}
          </div>
          <figcaption className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{t('games.pour.explain_1')}</figcaption>
        </figure>
        <figure>
          <div className="flex items-end justify-center gap-2">
            {step2.map((tube, i) => <Container key={i} tube={tube} index={i} capacity={CAPACITY} selected={i === 0} label={`${i + 1}`} />)}
          </div>
          <figcaption className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{t('games.pour.explain_2')}</figcaption>
        </figure>
      </div>
      <p className="mt-3 text-[14px] font-medium leading-[1.5] text-foreground">{t('games.pour.principle')}</p>
    </div>
  );

  return (
    <GameShell
      game="pour"
      position={position}
      render={render}
      bridge={t('games.pour.bridge')}
      explanation={explanation}
      canUndo={history.length > 0}
      onUndo={() => setHistory((h) => { const last = h[h.length - 1]; if (last) setHard(last); setFrom(null); return h.slice(0, -1); })}
      onRestart={() => { setHard(HARD); setEasy(EASY); setHistory([]); setFrom(null); }}
      onDone={onDone}
      onSkip={onSkip}
    />
  );
};

export default PourGame;
