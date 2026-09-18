import React from 'react';
import { useTranslation } from 'react-i18next';

export type FieldKey = 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';

const FIELDS: { key: FieldKey; titleKey: string; descKey: string }[] = [
  { key: 'science_tech',        titleKey: 'field.science_tech.title',        descKey: 'field.science_tech.desc' },
  { key: 'business_leadership', titleKey: 'field.business_leadership.title', descKey: 'field.business_leadership.desc' },
  { key: 'arts_creative',       titleKey: 'field.arts_creative.title',       descKey: 'field.arts_creative.desc' },
  { key: 'service_ops',         titleKey: 'field.service_ops.title',         descKey: 'field.service_ops.desc' },
];

interface Props {
  value?: FieldKey | null;
  onChange: (val: FieldKey) => void;
  disabled?: boolean;
}

export default function FieldSelector({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="text-base font-semibold">{t('assessment.choose_field.title')}</div>
      <p className="text-sm text-muted-foreground">{t('assessment.choose_field.subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(({ key, titleKey, descKey }) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(key)}
              className={[
                'text-left rounded-2xl border px-5 py-4 transition focus:outline-none focus:ring-2 focus:ring-[#2C6CFF]/20',
                selected
                  ? 'border-[#2C6CFF] bg-blue-50/50 dark:bg-white/5'
                  : 'border-border hover:border-[#2C6CFF] hover:bg-accent/50'
              ].join(' ')}
              aria-pressed={selected}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{t(titleKey)}</div>
                  <div className="text-sm text-muted-foreground">{t(descKey)}</div>
                </div>
                <div
                  className={[
                    'mt-1 h-5 w-5 rounded-full border-2 transition-all',
                    selected ? 'border-[#2C6CFF] bg-[#2C6CFF] shadow-sm' : 'border-border'
                  ].join(' ')}
                  aria-hidden
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
