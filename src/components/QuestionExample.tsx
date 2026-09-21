import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, ExternalLink, ArrowUpRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toCategoryId, CategoryId } from '@/lib/assessment/category';
import { exampleMatchesOptions } from '@/lib/assessment/exampleRelevance';

type FieldKey = 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';

type ContentProps = {
  assessmentSetKey: FieldKey;
  qKey: string;               // 'q1'..'q21' | 'open1' | 'open2'
  categoryLabel?: string;     // localized category label (for MC)
  openFallbackCategory?: CategoryId; // default for open questions
};

type Props = ContentProps & { className?: string };

const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;
const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/i;
// A bare "Watch:" right before a link repeats what the link button says.
const BARE_WATCH_PREFIX = /(^|\s)(Watch|Guarda|Mira):\s*$/;

function LinkButton({ href }: { href: string }) {
  const { t } = useTranslation();
  let isVideo = false;
  try {
    isVideo = VIDEO_HOSTS.test(new URL(href).hostname);
  } catch {
    return null;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 h-8 gap-1.5 whitespace-normal text-left')}
    >
      {isVideo ? <PlayCircle size={14} className="shrink-0" /> : <ExternalLink size={14} className="shrink-0" />}
      {isVideo ? t('assessment.example.watch_video') : t('assessment.example.open_link')}
    </a>
  );
}

function renderInline(line: string, keyPrefix: string) {
  const pieces = line.split(URL_PATTERN);
  return pieces.map((piece, i) => {
    if (i % 2 === 1) {
      return <LinkButton key={`${keyPrefix}-url-${i}`} href={piece} />;
    }
    const text = pieces[i + 1] !== undefined ? piece.replace(BARE_WATCH_PREFIX, '$1') : piece;
    // Parse bold text (**text**)
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`${keyPrefix}-${i}-${partIdx}`} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${keyPrefix}-${i}-${partIdx}`}>{part}</span>;
    });
  });
}

// Simple markdown renderer for bold text, line breaks and links
function renderMarkdown(text: string) {
  if (!text) return null;

  return text.split(/\n\n+/).map((paragraph, pIdx) => (
    <div key={pIdx} className={pIdx > 0 ? 'mt-3' : ''}>
      {paragraph.split(/\n/).map((line, lIdx) => (
        <React.Fragment key={lIdx}>
          {lIdx > 0 && <br />}
          {renderInline(line, `${pIdx}-${lIdx}`)}
        </React.Fragment>
      ))}
    </div>
  ));
}

/**
 * Picks the example for a question: the question-specific one when it really
 * describes the options on screen, otherwise the general one for its category.
 */
export function useQuestionExampleContent({
  assessmentSetKey,
  qKey,
  categoryLabel,
  openFallbackCategory = 'creativity',
}: ContentProps): { title: string; body: string; useSpecific: boolean } {
  const { t, i18n } = useTranslation();

  const base = `assessmentSets.${assessmentSetKey}`;
  // Examples are help text, kept outside the sealed assessmentSets block so
  // they can be corrected without touching questions or scoring content.
  const helpBase = `assessmentHelp.${assessmentSetKey}`;
  const lng = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  // Read examples from the active language only. Through the normal fallback
  // chain a Spanish candidate got English prose for the 35 examples es.json
  // lacks — and example and options then came from different locales.
  const own = (key: string): unknown => i18n.getResource?.(lng, 'translation', key);
  const ownString = (key: string): string | undefined => {
    const value = own(key);
    return typeof value === 'string' && value.trim() ? value : undefined;
  };

  const specificBody = ownString(`${helpBase}.examples.${qKey}.body`);
  const ownOptions = own(`${base}.questions.${qKey}.options`);
  const options = Array.isArray(ownOptions)
    ? (ownOptions as string[])
    : (t(`${base}.questions.${qKey}.options`, { returnObjects: true }) as unknown);
  const useSpecific =
    !!specificBody && exampleMatchesOptions(specificBody, Array.isArray(options) ? (options as string[]) : null);

  if (useSpecific && specificBody) {
    return {
      title: ownString(`${helpBase}.examples.${qKey}.title`) ?? t('assessment.example.fallbackTitle'),
      body: specificBody,
      useSpecific: true,
    };
  }
  const catId: CategoryId = categoryLabel
    ? toCategoryId(categoryLabel, i18n.language)
    : openFallbackCategory;
  return {
    title: categoryLabel
      ? t('assessment.example.general_title', { category: categoryLabel })
      : t('assessment.example.general_title_plain'),
    body:
      ownString(`${helpBase}.examplesByCategory.${catId}`) ??
      t(`assessment.example.fallback.${catId}`, { defaultValue: '' }),
    useSpecific: false,
  };
}

/** The "Esempio ↗" outline button. */
export function QuestionExampleToggle({ open, onToggle, panelId, className }: { open: boolean; onToggle: () => void; panelId: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      className={cn('h-8 gap-1 rounded-md px-3 text-xs font-medium', className)}
      aria-expanded={open}
      aria-controls={panelId}
    >
      {t('assessment.example.button')}
      <ArrowUpRight size={13} aria-hidden />
    </Button>
  );
}

/** The example itself, as a flat panel that can sit beside the question. */
export function QuestionExamplePanel({
  id,
  title,
  body,
  useSpecific,
  onClose,
  className,
}: { id: string; title: string; body: string; useSpecific: boolean; onClose: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <aside
      id={id}
      className={cn('max-w-full overflow-hidden rounded-[10px] border border-[hsl(var(--xs-line))] bg-primary/5 p-5', className)}
      aria-label={t('assessment.example.button')}
    >
      <div className="mb-3 flex min-w-0 items-start justify-between gap-4">
        <h3 className="min-w-0 break-words text-[15px] font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t('assessment.example.close')}
        </button>
      </div>
      {!useSpecific && (
        <p className="mb-3 text-xs italic text-muted-foreground">{t('assessment.example.general_note')}</p>
      )}
      <div className="max-h-64 overflow-y-auto break-words pr-1 text-[13px] leading-6 text-muted-foreground lg:max-h-[420px]">
        {renderMarkdown(body)}
      </div>
    </aside>
  );
}

/** Toggle and panel together, one under the other. */
export default function QuestionExample({ assessmentSetKey, qKey, categoryLabel, openFallbackCategory = 'creativity', className }: Props) {
  const [open, setOpen] = React.useState(false);
  const panelId = `question-example-${qKey}`;

  // Collapsed again on every new question, so it never pushes the next one down.
  React.useEffect(() => setOpen(false), [assessmentSetKey, qKey]);

  const content = useQuestionExampleContent({ assessmentSetKey, qKey, categoryLabel, openFallbackCategory });

  return (
    <div className={cn(open && 'basis-full', className)}>
      <QuestionExampleToggle open={open} onToggle={() => setOpen((o) => !o)} panelId={panelId} />
      {open && <QuestionExamplePanel id={panelId} {...content} onClose={() => setOpen(false)} className="mt-2" />}
    </div>
  );
}
