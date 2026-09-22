import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type FieldKey = 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops' | 'trades_operations' | 'restaurant';

const FIELDS: { key: FieldKey; titleKey: string; descKey: string }[] = [
  { key: 'science_tech',        titleKey: 'field.science_tech.title',        descKey: 'field.science_tech.desc' },
  { key: 'business_leadership', titleKey: 'field.business_leadership.title', descKey: 'field.business_leadership.desc' },
  { key: 'arts_creative',       titleKey: 'field.arts_creative.title',       descKey: 'field.arts_creative.desc' },
  { key: 'service_ops',         titleKey: 'field.service_ops.title',         descKey: 'field.service_ops.desc' },
  { key: 'trades_operations',   titleKey: 'field.trades_operations.title',   descKey: 'field.trades_operations.desc' },
  { key: 'restaurant',          titleKey: 'field.restaurant.title',          descKey: 'field.restaurant.desc' },
];

interface Props {
  value?: FieldKey | null;
  onChange: (val: FieldKey) => void;
  disabled?: boolean;
  /** Marks the group as invalid (nothing chosen when it was required). */
  invalid?: boolean;
  labelledBy?: string;
}

/** Radio-card rows: one column, radio dot at the left, title and one line of description. */
export default function FieldSelector({ value, onChange, disabled, invalid, labelledBy }: Props) {
  const { t } = useTranslation();

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-invalid={invalid || undefined} className="grid gap-2.5">
      {FIELDS.map(({ key, titleKey, descKey }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={cn(
              'flex w-full items-center gap-4 rounded-[10px] border bg-card px-4 py-3.5 text-left transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-primary bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]'
                : invalid
                  ? 'border-destructive/60 hover:border-destructive'
                  : 'border-[hsl(var(--xs-line))] hover:border-primary/60',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2',
                selected ? 'border-primary' : 'border-muted-foreground/40',
              )}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-foreground">{t(titleKey)}</span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">{t(descKey)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
