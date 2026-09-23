import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  EASY_FIGURE, HARD_FIGURE, categories, countTriangles, geometry, options, outline, type Figure,
} from '@/lib/games/triangles';
import type { GameRun } from '@/lib/games/model';
import { GameShell, type GameApi } from './GameShell';

/**
 * «Quanti triangoli». One tap on a number. The hard figure has eighteen, and
 * the explanation is the whole point: count by category — one part wide, two,
 * three, on each level — so nothing is missed and nothing is counted twice.
 */

const W = 100; const H = 86;

const FigureSvg: React.FC<{ figure: Figure; highlight?: string[]; className?: string }> = ({ figure, highlight = [], className }) => {
  const g = geometry(figure, W, H);
  const lines: string[] = [];
  // the two sides and the base
  lines.push(`M${g.apex[0]} ${g.apex[1]} L${g.base[0][0]} ${g.base[0][1]}`);
  lines.push(`M${g.apex[0]} ${g.apex[1]} L${g.base[figure.base][0]} ${g.base[figure.base][1]}`);
  lines.push(`M${g.base[0][0]} ${g.base[0][1]} L${g.base[figure.base][0]} ${g.base[figure.base][1]}`);
  // rays to the cuts, and the bands
  for (let i = 1; i < figure.base; i += 1) lines.push(`M${g.apex[0]} ${g.apex[1]} L${g.base[i][0]} ${g.base[i][1]}`);
  for (const [l, r] of g.bands) lines.push(`M${l[0]} ${l[1]} L${r[0]} ${r[1]}`);
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className={cn('h-full w-full', className)} aria-hidden="true">
      {highlight.map((d, i) => <path key={`h${i}`} d={d} fill="hsl(var(--primary))" fillOpacity={0.14} stroke="hsl(var(--primary))" strokeWidth={1.6} strokeLinejoin="round" />)}
      {lines.map((d, i) => <path key={i} d={d} fill="none" stroke="#162e43" strokeWidth={1.4} strokeLinecap="round" />)}
    </svg>
  );
};

interface Props { position: 1 | 2; onDone: (r: GameRun) => void; onSkip: (r: GameRun) => void }

export const TrianglesGame: React.FC<Props> = ({ position, onDone, onSkip }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);

  const render = (api: GameApi) => {
    const hard = api.stage !== 'demo' && api.stage !== 'easy' && api.stage !== 'bridge';
    const figure = hard ? HARD_FIGURE : EASY_FIGURE;
    const right = countTriangles(figure);
    const live = api.stage === 'easy' || api.stage === 'hard';

    const answer = (n: number) => {
      if (!live) return;
      setPicked(n);
      api.acted();
      if (n === right) { setWrong([]); api.solved(); return; }
      setWrong((w) => [...w, n]);
      if (api.stage === 'hard') api.failed('wrong', t('games.triangles.not_yet'));
    };

    return (
      <div>
        <div className="mx-auto aspect-[100/86] w-full max-w-[340px]">
          <FigureSvg figure={figure} />
        </div>
        <div className="mx-auto mt-4 grid max-w-[340px] grid-cols-2 gap-2.5">
          {options(figure).map((n) => (
            <button
              key={n}
              type="button"
              disabled={!live}
              onClick={() => answer(n)}
              className={cn(
                'rounded-xl border-2 py-3.5 text-[19px] font-semibold tabular-nums transition-colors',
                wrong.includes(n) ? 'border-[#c98a1a] bg-[#c98a1a]/10 text-[#7a5200]'
                  : picked === n ? 'border-primary bg-primary/10 text-primary'
                  : 'border-[hsl(var(--xs-line))] bg-card text-foreground hover:border-primary/60',
                !live && 'opacity-60',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {api.stage === 'demo' && <p className="mt-3 text-center text-[13.5px] text-muted-foreground">{t('games.triangles.demo')}</p>}
      </div>
    );
  };

  // The explanation: one row per level, the categories that add up to eighteen.
  const cats = categories(HARD_FIGURE);
  const levels = Array.from({ length: HARD_FIGURE.bands + 1 }, (_, i) => i + 1);
  const explanation = (
    <div>
      <div className="grid gap-2">
        {levels.map((level) => {
          const row = cats.filter((c) => c.level === level);
          return (
            <div key={level} className="flex flex-wrap items-center gap-2 rounded-lg border border-[hsl(var(--xs-line))] bg-background px-2.5 py-2">
              {row.map((c) => (
                <span key={`${c.level}-${c.width}`} className="flex items-center gap-1">
                  {Array.from({ length: c.count }, (_, k) => (
                    <span key={k} className="h-9 w-10 shrink-0">
                      <FigureSvg figure={HARD_FIGURE} highlight={[outline(HARD_FIGURE, c, k)]} />
                    </span>
                  ))}
                </span>
              ))}
              <span className="ml-auto font-mono text-[13px] tabular-nums text-muted-foreground">
                {row.map((c) => c.count).join(' + ')} = {row.reduce((n, c) => n + c.count, 0)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[15px] font-semibold tabular-nums text-primary">
        {levels.map(() => '6').join(' + ')} = {countTriangles(HARD_FIGURE)}
      </p>
      <p className="mt-1.5 text-[14px] leading-[1.5] text-foreground">{t('games.triangles.principle')}</p>
    </div>
  );

  return (
    <GameShell
      game="triangles"
      position={position}
      render={render}
      bridge={t('games.triangles.bridge')}
      explanation={explanation}
      onRestart={() => { setPicked(null); setWrong([]); }}
      onDone={onDone}
      onSkip={onSkip}
    />
  );
};

export default TrianglesGame;
