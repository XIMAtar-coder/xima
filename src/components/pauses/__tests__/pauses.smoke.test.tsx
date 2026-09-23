import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VanPause } from '../VanPause';
import { HandoverPause } from '../HandoverPause';
import { StockPause } from '../StockPause';
import { YardPause } from '../YardPause';
import { PAUSES, PARKED_PAUSES, SALITA_LAST, VAN } from '@/lib/pauses/model';

// The locale files carry the words; here the key is enough to tell the
// pieces apart, and interpolation is spelled out so counters stay readable.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opt?: Record<string, unknown> | string) => {
      const o = typeof opt === 'object' && opt !== null ? opt : undefined;
      const extra = o ? Object.entries(o).filter(([k]) => k !== 'defaultValue').map(([k, v]) => `${k}=${String(v)}`).join(',') : '';
      return extra ? `${key}(${extra})` : key;
    },
    i18n: { language: 'it' },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const noop = () => undefined;

describe('the pauses', () => {
  it('are all parked after the first test, with the climb as the only break, at the end', () => {
    expect(PAUSES).toHaveLength(0);
    expect(PARKED_PAUSES).toHaveLength(4);
    expect(SALITA_LAST).toBe(true);
  });

  it('van: loading from the warehouse ticks the note and the load can be closed', () => {
    const onDone = vi.fn();
    render(<VanPause field="trades_operations" onDone={onDone} onSkip={noop} />);
    // Every pause shows the chip and the skip, and offers the voice.
    expect(screen.getByText('pauses.common.chip')).toBeInTheDocument();
    expect(screen.getByText('pauses.common.skip')).toBeInTheDocument();

    const close = screen.getByRole('button', { name: /pauses\.van\.close/ });
    expect(close).toBeDisabled();

    // Tap the item, then the bed: the tap path works without a pointer drag.
    const tiles = screen.getByRole('button', { name: /items\.tiles/ });
    fireEvent.pointerDown(tiles, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(tiles, { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByLabelText('pauses.van.bed'));

    expect(close).toBeEnabled();
    fireEvent.click(close);
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ kind: 'van', needed: 1, superfluous: 0, complete: false }));
  });

  it('van: what is not on the note counts as superfluous', () => {
    const onDone = vi.fn();
    render(<VanPause field="restaurant" onDone={onDone} onSkip={noop} />);
    const extra = screen.getByRole('button', { name: /items\.buckets/ });
    fireEvent.pointerDown(extra, { clientX: 5, clientY: 5 });
    fireEvent.pointerUp(extra, { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByLabelText('pauses.van.bed'));
    fireEvent.click(screen.getByRole('button', { name: /pauses\.van\.close/ }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ needed: 0, superfluous: 1 }));
    // The note only lists what is actually needed.
    expect(VAN.items.filter((i) => i.needed > 0)).toHaveLength(5);
  });

  it('handover: three lines at most, then the message is sent before continuing', () => {
    const onDone = vi.fn();
    render(<HandoverPause field="service_ops" onDone={onDone} onSkip={noop} />);
    const pick = (id: string) => {
      const el = screen.getByText(`pauses.fields.service_ops.handover.pieces.${id}`);
      fireEvent.pointerDown(el, { clientX: 1, clientY: 1 });
      fireEvent.pointerUp(el, { clientX: 1, clientY: 1 });
      fireEvent.click(screen.getByText('pauses.handover.draft'));
    };
    pick('client');
    pick('floor');
    pick('material');
    // Sending first, and only then the result is handed over.
    fireEvent.click(screen.getByRole('button', { name: /pauses\.handover\.send/ }));
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /pauses\.common\.continue/ }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ kind: 'handover', necessary: 3, redundant: 0, linesUsed: 3 }));
  });

  it('stock: opening a label is counted, and the product lands on the job', () => {
    const onDone = vi.fn();
    render(<StockPause field="science_tech" onDone={onDone} onSkip={noop} />);
    fireEvent.click(screen.getAllByRole('button', { expanded: false })[0]);
    const unit = screen.getByRole('button', { name: /products\.p1\.name · 4/ });
    fireEvent.pointerDown(unit, { clientX: 2, clientY: 2 });
    fireEvent.pointerUp(unit, { clientX: 2, clientY: 2 });
    fireEvent.click(screen.getByLabelText('pauses.fields.science_tech.stock.jobs.job1.name'));
    fireEvent.click(screen.getByRole('button', { name: /pauses\.stock\.ready/ }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ kind: 'stock', productRight: 1, quantityRight: 0, labelsOpened: 1 }));
  });

  it('yard: parked, but still whole — nothing is handed over before a layout works', () => {
    const onDone = vi.fn();
    render(<YardPause field="arts_creative" onDone={onDone} onSkip={noop} />);
    expect(screen.getByRole('button', { name: /pauses\.yard\.done/ })).toBeDisabled();
    // Saving with modules still in the tray says so instead of saving.
    fireEvent.click(screen.getByRole('button', { name: /pauses\.yard\.save/ }));
    expect(screen.getByRole('status')).toHaveTextContent('pauses.yard.not_all_placed');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('every pause can be skipped', () => {
    const onSkip = vi.fn();
    render(<YardPause field="business_leadership" onDone={noop} onSkip={onSkip} />);
    fireEvent.click(screen.getByText('pauses.common.skip'));
    expect(onSkip).toHaveBeenCalled();
  });
});
