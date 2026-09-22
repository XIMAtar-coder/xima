import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { V2Field } from '@/lib/assessment/v2/model';
import {
  YARD_COLS, YARD_ROWS, YARD_FIXED, YARD_MODULES, checkYard, evaluateYard, layoutFamily, placementOk,
  type Placement, type YardResult,
} from '@/lib/pauses/model';
import { PauseShell, fieldBase } from './PauseShell';

/**
 * The yard: a plan with the building, the dig (with its amber band) and the
 * gate; four modules to place with a finger, one tap to turn. "Save" checks
 * that everything is placed, that people can walk from the gate to the door
 * keeping a cell away from the machine; a working layout goes into the
 * gallery and one can try a different one. After the first saved layout a
 * new need arrives: the truck must reach the dig band from the gate.
 */

const TRAY_ROWS = 5;   // rows below the plan where unplaced modules wait (two lines)
/** Where each module waits before it is placed: first line cabin, toilet, store; second line the machine. */
const TRAY_SLOTS: Record<string, { r: number; c: number }> = {
  cabin: { r: 0.9, c: 0 }, toilet: { r: 0.9, c: 3.5 }, store: { r: 0.9, c: 5.5 }, machine: { r: 2.6, c: 0 },
};
const TAP = 6;

type Drag = { id: string; startX: number; startY: number; origin: Placement; moved: boolean; preview: Placement } | null;

export const YardPause: React.FC<{ field: V2Field; onDone: (r: YardResult) => void; onSkip: () => void }> = ({ field, onDone, onSkip }) => {
  const { t } = useTranslation();
  const b = fieldBase(field, 'yard');
  const planRef = useRef<HTMLDivElement>(null);

  // Unplaced modules sit in the tray, rows YARD_ROWS.. below the plan.
  const trayStart = (i: number): Placement => {
    const m = YARD_MODULES[i];
    const slot = TRAY_SLOTS[m.id];
    return { id: m.id, w: m.w, h: m.h, r: YARD_ROWS + slot.r, c: slot.c };
  };
  const [mods, setMods] = useState<Placement[]>(YARD_MODULES.map((_, i) => trayStart(i)));
  // The drag lives in a ref (events can arrive faster than React renders)
  // and is mirrored into state for drawing.
  const dragRef = useRef<Drag>(null);
  const [drag, setDragState] = useState<Drag>(null);
  const setDrag = (d: Drag) => { dragRef.current = d; setDragState(d); };
  const [families, setFamilies] = useState<string[]>([]);
  const [saves, setSaves] = useState(0);
  const [truckSolved, setTruckSolved] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const placed = mods.filter((m) => m.r < YARD_ROWS);
  const onPlan = (p: Placement) => p.r < YARD_ROWS;
  const secondPhase = families.length > 0;
  const checks = checkYard(placed, secondPhase);
  const cellPx = () => (planRef.current?.getBoundingClientRect().width ?? 320) / YARD_COLS;

  const pointerDown = (id: string) => (e: React.PointerEvent) => {
    const m = mods.find((x) => x.id === id)!;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id, startX: e.clientX, startY: e.clientY, origin: m, moved: false, preview: m });
  };
  const pointerMove = (e: React.PointerEvent) => {
    const cur = dragRef.current;
    if (!cur) return;
    const dx = e.clientX - cur.startX; const dy = e.clientY - cur.startY;
    const moved = cur.moved || Math.hypot(dx, dy) > TAP;
    const px = cellPx();
    const preview = { ...cur.origin, c: Math.round(cur.origin.c + dx / px), r: Math.round(cur.origin.r + dy / px) };
    setDrag({ ...cur, moved, preview });
  };
  const pointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    setDrag(null);
    if (!d.moved) {
      // A tap turns the module.
      const m = mods.find((x) => x.id === d.id)!;
      const turned = { ...m, w: m.h, h: m.w };
      if (!onPlan(m) || placementOk(turned, mods.filter(onPlan))) setMods((cur) => cur.map((x) => (x.id === d.id ? turned : x)));
      else setNote(t('pauses.yard.no_room'));
      return;
    }
    const p = d.preview;
    if (p.r >= YARD_ROWS - 0.5) {
      // Back to the tray.
      const i = YARD_MODULES.findIndex((x) => x.id === d.id);
      setMods((cur) => cur.map((x) => (x.id === d.id ? { ...trayStart(i), w: x.w, h: x.h } : x)));
      setNote(null);
      return;
    }
    const snapped = { ...p, r: Math.max(0, Math.round(p.r)), c: Math.max(0, Math.round(p.c)) };
    if (placementOk(snapped, mods.filter(onPlan))) {
      setMods((cur) => cur.map((x) => (x.id === d.id ? snapped : x)));
      setNote(null);
    } else {
      setNote(t('pauses.yard.no_room'));
    }
  };

  const save = () => {
    setSaves((n) => n + 1);
    if (!checks.placed) { setNote(t('pauses.yard.not_all_placed')); return; }
    if (!checks.walk) { setNote(t(`${b}.check_walk_fail`)); return; }
    if (!checks.truck) { setNote(t(`${b}.check_truck_fail`)); return; }
    const fam = layoutFamily(placed);
    if (families.includes(fam)) { setNote(t('pauses.yard.same_family')); return; }
    setNote(null);
    setFamilies((cur) => [...cur, fam]);
    if (secondPhase) setTruckSolved(true);
    setFlash(t('pauses.yard.saved_ok'));
    setTimeout(() => setFlash(null), 1600);
  };

  const spoken = [t(`${b}.check_walk`), t(`${b}.check_buffer`), secondPhase ? t(`${b}.new_need`) : '', t('pauses.yard.rotate_hint')].filter(Boolean).join('. ');

  // The box is YARD_COLS cells wide and YARD_ROWS + TRAY_ROWS cells tall
  // (square cells, height set through padding-top): horizontal percentages
  // refer to the width, vertical ones to the box height.
  const TOTAL_ROWS = YARD_ROWS + TRAY_ROWS;
  const cellStyle = (p: Placement): React.CSSProperties => ({
    left: `${(p.c / YARD_COLS) * 100}%`, top: `${(p.r / TOTAL_ROWS) * 100}%`,
    width: `${(p.w / YARD_COLS) * 100}%`, height: `${(p.h / TOTAL_ROWS) * 100}%`,
  });
  const planHeightPct = (TOTAL_ROWS / YARD_COLS) * 100;

  return (
    <PauseShell field={field} kind="yard" spoken={spoken} primaryLabel={t('pauses.yard.done')} primaryDisabled={families.length === 0} onPrimary={() => onDone(evaluateYard(families, truckSolved, saves))} onSkip={onSkip} note={note}>
      {secondPhase && (
        <div className="mb-3 rounded-xl border border-[#c98a1a]/50 bg-[#fff4dd] px-4 py-2.5 dark:bg-[#c98a1a]/15">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9a6200] dark:text-[#f0c877]">{t('pauses.yard.new_need_title')}</div>
          <div className="text-[13.5px] text-foreground">{t(`${b}.new_need`)}</div>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t(`${b}.plan`)}</span>
        <span className="text-[12px] text-muted-foreground">{t('pauses.yard.plan_sub')}</span>
      </div>

      {/* plan + tray, one coordinate system */}
      <div ref={planRef} className="relative mt-2 w-full select-none" style={{ paddingTop: `${planHeightPct}%`, touchAction: 'none' }}>
        {/* the plan */}
        <div className="absolute left-0 top-0 w-full rounded-xl border-2 border-foreground/70 bg-card" style={{ height: `${(YARD_ROWS / TOTAL_ROWS) * 100}%` }}>
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(hsl(var(--xs-line)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--xs-line)) 1px, transparent 1px)', backgroundSize: `${100 / YARD_COLS}% ${100 / YARD_ROWS}%` }} aria-hidden />
        </div>
        {/* fixed parts */}
        <div className="absolute grid place-items-center rounded-md border border-foreground/60 bg-[hsl(var(--xs-page))] font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground" style={cellStyle({ ...YARD_FIXED.home, id: 'home' })}>{t(`${b}.zones.home`)}</div>
        <div className="absolute rounded-md border border-dashed border-[#c98a1a] bg-[#c98a1a]/10" style={cellStyle({ ...YARD_FIXED.buffer, id: 'buffer' })} aria-hidden />
        <div className="absolute grid place-items-center rounded-md border border-[#c98a1a] bg-[#fff4dd] font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a6200] dark:bg-[#c98a1a]/30 dark:text-[#f0c877]" style={{ ...cellStyle({ ...YARD_FIXED.dig, id: 'dig' }), backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(201,138,26,.25) 6px 7px)' }}>{t(`${b}.zones.dig`)}</div>
        {YARD_FIXED.homeDoor.map((c, i) => <div key={`d${i}`} className="absolute bg-primary/70" style={{ left: `${(c.c / YARD_COLS) * 100}%`, top: `${(c.r / TOTAL_ROWS) * 100}%`, width: `${100 / YARD_COLS}%`, height: `${(0.2 / TOTAL_ROWS) * 100}%` }} aria-hidden />)}
        <div className="absolute grid place-items-center rounded-sm border-2 border-primary bg-card font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-primary" style={cellStyle({ r: 9.4, c: 3, w: 2, h: 0.6, id: 'gate' })}>{t(`${b}.zones.gate`)}</div>
        {/* tray */}
        <div className="absolute left-0 w-full rounded-xl bg-[hsl(var(--xs-page))]" style={{ top: `${((YARD_ROWS + 0.25) / TOTAL_ROWS) * 100}%`, height: `${((TRAY_ROWS - 0.25) / TOTAL_ROWS) * 100}%` }}>
          <span className="absolute left-2 top-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.yard.tray')}</span>
        </div>
        {/* modules */}
        {mods.map((m) => {
          const isDrag = drag?.id === m.id;
          const shown = isDrag && drag.moved ? drag.preview : m;
          const valid = !isDrag || !drag.moved || drag.preview.r >= YARD_ROWS - 0.5 || placementOk({ ...drag.preview, r: Math.round(drag.preview.r), c: Math.round(drag.preview.c) }, mods.filter(onPlan));
          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              aria-label={t(`${b}.modules.${m.id}`)}
              onPointerDown={pointerDown(m.id)}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              className={cn(
                'absolute grid cursor-grab place-items-center rounded-md border-2 text-center font-mono text-[9.5px] font-semibold uppercase leading-tight tracking-[0.06em] active:cursor-grabbing',
                m.id === 'machine' ? 'bg-[#eaf2ff] dark:bg-primary/20' : 'bg-[#f1f3f5] dark:bg-muted',
                isDrag ? (valid ? 'z-30 border-primary shadow-lg' : 'z-30 border-[#c98a1a] shadow-lg') : 'border-foreground/70',
              )}
              style={{ ...cellStyle(shown), transition: isDrag ? 'none' : 'left 120ms, top 120ms, width 120ms, height 120ms' }}
            >
              <span className="px-1">{t(`${b}.modules.${m.id}`)}</span>
              {!isDrag && onPlan(m) && <RotateCw className="absolute right-0.5 top-0.5 h-3 w-3 text-muted-foreground" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">{t('pauses.yard.rotate_hint')}</p>

      {/* the constraints, as facts */}
      <ul className="mt-3 grid gap-1 text-[13px]">
        {([
          ['buffer', true, t(`${b}.check_buffer`)],
          ['walk', checks.placed && checks.walk, t(`${b}.check_walk`)],
          ...(secondPhase ? [['truck', checks.placed && checks.truck, t(`${b}.check_truck`)] as const] : []),
        ] as const).map(([k, ok, label]) => (
          <li key={k} className={cn('flex items-center gap-2', ok ? 'text-foreground' : 'text-muted-foreground')}>
            <span aria-hidden className={cn('grid h-4 w-4 place-items-center rounded-full border text-[10px]', ok ? 'border-primary bg-primary text-white' : 'border-[#c98a1a] text-[#c98a1a]')}>{ok ? '✓' : '!'}</span>
            {label}
          </li>
        ))}
      </ul>

      {/* gallery + save */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[hsl(var(--xs-line))] bg-card px-3 py-2.5">
        <div>
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.yard.gallery')}</div>
          <div className="mt-1 flex items-center gap-1.5">
            {families.length === 0 && <span className="text-[12.5px] text-muted-foreground">{t('pauses.yard.gallery_empty')}</span>}
            {families.map((_, i) => (
              <span key={i} className="rounded-md border border-primary bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">{t('pauses.yard.saved_n', { n: String(i + 1).padStart(2, '0') })}</span>
            ))}
            {flash && <span role="status" className="text-[12px] text-primary">{flash}</span>}
          </div>
        </div>
        <button type="button" onClick={save} className="rounded-full border border-primary px-4 py-2 text-[13.5px] font-semibold text-primary hover:bg-primary/5">
          + {t('pauses.yard.save')}
        </button>
      </div>
    </PauseShell>
  );
};

export default YardPause;
