import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { V2Field } from '@/lib/assessment/v2/model';
import { HANDOVER, evaluateHandover, type HandoverResult } from '@/lib/pauses/model';
import { PauseShell, fieldBase } from './PauseShell';
import { useDragToZone } from './drag';

/**
 * The handover: it is 17:00 and the person is leaving; tomorrow at 7 a
 * colleague comes in. Three lines at most, built from real pieces of
 * message. A box says what the colleague already knows, so repeating it
 * costs a line. On send the lines become a bubble in the chat.
 */

export const HandoverPause: React.FC<{ field: V2Field; onDone: (r: HandoverResult) => void; onSkip: () => void }> = ({ field, onDone, onSkip }) => {
  const { t } = useTranslation();
  const b = fieldBase(field, 'handover');
  const [lines, setLines] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const add = (id: string) => {
    if (sent || lines.includes(id)) return;
    if (lines.length >= HANDOVER.slots) { setNote(t('pauses.handover.full')); return; }
    setNote(null);
    setLines((cur) => [...cur, id]);
  };
  const remove = (id: string) => { if (!sent) { setNote(null); setLines((cur) => cur.filter((l) => l !== id)); } };
  const drag = useDragToZone((id, zone) => { if (zone === 'draft') add(id); });

  const piece = (id: string) => t(`${b}.pieces.${id}`);
  const known = HANDOVER.pieces.filter((p) => p.role === 'known');
  const spoken = [
    t(`${b}.situation`),
    `${t('pauses.handover.knows', { name: t(`${b}.name`) })}: ${known.map((p) => piece(p.id)).join(', ')}`,
    t('pauses.handover.pieces_sub'),
  ].join('. ');

  const primary = sent
    ? () => onDone(evaluateHandover(lines))
    : () => setSent(true);

  return (
    <PauseShell field={field} kind="handover" spoken={spoken} primaryLabel={sent ? t('pauses.common.continue') : t('pauses.handover.send', { name: t(`${b}.name`) })} primaryDisabled={lines.length === 0} onPrimary={primary} onSkip={onSkip} note={note}>
      {/* the situation and what the colleague knows */}
      <div className="rounded-xl border border-[hsl(var(--xs-line))] bg-card px-4 py-3 text-[14px] leading-[1.5] text-foreground">
        {t(`${b}.situation`)}
      </div>
      <div className="mt-2 rounded-xl border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] px-4 py-2.5">
        <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('pauses.handover.knows', { name: t(`${b}.name`) })}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {known.map((p) => (
            <span key={p.id} className="rounded-md bg-card px-2 py-1 text-[12.5px] text-muted-foreground">✓ {piece(p.id)}</span>
          ))}
        </div>
      </div>

      {/* the chat */}
      <div className="mt-4 rounded-2xl bg-[#e9eef2] p-3 dark:bg-[hsl(var(--xs-page))]">
        <div className="flex items-end gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--xs-rail))] text-[12px] font-bold text-white">{t(`${b}.name`).slice(0, 1)}</span>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-[13.5px] shadow-sm">
            <div className="text-[11px] font-semibold text-primary">{t(`${b}.name`)} · {t(`${b}.role`)}</div>
            {t(`${b}.request`)}
            <div className="mt-0.5 text-right text-[10.5px] text-muted-foreground">16:52</div>
          </div>
        </div>

        {sent ? (
          <div className="mt-3 flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[13.5px] text-white shadow-sm">
              {lines.map((l) => <div key={l}>{piece(l)}</div>)}
              <div className="mt-0.5 text-right text-[10.5px] text-white/70">17:03 ✓✓</div>
            </div>
          </div>
        ) : (
          <div
            data-drop-zone="draft"
            onClick={() => drag.onZoneTap('draft')}
            className={cn('mt-3 rounded-2xl border-2 bg-card p-3 transition-colors', drag.lifted || drag.state.dragging ? 'border-primary bg-primary/5' : 'border-primary/60')}
          >
            <div className="flex items-center justify-between font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span>{t('pauses.handover.draft')}</span><span>{lines.length} / {HANDOVER.slots} {t('pauses.handover.lines')}</span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {lines.map((l) => (
                <button key={l} type="button" onClick={(e) => { e.stopPropagation(); remove(l); }} title={t('pauses.handover.remove')} className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-left text-[13.5px] text-foreground">
                  <span>{piece(l)}</span><span aria-hidden className="text-muted-foreground">×</span>
                </button>
              ))}
              {Array.from({ length: HANDOVER.slots - lines.length }).map((_, i) => (
                <div key={`s-${i}`} className="rounded-lg border border-dashed border-[hsl(var(--xs-line))] px-3 py-2 text-[13px] text-muted-foreground">
                  {i === 0 ? t('pauses.handover.drop_here') : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* the pieces */}
      {!sent && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('pauses.handover.pieces')}</span>
            <span className="text-[12px] text-muted-foreground">{t('pauses.handover.pieces_sub')}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {HANDOVER.pieces.map((p) => {
              const used = lines.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={used}
                  {...(used ? {} : drag.handlers(p.id))}
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    'select-none rounded-full border bg-card px-3.5 py-2 text-[13.5px] text-foreground transition-shadow',
                    used ? 'opacity-30' : 'cursor-grab active:cursor-grabbing',
                    drag.lifted === p.id ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]' : 'border-[hsl(var(--xs-line))]',
                  )}
                >
                  {piece(p.id)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PauseShell>
  );
};

export default HandoverPause;
