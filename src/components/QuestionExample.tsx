import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toCategoryId, CategoryId } from '@/lib/assessment/category';

type FieldKey = 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';

type Props = {
  assessmentSetKey: FieldKey;
  qKey: string;               // 'q1'..'q21' | 'open1' | 'open2'
  categoryLabel?: string;     // localized category label (for MC)
  openFallbackCategory?: CategoryId; // default for open questions
  className?: string;
};

export default function QuestionExample({
  assessmentSetKey,
  qKey,
  categoryLabel,
  openFallbackCategory = 'creativity',
  className
}: Props) {
  const { t, i18n } = useTranslation();

  const title = t(`assessmentSets.${assessmentSetKey}.examples.${qKey}.title`, {
    defaultValue: t('assessment.example.fallbackTitle')
  });

  // Level 1: per-question
  let body = t(`assessmentSets.${assessmentSetKey}.examples.${qKey}.body`, { defaultValue: '' });

  if (!body || body.startsWith('assessmentSets.')) {
    // Resolve canonical category ID
    const catId: CategoryId = categoryLabel
      ? toCategoryId(categoryLabel, i18n.language)
      : openFallbackCategory;

    // Level 2: per-field category
    body = t(`assessmentSets.${assessmentSetKey}.examplesByCategory.${catId}`, { defaultValue: '' });

    // Level 3: global category fallback
    if (!body || body.startsWith('assessmentSets.')) {
      body = t(`assessment.example.fallback.${catId}`, { defaultValue: '' });
    }
  }

  const [open, setOpen] = React.useState(false);

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
