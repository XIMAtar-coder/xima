import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { EASY_SCENE, HARD_SCENE, hitTest, shadowAngle, shadowLength, type Scene, type Solid } from '@/lib/games/shadow';
import type { GameRun } from '@/lib/games/model';
import { GameShell, type GameApi } from './GameShell';

/**
 * «Trova l'impossibile». One light, four solids, one shadow that cannot be.
 * Tapping the solid or its shadow is the same answer. The explanation draws
 * the light–object–shadow line and turns the shadow back where it belongs.
 */

const SolidShape: React.FC<{ s: Solid; dim?: boolean }> = ({ s, dim }) => {
  const c = dim ? 'opacity-35' : '';
  if (s.kind === 'sphere') return <circle cx={s.x} cy={s.y} r={s.r} fill="#cfd6dd" stroke="#162e43" strokeWidth={1.2} className={c} />;
  if (s.kind === 'cube') return <rect x={s.x - s.r} y={s.y - s.r} width={s.r * 2} height={s.r * 2} rx={1} fill="#cfd6dd" stroke="#162e43" strokeWidth={1.2} className={c} />;
  if (s.kind === 'prism') return <path d={`M${s.x} ${s.y - s.r} L${s.x + s.r} ${s.y + s.r} L${s.x - s.r} ${s.y + s.r} Z`} fill="#cfd6dd" stroke="#162e43" strokeWidth={1.2} className={c} />;
  return (
    <g className={c}>
      <rect x={s.x - s.r} y={s.y - s.r} width={s.r * 2} height={s.r * 2} rx={s.r} fill="#cfd6dd" stroke="#162e43" strokeWidth={1.2} />
      <line x1={s.x - s.r} y1={s.y} x2={s.x + s.r} y2={s.y} stroke="#162e43" strokeWidth={0.8} />
    </g>
  );
};

const Shadow: React.FC<{ scene: Scene; s: Solid; amber?: boolean; fixed?: boolean }> = ({ scene, s, amber, fixed }) => {
  const a = fixed ? Math.atan2(s.y - scene.light.y, s.x - scene.light.x) : shadowAngle(scene, s);
  const len = shadowLength(scene, s);
  return (
    <g transform={`translate(${s.x} ${s.y}) rotate(${(a * 180) / Math.PI})`}>
      <ellipse cx={len / 2} cy={0} rx={len / 2 + s.r * 0.4} ry={s.r * 0.85}
        fill={amber ? '#c98a1a' : '#162e43'} fillOpacity={amber ? 0.3 : 0.17} />
    </g>
  );
};

const Board: React.FC<{ scene: Scene; onPick?: (id: string, p: { x: number; y: number }) => void; amber?: string | null; fixWrong?: boolean; rays?: boolean }> = ({ scene, onPick, amber, fixWrong, rays }) => (
  <svg
    viewBox="0 0 100 100"
    className={cn('mx-auto block w-full max-w-[360px] rounded-xl border-2 border-foreground/70 bg-card', onPick && 'cursor-pointer')}
    onClick={(e) => {
      if (!onPick) return;
      const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const p = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
      const id = hitTest(scene, p);
      if (id) onPick(id, p);
    }}
  >
    <rect x={0} y={0} width={100} height={100} fill="#f7f6f2" />
    {scene.solids.map((s) => <Shadow key={`sh${s.id}`} scene={scene} s={s} amber={amber === s.id} fixed={fixWrong && s.id === scene.wrong} />)}
    {rays && scene.solids.map((s) => {
      const a = Math.atan2(s.y - scene.light.y, s.x - scene.light.x);
      const len = shadowLength(scene, s);
      return <line key={`r${s.id}`} x1={scene.light.x} y1={scene.light.y} x2={s.x + Math.cos(a) * len} y2={s.y + Math.sin(a) * len}
        stroke="hsl(var(--primary))" strokeWidth={0.7} strokeDasharray="2 2" />;
    })}
    {scene.solids.map((s) => <SolidShape key={s.id} s={s} />)}
    {/* the light */}
    <g>
      <circle cx={scene.light.x} cy={scene.light.y} r={3.4} fill="hsl(var(--primary))" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={scene.light.x + Math.cos(a) * 5} y1={scene.light.y + Math.sin(a) * 5}
          x2={scene.light.x + Math.cos(a) * 7.5} y2={scene.light.y + Math.sin(a) * 7.5} stroke="hsl(var(--primary))" strokeWidth={1.1} strokeLinecap="round" />;
      })}
    </g>
  </svg>
);

interface Props { position: 1 | 2; onDone: (r: GameRun) => void; onSkip: (r: GameRun) => void }

export const ShadowGame: React.FC<Props> = ({ position, onDone, onSkip }) => {
  const { t } = useTranslation();
  const [amber, setAmber] = useState<string | null>(null);

  const render = (api: GameApi) => {
    const hard = api.stage !== 'demo' && api.stage !== 'easy' && api.stage !== 'bridge';
    const scene = hard ? HARD_SCENE : EASY_SCENE;
    const live = api.stage === 'easy' || api.stage === 'hard';

    const pick = (id: string) => {
      if (!live) return;
      api.acted();
      if (id === scene.wrong) { setAmber(null); api.solved(); return; }
      setAmber(id);
      setTimeout(() => setAmber(null), 1200);
      if (api.stage === 'hard') api.failed('wrong', t('games.shadow.coherent'));
    };

    return (
      <div>
        <Board scene={scene} onPick={live ? pick : undefined} amber={amber} />
        {api.stage === 'demo' && <p className="mt-3 text-center text-[13.5px] text-muted-foreground">{t('games.shadow.demo')}</p>}
      </div>
    );
  };

  const explanation = (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure>
          <Board scene={HARD_SCENE} rays />
          <figcaption className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{t('games.shadow.explain_1')}</figcaption>
        </figure>
        <figure>
          <Board scene={HARD_SCENE} rays fixWrong />
          <figcaption className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{t('games.shadow.explain_2')}</figcaption>
        </figure>
      </div>
      <p className="mt-3 text-[14px] font-medium leading-[1.5] text-foreground">{t('games.shadow.principle')}</p>
    </div>
  );

  return (
    <GameShell
      game="shadow"
      position={position}
      render={render}
      bridge={t('games.shadow.bridge')}
      explanation={explanation}
      onDone={onDone}
      onSkip={onSkip}
    />
  );
};

export default ShadowGame;
