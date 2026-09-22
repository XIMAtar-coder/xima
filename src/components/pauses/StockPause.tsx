import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { V2Field } from '@/lib/assessment/v2/model';
import { STOCK, evaluateStock, type StockAssignment, type StockResult } from '@/lib/pauses/model';
import { PauseShell, fieldBase } from './PauseShell';
import { useDragToZone } from './drag';

/**
 * The stock: three jobs for today, four products on the pallet with their
 * labels in plain view. Everything needed is on the label — use, where,
 * yield per unit. Drag a unit onto a job, one at a time; tap a unit on a job
 * to put it back. Opening a label is recorded, as a fact, not a fault.
 */

export const StockPause: React.FC<{ field: V2Field; onDone: (r: StockResult) => void; onSkip: () => void }> = ({ field, onDone, onSkip }) => {
  const { t } = useTranslation();
  const b = fieldBase(field, 'stock');
  const [assignment, setAssignment] = useState<StockAssignment>({});
  const [open, setOpen] = useState<string | null>(null);
  const [labelsOpened, setLabelsOpened] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);

  const used = (pid: string) => STOCK.jobs.reduce((n, j) => n + (assignment[j.id]?.[pid] ?? 0), 0);
  const left = (pid: string) => (STOCK.products.find((p) => p.id === pid)?.available ?? 0) - used(pid);

  const put = (pid: string, jobId: string) => {
    if (left(pid) <= 0) { setNote(t('pauses.stock.none_left')); return; }
    setNote(null);
    setAssignment((cur) => ({ ...cur, [jobId]: { ...(cur[jobId] ?? {}), [pid]: (cur[jobId]?.[pid] ?? 0) + 1 } }));
  };
  const take = (pid: string, jobId: string) => {
    setNote(null);
    setAssignment((cur) => ({ ...cur, [jobId]: { ...(cur[jobId] ?? {}), [pid]: Math.max(0, (cur[jobId]?.[pid] ?? 0) - 1) } }));
  };
  const drag = useDragToZone((id, zone) => { if (zone.startsWith('job:')) put(id, zone.slice(4)); });

  const toggleLabel = (pid: string) => {
    setOpen((cur) => (cur === pid ? null : pid));
    setLabelsOpened((cur) => new Set(cur).add(pid));
  };

  const pname = (pid: string) => t(`${b}.products.${pid}.name`);
  const anyPlaced = STOCK.jobs.some((j) => Object.values(assignment[j.id] ?? {}).some((n) => n > 0));
  const spoken = [
    ...STOCK.jobs.map((j) => `${t(`${b}.jobs.${j.id}.name`)}: ${t(`${b}.jobs.${j.id}.meta`)}`),
    ...STOCK.products.map((p) => `${pname(p.id)}: ${t(`${b}.products.${p.id}.l1`)}, ${t(`${b}.products.${p.id}.l2`)}, ${t(`${b}.products.${p.id}.yield`)}`),
  ].join('. ');

  return (
    <PauseShell field={field} kind="stock" spoken={spoken} primaryLabel={t('pauses.stock.ready')} primaryDisabled={!anyPlaced} onPrimary={() => onDone(evaluateStock(assignment, labelsOpened.size))} onSkip={onSkip} note={note}>
      {/* the jobs */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.stock.jobs')}</span>
        <span className="text-[12px] text-muted-foreground">{t('pauses.stock.jobs_sub')}</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {STOCK.jobs.map((j) => {
          const units = Object.entries(assignment[j.id] ?? {}).flatMap(([pid, n]) => Array.from({ length: n }, (_, i) => ({ pid, key: `${pid}-${i}` })));
          const zone = `job:${j.id}`;
          return (
            <div key={j.id} className="rounded-xl border border-[hsl(var(--xs-line))] bg-card p-3">
              <div className="text-[13.5px] font-semibold text-foreground">{t(`${b}.jobs.${j.id}.name`)}</div>
              <div className="text-[12px] text-muted-foreground">{t(`${b}.jobs.${j.id}.meta`)}</div>
              <div
                data-drop-zone={zone}
                onClick={() => drag.onZoneTap(zone)}
                className={cn(
                  'mt-2 flex min-h-[52px] flex-wrap items-end gap-1.5 rounded-lg border-2 border-dashed p-1.5 transition-colors',
                  drag.lifted || drag.state.dragging ? 'border-primary bg-primary/5' : 'border-[hsl(var(--xs-line))]',
                )}
                aria-label={t(`${b}.jobs.${j.id}.name`)}
              >
                {units.length === 0 && <span className="px-1 text-[12px] text-muted-foreground">{t('pauses.stock.drop_here')}</span>}
                {units.map((u) => (
                  <button key={u.key} type="button" onClick={(e) => { e.stopPropagation(); take(u.pid, j.id); }} title={t('pauses.stock.remove')} className="rounded-md border border-foreground/60 bg-[#f1ede3] px-1.5 py-1 text-[10.5px] font-medium text-[#3a2f1c] dark:bg-[#5b4b2f] dark:text-foreground">
                    {pname(u.pid)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* the pallet */}
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.stock.pallet')}</span>
        <span className="text-[12px] text-muted-foreground">{t('pauses.stock.pallet_sub')}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-[hsl(var(--xs-page))] p-2 sm:grid-cols-4">
        {STOCK.products.map((p) => {
          const n = left(p.id);
          const gone = n <= 0;
          const isOpen = open === p.id;
          return (
            <div key={p.id} className={cn('flex flex-col rounded-xl border bg-card', isOpen ? 'border-primary' : 'border-[hsl(var(--xs-line))]')}>
              <button type="button" onClick={() => toggleLabel(p.id)} aria-expanded={isOpen} className="px-3 pt-2.5 text-left">
                <span className="block rounded-md border border-foreground/60 bg-white px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#162e43]">{pname(p.id)}</span>
                <span className="mt-1.5 block text-[11.5px] leading-[1.35] text-muted-foreground">{t(`${b}.products.${p.id}.l1`)}</span>
                {isOpen && (
                  <span className="mt-1 block text-[11.5px] leading-[1.4] text-foreground">
                    {t(`${b}.products.${p.id}.l2`)}<br />
                    <b>{t(`${b}.products.${p.id}.yield`)}</b><br />
                    {t(`${b}.products.${p.id}.pack`)}
                  </span>
                )}
                {!isOpen && <span className="mt-1 block text-[11px] text-primary">{t('pauses.stock.open_label')}</span>}
              </button>
              <button
                type="button"
                disabled={gone}
                {...(gone ? {} : drag.handlers(p.id))}
                onClick={(e) => e.preventDefault()}
                aria-label={`${pname(p.id)} · ${n}`}
                className={cn(
                  'mx-2 mb-2 mt-2 select-none rounded-lg border px-2 py-1.5 text-[12px] font-medium',
                  gone ? 'opacity-35' : 'cursor-grab active:cursor-grabbing',
                  drag.lifted === p.id ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]' : 'border-[hsl(var(--xs-line))] bg-[#f1ede3] text-[#3a2f1c] dark:bg-[#5b4b2f] dark:text-foreground',
                )}
              >
                ⠿ {t(`${b}.products.${p.id}.unit`)} · × {n}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">{t('pauses.stock.label_hint')}</p>
    </PauseShell>
  );
};

export default StockPause;
