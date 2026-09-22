import React from 'react';
import { useTranslation } from 'react-i18next';

const KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;

/**
 * The five steps, in the language of the signed-in product: a numbered rail,
 * flat panels and one thin line joining them. The circled icons with coloured
 * glows belonged to the old landing style.
 */
export const LandingHowItWorks: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="px-6 py-24 lg:px-10" style={{ background: 'var(--xima-surface-soft, #F7FAFF)' }}>
      <div className="mx-auto max-w-[1200px]">
        <p className="xs-eyebrow text-center">{t('landing.how_it_works.label')}</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-center text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.9px] text-foreground">
          {t('landing.how_it_works.title')}
        </h2>

        <ol className="relative mt-14 grid grid-cols-1 gap-3 md:grid-cols-5">
          {/* One continuous line behind the numbers, instead of five dotted arcs */}
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 hidden border-t border-[hsl(var(--xs-line))] md:block"
            style={{ top: 38 }}
          />
          {KEYS.map((k, i) => (
            <li key={k} className="xs-panel relative flex flex-col p-5">
              <span className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 font-mono text-[12px] font-semibold tabular-nums text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                {t(`landing.how_it_works.${k}.title`)}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {t(`landing.how_it_works.${k}.desc`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
