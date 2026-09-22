import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Shuffle, Square } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LEVELS, generate, isSolved, rotate, fittingTiles, type Board, type Tile } from '@/lib/salita/puzzle';
import { openSignals, recordAttempt, recordChoice, summarise, type SalitaSignals } from '@/lib/salita/signals';
import Seo from '@/components/Seo';

/**
 * La Salita: the Drive trial. Four network puzzles, the last one large and
 * timed so that it is failed at the first try. What is recorded is the
 * behaviour around failure — try again, another board, stop, come back —
 * never how fast or how well the tiles were turned. The debrief says so.
 */

type Phase = 'intro' | 'play' | 'solved' | 'failed' | 'debrief';

const PipeTile: React.FC<{ tile: Tile; turns: number; onTap: () => void; size: number; fits: boolean }> = ({ tile, turns, onTap, size, fits }) => {
  // Draw the base tile and rotate the whole drawing: the turn animates and the
  // logic stays on bitmasks.
  const ends = [
    (tile & 1) !== 0 && 'M50 50 L50 6',    // N
    (tile & 2) !== 0 && 'M50 50 L94 50',   // E
    (tile & 4) !== 0 && 'M50 50 L50 94',   // S
    (tile & 8) !== 0 && 'M50 50 L6 50',    // W
  ].filter(Boolean) as string[];
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="tile"
      className={cn(
        'relative aspect-square w-full rounded-[12px] border transition-all active:scale-95',
        fits ? 'border-primary/50 bg-primary/[0.08] shadow-[0_0_0_2px_hsl(var(--primary)/0.12)]' : 'border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] hover:border-primary/40',
      )}
      style={{ maxWidth: size }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" style={{ transform: `rotate(${turns * 90}deg)`, transition: 'transform 160ms ease-out' }} aria-hidden="true">
        {ends.map((d) => (
          <path key={d} d={d} stroke={fits ? 'hsl(var(--primary))' : '#8a93a6'} strokeWidth={16} strokeLinecap="round" fill="none" />
        ))}
        {ends.length > 0 && <circle cx={50} cy={50} r={12} fill={fits ? 'hsl(var(--primary))' : '#8a93a6'} />}
        {ends.length > 0 && <circle cx={50} cy={50} r={5} fill="white" opacity={0.9} />}
      </svg>
    </button>
  );
};

const Salita: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [levelIdx, setLevelIdx] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [turns, setTurns] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [signals, setSignals] = useState<SalitaSignals | null>(null);
  const startedAt = useRef<number>(0);

  const level = LEVELS[levelIdx];
  const base = useMemo(() => generate(level.size, seed).scrambled, [level.size, seed]);
  const board: Board = useMemo(() => ({ size: base.size, tiles: base.tiles.map((tl, i) => rotate(tl, turns[i] ?? 0)) }), [base, turns]);
  const fitting = useMemo(() => fittingTiles(board), [board]);
  const total = board.size * board.size;

  const startLevel = useCallback((idx: number, newSeed: number) => {
    setLevelIdx(idx);
    setSeed(newSeed);
    setTurns(new Array(LEVELS[idx].size * LEVELS[idx].size).fill(0));
    setSecondsLeft(LEVELS[idx].limit);
    startedAt.current = Date.now();
    setPhase('play');
  }, []);

  const elapsed = () => Math.round((Date.now() - startedAt.current) / 1000);

  const begin = () => {
    setSignals(openSignals());
    startLevel(0, Math.floor(Math.random() * 1e9));
  };

  // Countdown on timed levels; timeout is a failure with a real choice after it.
  useEffect(() => {
    if (phase !== 'play' || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setSignals((s) => (s ? recordAttempt(s, { level: level.n, seed, outcome: 'timeout', seconds: elapsed() }) : s));
      setPhase('failed');
      return;
    }
    const id = setTimeout(() => setSecondsLeft((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [phase, secondsLeft, level.n, seed]);

  const tapTile = (i: number) => {
    if (phase !== 'play') return;
    const next = turns.slice();
    next[i] = (next[i] ?? 0) + 1;
    setTurns(next);
    const nb: Board = { size: base.size, tiles: base.tiles.map((tl, k) => rotate(tl, next[k] ?? 0)) };
    if (isSolved(nb)) {
      setSignals((s) => (s ? recordAttempt(s, { level: level.n, seed, outcome: 'solved', seconds: elapsed() }) : s));
      setPhase(levelIdx === LEVELS.length - 1 ? 'debrief' : 'solved');
    }
  };

  const stopHere = () => {
    setSignals((s) => {
      const withAttempt = s ? recordAttempt(s, { level: level.n, seed, outcome: 'stopped', seconds: elapsed() }) : s;
      return withAttempt ? recordChoice(withAttempt, { level: level.n, choice: 'stop' }) : withAttempt;
    });
    setPhase('debrief');
  };

  const afterFailure = (choice: 'retry' | 'change' | 'stop') => {
    setSignals((s) => (s ? recordChoice(s, { level: level.n, choice }) : s));
    if (choice === 'retry') startLevel(levelIdx, seed);
    else if (choice === 'change') startLevel(levelIdx, Math.floor(Math.random() * 1e9));
    else setPhase('debrief');
  };

  const summary = summarise(signals);
  const gridMax = level.size >= 7 ? 62 : level.size >= 5 ? 76 : 96;

  return (
    <MainLayout>
      <Seo title={`${t('salita.title')} — XIMA`} description={t('salita.intro_body')} path="/salita" />
      <div className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {phase === 'intro' && (
          <Panel className="p-6 sm:p-8">
            <Eyebrow>{t('salita.eyebrow')}</Eyebrow>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.8px] text-foreground sm:text-[34px]">{t('salita.intro_title')}</h1>
            <p className="mt-4 max-w-[600px] text-[15px] leading-relaxed text-muted-foreground">{t('salita.intro_body')}</p>
            <p className="mt-3 rounded-lg border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] px-4 py-3 text-[13.5px] text-foreground">{t('salita.intro_honest')}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={begin}>
                {t('salita.start')}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('salita.back')}
              </Button>
            </div>
          </Panel>
        )}

        {(phase === 'play' || phase === 'solved' || phase === 'failed') && (
          <Panel className="p-5 sm:p-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Eyebrow>{t('salita.level', { n: level.n })}</Eyebrow>
                {/* The four steps of the climb, the current one lit */}
                <span className="flex items-center gap-1" aria-hidden="true">
                  {LEVELS.map((l) => (
                    <span key={l.n} className={cn('h-1.5 rounded-full transition-all', l.n === level.n ? 'w-5 bg-primary' : l.n < level.n ? 'w-2 bg-primary/50' : 'w-2 bg-[hsl(var(--xs-line))]')} />
                  ))}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[12px] tabular-nums text-muted-foreground">
                <span>{t('salita.fitting', { n: fitting, total })}</span>
                {secondsLeft !== null && (
                  <span className={cn('rounded-md border px-2 py-0.5', secondsLeft <= 10 ? 'border-destructive text-destructive' : 'border-[hsl(var(--xs-line))]')}>
                    {t('salita.timer', { s: secondsLeft })}
                  </span>
                )}
              </div>
            </div>

            <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">
              {t('salita.how_to', 'Tap a tile to turn it. The level is done when every pipe meets its neighbour and none points outside.')}
              {level.limit && <> {t('salita.how_to_timed', 'This level is timed.')}</>}
            </p>
            <div
              className="mx-auto grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))`, maxWidth: board.size * (gridMax + 6) }}
              role="grid"
              aria-label={t('salita.title')}
            >
              {board.tiles.map((tl, i) => {
                // A tile "fits" when all its ends meet neighbours: computed per tile for the glow.
                const single: Board = { size: board.size, tiles: board.tiles };
                const r = Math.floor(i / board.size); const c = i % board.size;
                const fits = [1, 2, 4, 8].every((bit, di) => {
                  const has = (tl & bit) !== 0;
                  const [dr, dc] = [[-1, 0], [0, 1], [1, 0], [0, -1]][di];
                  const nr = r + dr; const nc = c + dc;
                  const inside = nr >= 0 && nc >= 0 && nr < board.size && nc < board.size;
                  const opp = [4, 8, 1, 2][di];
                  const nHas = inside && (single.tiles[nr * board.size + nc] & opp) !== 0;
                  return has === nHas;
                });
                return <PipeTile key={i} tile={base.tiles[i]} turns={turns[i] ?? 0} onTap={() => tapTile(i)} size={gridMax} fits={fits} />;
              })}
            </div>

            {phase === 'play' && (
              <div className="mt-6 flex justify-end">
                <Button variant="ghost" onClick={stopHere}>
                  <Square className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('salita.stop')}
                </Button>
              </div>
            )}

            {phase === 'solved' && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-5">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('salita.solved_title', { n: level.n })}
                </p>
                <Button onClick={() => startLevel(levelIdx + 1, Math.floor(Math.random() * 1e9))}>
                  {t('salita.next')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {phase === 'failed' && (
              <div className="mt-6 border-t border-[hsl(var(--xs-line))] pt-5">
                <p className="text-[17px] font-semibold text-foreground">{t('salita.fail_title')}</p>
                <p className="mt-1 text-[14px] text-muted-foreground">{t('salita.fail_body')}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Button onClick={() => afterFailure('retry')}>
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('salita.retry')}
                  </Button>
                  <Button variant="outline" onClick={() => afterFailure('change')}>
                    <Shuffle className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('salita.change')}
                  </Button>
                  <Button variant="ghost" onClick={() => afterFailure('stop')}>{t('salita.quit')}</Button>
                </div>
              </div>
            )}
          </Panel>
        )}

        {phase === 'debrief' && (
          <Panel className="p-6 sm:p-8">
            <Eyebrow>{t('salita.debrief_eyebrow')}</Eyebrow>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.7px] text-foreground sm:text-[30px]">{t('salita.debrief_title')}</h1>
            <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-muted-foreground">{t('salita.debrief_body')}</p>
            {summary && (
              <ul className="mt-5 space-y-2 border-t border-[hsl(var(--xs-line))] pt-5 text-[14px] text-foreground">
                <li>{t('salita.fact_attempts', { n: summary.hardAttempts })}</li>
                <li>{t('salita.fact_retries', { n: summary.retries })}</li>
                <li>{t('salita.fact_changes', { n: summary.changes })}</li>
                {summary.returns > 0 && <li>{t('salita.fact_returns')}</li>}
                {summary.finished && <li>{t('salita.fact_finished')}</li>}
              </ul>
            )}
            <p className="mt-4 text-[13px] text-muted-foreground">{t('salita.debrief_note')}</p>
            <Button className="mt-6" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('salita.back')}
            </Button>
          </Panel>
        )}
      </div>
    </MainLayout>
  );
};

export default Salita;
