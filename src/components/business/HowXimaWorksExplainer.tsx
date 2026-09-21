import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** "Come funziona XIMA": collapsed by default at the end of the dashboard. */
export const HowXimaWorksExplainer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    {
      title: t('business.how_xima.step1_title', '1. Definisci il tuo obiettivo di assunzione'),
      description: t('business.how_xima.step1_desc'),
      action: { label: t('business.how_xima.create_goal', 'Crea il tuo primo obiettivo'), to: '/business/hiring-goals/new' },
    },
    {
      title: t('business.how_xima.step2_title', '2. Shortlist anonima'),
      description: t('business.how_xima.step2_desc'),
      action: { label: t('business.how_xima.browse_pool', 'Esplora il pool'), to: '/business/candidates' },
    },
    {
      title: t('business.how_xima.step3_title', '3. Percorso in 3 livelli di sfide'),
      description: t('business.how_xima.step3_desc'),
    },
    {
      title: t('business.how_xima.step4_title', '4. Rivelazione identità e offerta'),
      description: t('business.how_xima.step4_desc'),
    },
  ];

  return (
    <section className="border-t border-[hsl(var(--xs-line))] pt-4 text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 py-1 text-left text-muted-foreground hover:text-foreground"
      >
        <span>
          <span className="text-sm font-medium text-foreground">{t('business.how_xima.title', 'Come funziona XIMA')}</span>
          <span className="ml-2 hidden sm:inline">{t('business.how_xima.subtitle', "Dal brief all'assunzione in 4 passaggi")}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-5">
          <ol className="grid gap-4 md:grid-cols-4">
            {steps.map((step) => (
              <li key={step.title} className="border-t-2 border-[hsl(var(--xs-line))] pt-3">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">{step.description}</p>
                {step.action && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(step.action.to)}>
                    {step.action.label}
                  </Button>
                )}
              </li>
            ))}
          </ol>
          <p className="max-w-[700px] leading-relaxed text-muted-foreground">
            {t('business.how_xima.method_note', 'The method rests on the five psychometric pillars and keeps candidates anonymous until the offer.')}
          </p>
        </div>
      )}
    </section>
  );
};
