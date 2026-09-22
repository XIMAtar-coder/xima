import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type PillarKey = 'drive' | 'computational' | 'knowledge' | 'communication' | 'creativity';

const ORDER: PillarKey[] = ['drive', 'computational', 'knowledge', 'communication', 'creativity'];

/**
 * "Five dimensions to read your profile", in the same language as the signed-in
 * product: mono eyebrow, flat panels on the page background, numbers in
 * tabular figures, no lifted cards and no coloured glows.
 */
export const LandingPillars: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<PillarKey | null>(null);

  return (
    <section className="px-6 py-24 lg:px-10" style={{ background: 'var(--xima-bg)' }}>
      <div className="mx-auto max-w-[1200px]">
        <p className="xs-eyebrow text-center">{t('landing.pillars.label')}</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-center text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.9px] text-foreground">
          {t('landing.pillars.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[17px] leading-relaxed text-muted-foreground">
          {t('landing.pillars.subtitle')}
        </p>

        {/* The five, side by side: same width, same height, numbered */}
        <div className="mt-12 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {ORDER.map((key, i) => {
            const isOpen = expanded === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setExpanded(isOpen ? null : key)}
                aria-expanded={isOpen}
                className={cn(
                  'xs-panel flex h-full flex-col p-5 text-left transition-colors',
                  isOpen ? 'border-primary bg-primary/[0.04]' : 'hover:border-primary/40',
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold tabular-nums text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-foreground">
                  {t(`landing.pillars.items.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {t(`landing.pillars.items.${key}.subtitle`)}
                </p>
              </button>
            );
          })}
        </div>

        {/* The open one, in full */}
        {expanded && (
          <div className="xs-panel xs-panel-accent mt-4 animate-fade-in p-6 sm:p-8">
            <p className="xs-eyebrow">
              {String(ORDER.indexOf(expanded) + 1).padStart(2, '0')} · {t('landing.pillars.label')}
            </p>
            <h3 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
              {t(`landing.pillars.items.${expanded}.title`)}
            </h3>

            <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-foreground">
              {t(`landing.pillars.items.${expanded}.what`)}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[hsl(var(--xs-line))] bg-background p-5">
                <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  {t('landing.pillars.strong_label')}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground">
                  {t(`landing.pillars.items.${expanded}.strong`)}
                </p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--xs-line))] bg-background p-5">
                <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#C2410C]">
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                  {t('landing.pillars.weak_label')}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground">
                  {t(`landing.pillars.items.${expanded}.weak`)}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-[hsl(var(--xs-line))] pt-5">
              <p className="xs-eyebrow">{t('landing.pillars.how_label')}</p>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-foreground">
                {t(`landing.pillars.items.${expanded}.how`)}
              </p>
            </div>
          </div>
        )}

        {/* Free assessment */}
        <div className="mx-auto mt-20 max-w-[720px] text-center">
          <h3 className="text-[clamp(24px,3vw,32px)] font-semibold leading-tight tracking-[-0.6px] text-foreground">
            {t('landing.free_cta_title')}
          </h3>
          <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
            {t('landing.free_cta_subtitle')}
          </p>
          <button
            onClick={() => navigate('/ximatar-journey')}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t('landing.free_cta_button')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingPillars;
