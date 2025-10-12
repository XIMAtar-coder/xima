import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = {
  assessmentSetKey: 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';
  qKey: string;           // 'q1'..'q21' | 'open1' | 'open2'
  category?: string;      // localized category label used for fallback routing
  className?: string;
};

export default function QuestionExample({ assessmentSetKey, qKey, category, className }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const base = `assessmentSets.${assessmentSetKey}.examples.${qKey}`;
  const title = t(`${base}.title`, { defaultValue: t('assessment.example.fallbackTitle') });
  // load explicit example body from i18n if present; else fallback by category
  let body = t(`${base}.body`, { defaultValue: '' });

  if (!body || body === `${base}.body`) {
    // smart fallback: route by category (must match your localized category strings)
    const fb = t(`assessment.example.fallback.${category || ''}`, { defaultValue: '' });
    body = fb || t('assessment.example.fallback.Creativity'); // final safety fallback
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(o => !o)}
        className="h-9 px-3 text-sm"
      >
        {t('assessment.example.button')}
      </Button>

      {open && (
        <Card className="mt-3 p-4 space-y-2 border-blue-200 bg-blue-50/60 dark:bg-white/5">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold">{title}</div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
              aria-label={t('assessment.example.close')}
            >
              {t('assessment.example.close')}
            </button>
          </div>
          <p className="text-sm leading-6 text-gray-800 dark:text-gray-200">{body}</p>
        </Card>
      )}
    </div>
  );
}
