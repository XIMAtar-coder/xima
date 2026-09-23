import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { EASY, HARD, SIZE, canExit, freeRange, move, type Board } from '@/lib/games/exit';
import type { GameRun } from '@/lib/games/model';
import { GameShell, type GameApi } from './GameShell';

/**
 * «Libera l'uscita». Drag a tile along its rail; the blue one leaves through
 * the gap on the right. The hard board needs a tile to be put back where it
 * was, so dragging the blue one over and over never works — which is exactly
 * what the explanation shows at the end.
 */

const CELL = 100 / SIZE;

const Tile: React.FC<{
  id: string; row: number; col: number; len: number; axis: 'h' | 'v';
  blue?: boolean; amber?: boolean; dim?: boolean; lifted?: boolean; label?: string;
  onPointerDown?: (e: React.PointerEvent) => void; onClick?: () => void; style?: React.CSSProperties;
}> = ({ id, row, col, len, axis, blue, amber, dim, lifted, label, onPointerDown, onClick, style }) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={label ?? id}
    onPointerDown={onPointerDown}
    onClick={onClick}
    className={cn(
      'absolute grid place-items-center rounded-[10px] border-2 transition-[border-color,box-shadow] duration-150',
      blue ? 'border-primary bg-primary/15' : 'border-foreground/70 bg-[hsl(var(--xs-page))]',
      amber && 'border-[#c98a1a] bg-[#c98a1a]/10',
      lifted && 'shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]',
      dim && 'opacity-40',
      onPointerDown && 'cursor-grab touch-none active:cursor-grabbing',
    )}
    style={{
      left: `${col * CELL}%`, top: `${row * CELL}%`,
      width: `${(axis === 'h' ? len : 1) * CELL}%`, height: `${(axis === 'v' ? len : 1) * CELL}%`,
      ...style,
    }}
  >
    <span aria-hidden className={cn('rounded-full', blue ? 'bg-primary' : 'bg-foreground/45', axis === 'h' ? 'h-1 w-1/2' : 'h-1/2 w-1')} />
  </div>
);

const Grid: React.FC<{ board: Board; children?: React.ReactNode; exit?: boolean }> = ({ board, children, exit = true }) => (
  <div className="relative mx-auto w-full max-w-[380px]">
    <div className="relative w-full overflow-visible rounded-xl border-2 border-foreground/70 bg-card" style={{ paddingTop: '100%' }}>
      <div className="absolute inset-0" aria-hidden style={{
        backgroundImage: 'linear-gradient(hsl(var(--xs-line)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--xs-line)) 1px, transparent 1px)',
        backgroundSize: `${CELL}% ${CELL}%`,
      }} />
      {exit && (
        <div className="absolute -right-[3px] w-[6px] rounded-full bg-primary" style={{ top: `${board.exitRow * CELL}%`, height: `${CELL}%` }} aria-hidden />
      )}
      <div className="absolute inset-0">{children}</div>
    </div>
  </div>
);

interface Props { position: 1 | 2; onDone: (r: GameRun) => void; onSkip: (r: GameRun) => void }

export const ExitGame: React.FC<Props> = ({ position, onDone, onSkip }) => {
  const { t } = useTranslation();
  const [easy, setEasy] = useState<Board>(EASY);
  const [hard, setHard] = useState<Board>(HARD);
  const [history, setHistory] = useState<Board[]>([]);
  const [amber, setAmber] = useState<string | null>(null);
  // Tap a tile, then tap where it can go: the same game without dragging, for
  // whoever finds a drag awkward — and it shows which way a tile slides.
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; cell: number } | null>(null);
  /** A drag ends with a click too: this keeps it from also toggling the selection. */
  const justDragged = useRef(false);
  // The preview lives in a ref as well: a pointerup can arrive before React
  // has re-rendered, and the old closure would drop the move.
  const previewRef = useRef<{ id: string; delta: number } | null>(null);
  const [preview, setPreviewState] = useState<{ id: string; delta: number } | null>(null);
  const setPreview = (p: { id: string; delta: number } | null) => { previewRef.current = p; setPreviewState(p); };
  const boxRef = useRef<HTMLDivElement>(null);

  const render = (api: GameApi) => {
    const hardStage = api.stage !== 'demo' && api.stage !== 'easy' && api.stage !== 'bridge';
    const board = hardStage ? hard : easy;
    const setBoard = hardStage ? setHard : setEasy;
    const live = api.stage === 'easy' || api.stage === 'hard';

    const onDown = (id: string) => (e: React.PointerEvent) => {
      if (!live) return;
      // The drag is recorded first: capturing the pointer can throw on ids the
      // browser does not own, and that must not lose the gesture.
      const box = boxRef.current?.getBoundingClientRect();
      drag.current = { id, x: e.clientX, y: e.clientY, cell: (box?.width ?? 320) / SIZE };
      try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* not captured */ }
      api.acted();
    };
    const onMove = (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const tile = board.tiles.find((x) => x.id === d.id)!;
      const px = tile.axis === 'h' ? e.clientX - d.x : e.clientY - d.y;
      const wanted = Math.round(px / d.cell);
      const { back, fwd } = freeRange(board, d.id);
      setPreview({ id: d.id, delta: Math.max(-back, Math.min(fwd, wanted)) });
    };
    const apply = (id: string, delta: number) => {
      const next = move(board, id, delta);
      if (!next) return;
      if (hardStage) setHistory((h) => [...h, board]);
      setBoard(next);
      setSelected(null);
      api.acted();
      if (canExit(next)) api.solved();
    };

    const onUp = () => {
      const d = drag.current; const p = previewRef.current;
      drag.current = null; setPreview(null);
      if (!d) return;
      if (!p || p.delta === 0) {
        const { back, fwd } = freeRange(board, d.id);
        if (back === 0 && fwd === 0) {
          // A tile with nowhere to go: say so, and on the hard round that is
          // a dead end worth offering a way out of.
          setSelected(null);
          setAmber(d.id);
          setTimeout(() => setAmber(null), 900);
          if (live && api.stage === 'hard') api.failed('invalid', t('games.exit.blocked'));
          return;
        }
        // A tap: the click handler lifts the tile.
        return;
      }
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 250);
      apply(d.id, p.delta);
    };

    /** Tap: lift the tile, or put it down again. Works with a mouse, a finger and a keyboard. */
    const onTileClick = (id: string) => () => {
      if (!live || justDragged.current) return;
      const { back, fwd } = freeRange(board, id);
      if (back === 0 && fwd === 0) {
        setSelected(null);
        setAmber(id);
        setTimeout(() => setAmber(null), 900);
        if (api.stage === 'hard') api.failed('invalid', t('games.exit.blocked'));
        return;
      }
      api.acted();
      setSelected((cur) => (cur === id ? null : id));
    };

    /** Where the lifted tile can be put down, one marker per reachable cell. */
    const targets = (() => {
      if (!selected || !live) return [] as { row: number; col: number; delta: number }[];
      const tile = board.tiles.find((x) => x.id === selected);
      if (!tile) return [];
      const { back, fwd } = freeRange(board, selected);
      const out: { row: number; col: number; delta: number }[] = [];
      for (let d = -back; d <= fwd; d += 1) {
        if (d === 0) continue;
        // the cell the leading edge would reach
        const lead = d > 0 ? tile.len - 1 + d : d;
        out.push(tile.axis === 'h'
          ? { row: tile.row, col: tile.col + lead, delta: d }
          : { row: tile.row + lead, col: tile.col, delta: d });
      }
      return out;
    })();

    return (
      <div ref={boxRef} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Grid board={board}>
          {targets.map((tg) => (
            <button
              key={`t${tg.delta}`}
              type="button"
              aria-label={t('games.exit.move_here')}
              onClick={() => apply(selected!, tg.delta)}
              className="absolute grid place-items-center rounded-[10px] border-2 border-dashed border-primary bg-primary/10 transition-colors hover:bg-primary/20"
              style={{ left: `${tg.col * CELL}%`, top: `${tg.row * CELL}%`, width: `${CELL}%`, height: `${CELL}%` }}
            >
              <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
            </button>
          ))}
          {board.tiles.map((tile) => {
            const delta = preview?.id === tile.id ? preview.delta : 0;
            return (
              <Tile
                key={tile.id}
                id={tile.id}
                row={tile.axis === 'v' ? tile.row + delta : tile.row}
                col={tile.axis === 'h' ? tile.col + delta : tile.col}
                len={tile.len}
                axis={tile.axis}
                blue={tile.id === 'X'}
                amber={amber === tile.id}
                lifted={selected === tile.id}
                label={tile.id === 'X' ? t('games.exit.blue_tile') : t('games.exit.tile')}
                onPointerDown={live ? onDown(tile.id) : undefined}
                onClick={live ? onTileClick(tile.id) : undefined}
                style={preview?.id === tile.id ? { transition: 'none' } : undefined}
              />
            );
          })}
        </Grid>
        {api.stage === 'demo' && (
          <p className="mt-3 text-center text-[13.5px] text-muted-foreground">{t('games.exit.demo')}</p>
        )}
      </div>
    );
  };

  // The explanation: the two moments that matter, side by side.
  const explanation = (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure>
          <Grid board={HARD} exit={false}>
            {HARD.tiles.map((tl) => (
              <Tile key={tl.id} id={tl.id} row={tl.row} col={tl.col} len={tl.len} axis={tl.axis} blue={tl.id === 'X'} dim={tl.id !== 'D' && tl.id !== 'X'} />
            ))}
            <div className="absolute grid place-items-center rounded-[10px] border-2 border-dashed border-primary bg-primary/10 text-[11px] font-bold text-primary"
              style={{ left: `${2 * CELL}%`, top: `${3 * CELL}%`, width: `${CELL}%`, height: `${3 * CELL}%` }}>1</div>
          </Grid>
          <figcaption className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{t('games.exit.explain_1')}</figcaption>
        </figure>
        <figure>
          <Grid board={HARD} exit={false}>
            {HARD.tiles.map((tl) => (
              <Tile key={tl.id} id={tl.id}
                row={tl.id === 'D' ? 3 : tl.row}
                col={tl.id === 'X' ? 3 : tl.col}
                len={tl.len} axis={tl.axis} blue={tl.id === 'X'} dim={tl.id !== 'D' && tl.id !== 'X'} />
            ))}
            <div className="absolute grid place-items-center rounded-[10px] border-2 border-dashed border-primary bg-primary/10 text-[11px] font-bold text-primary"
              style={{ left: `${2 * CELL}%`, top: 0, width: `${CELL}%`, height: `${3 * CELL}%` }}>2</div>
          </Grid>
          <figcaption className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{t('games.exit.explain_2')}</figcaption>
        </figure>
      </div>
      <p className="mt-3 text-[14px] font-medium leading-[1.5] text-foreground">
        <Trans i18nKey="games.exit.principle" components={{ b: <b /> }} />
      </p>
    </div>
  );

  return (
    <GameShell
      game="exit"
      position={position}
      render={render}
      bridge={t('games.exit.bridge')}
      explanation={explanation}
      canUndo={history.length > 0}
      onUndo={() => setHistory((h) => { const last = h[h.length - 1]; if (last) setHard(last); return h.slice(0, -1); })}
      onRestart={() => { setHard(HARD); setHistory([]); setEasy(EASY); }}
      onDone={onDone}
      onSkip={onSkip}
    />
  );
};

export default ExitGame;
