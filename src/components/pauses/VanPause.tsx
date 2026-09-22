import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { V2Field } from '@/lib/assessment/v2/model';
import { VAN, evaluateVan, vanCanLoad, vanUsed, type VanResult } from '@/lib/pauses/model';
import { PauseShell, fieldBase } from './PauseShell';
import { useDragToZone } from './drag';

/**
 * The van: the pick-up note for tomorrow, the load bed as a grid of cells,
 * the warehouse with more than what is needed. Drag (or tap, then tap the
 * bed) one piece at a time; tap a piece on the bed to unload it. The note
 * ticks itself. The bed holds 22 cells and the note needs 21.
 */

const CELLS_PER_ROW = 11;

export const VanPause: React.FC<{ field: V2Field; onDone: (r: VanResult) => void; onSkip: () => void }> = ({ field, onDone, onSkip }) => {
  const { t } = useTranslation();
  const b = fieldBase(field, 'van');
  const [loaded, setLoaded] = useState<Record<string, number>>({});
  const [unloads, setUnloads] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const load = (id: string) => {
    if (!vanCanLoad(loaded, id)) {
      setNote(t('pauses.van.no_room'));
      return;
    }
    setNote(null);
    setLoaded((cur) => ({ ...cur, [id]: (cur[id] ?? 0) + 1 }));
  };
  const unload = (id: string) => {
    if ((loaded[id] ?? 0) === 0) return;
    setUnloads((n) => n + 1);
    setNote(null);
    setLoaded((cur) => ({ ...cur, [id]: cur[id] - 1 }));
  };

  const drag = useDragToZone((id, zone) => { if (zone === 'bed') load(id); });
  const used = vanUsed(loaded);
  const anyLoaded = used > 0;
  const name = (id: string) => t(`${b}.items.${id}`);

  // The bed drawn as cells: every unit becomes a block as wide as its size.
  const blocks: { id: string; size: number; key: string }[] = [];
  for (const it of VAN.items) for (let i = 0; i < (loaded[it.id] ?? 0); i += 1) blocks.push({ id: it.id, size: it.size, key: `${it.id}-${i}` });

  const spoken = [
    t('pauses.van.note_title'),
    ...VAN.items.filter((it) => it.needed > 0).map((it) => `${name(it.id)}: ${it.needed}`),
    t('pauses.van.warehouse_sub'),
  ].join('. ');

  return (
    <PauseShell field={field} kind="van" spoken={spoken} primaryLabel={t('pauses.van.close')} primaryDisabled={!anyLoaded} onPrimary={() => onDone(evaluateVan(loaded, unloads))} onSkip={onSkip} note={note}>
      {/* the note */}
      <div className="rounded-xl border border-[#e6dfcc] bg-[#fffdf7] px-4 py-3 text-[13.5px] text-[#2f3f4e] dark:border-[hsl(var(--xs-line))] dark:bg-card dark:text-foreground">
        <div className="flex items-center justify-between border-b border-dashed border-[#d9d0b8] pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#7a7261] dark:text-muted-foreground">
          <span>{t('pauses.van.note_title')} · {t(`${b}.doc_ref`)}</span><span>{t(`${b}.doc_place`)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 pt-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
          <span>{t('pauses.van.col_item')}</span><span>{t('pauses.van.col_qty')}</span><span>{t('pauses.van.col_onboard')}</span>
        </div>
        {VAN.items.filter((it) => it.needed > 0).map((it) => {
          const n = Math.min(loaded[it.id] ?? 0, it.needed);
          const ok = n === it.needed;
          return (
            <div key={it.id} className={cn('grid grid-cols-[1fr_auto_auto] gap-x-4 border-t border-[#efe9d8] py-1.5 dark:border-[hsl(var(--xs-line))]', ok && 'text-primary')}>
              <span className="font-sans">{name(it.id)}</span>
              <span className="font-mono tabular-nums">{it.needed}</span>
              <span className="font-mono tabular-nums">{n} / {it.needed}{ok ? ' ✓' : ''}</span>
            </div>
          );
        })}
      </div>

      {/* the bed */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.van.bed')}</span>
          <span className="text-[12px] text-muted-foreground">{t('pauses.van.bed_sub')}</span>
        </div>
        <div
          data-drop-zone="bed"
          onClick={() => drag.onZoneTap('bed')}
          className={cn(
            'mt-2 rounded-2xl border-2 bg-card p-2 transition-colors',
            drag.lifted || drag.state.dragging ? 'border-primary bg-primary/5' : 'border-foreground/70',
          )}
          aria-label={t('pauses.van.bed')}
        >
          <div className="flex flex-wrap gap-1" style={{ minHeight: 2 * 34 + 4 }}>
            {blocks.map((blk) => (
              <button
                key={blk.key}
                type="button"
                onClick={(e) => { e.stopPropagation(); unload(blk.id); }}
                title={t('pauses.van.unload')}
                className="flex h-8 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border border-foreground/60 bg-[#e9dcc2] px-1 text-[10.5px] font-medium text-[#3a2f1c] dark:bg-[#5b4b2f] dark:text-foreground"
                style={{ width: `calc(${(blk.size / CELLS_PER_ROW) * 100}% - 4px)` }}
                aria-label={name(blk.id)}
              >
                {/* a one-cell block only has room for an initial */}
                {blk.size === 1 ? name(blk.id).slice(0, 1) : name(blk.id).split(' ·')[0]}
              </button>
            ))}
            {Array.from({ length: VAN.capacity - used }).map((_, i) => (
              <span key={`free-${i}`} aria-hidden className="h-8 rounded-md border border-dashed border-[hsl(var(--xs-line))]" style={{ width: `calc(${(1 / CELLS_PER_ROW) * 100}% - 4px)` }} />
            ))}
          </div>
        </div>
      </div>

      {/* the warehouse */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.van.warehouse')}</span>
          <span className="text-[12px] text-muted-foreground">{t('pauses.van.warehouse_sub')}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-[hsl(var(--xs-page))] p-2 sm:grid-cols-4">
          {VAN.items.map((it) => {
            const left = it.available - (loaded[it.id] ?? 0);
            const gone = left <= 0;
            return (
              <button
                key={it.id}
                type="button"
                disabled={gone}
                {...(gone ? {} : drag.handlers(it.id))}
                onClick={(e) => e.preventDefault()}
                aria-label={`${name(it.id)} · ${left}`}
                className={cn(
                  'select-none rounded-xl border bg-card px-3 py-2.5 text-left transition-shadow',
                  gone ? 'opacity-35' : 'cursor-grab active:cursor-grabbing',
                  drag.lifted === it.id ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]' : 'border-[hsl(var(--xs-line))]',
                )}
              >
                <span className="block text-[13.5px] font-medium text-foreground">{name(it.id)}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <span className="inline-flex gap-[2px]" aria-hidden>
                    {Array.from({ length: it.size }).map((_, i) => <span key={i} className="h-2 w-2 rounded-[2px] bg-foreground/50" />)}
                  </span>
                  × {left}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">{t('pauses.van.hint')}</p>
      </div>
    </PauseShell>
  );
};

export default VanPause;
