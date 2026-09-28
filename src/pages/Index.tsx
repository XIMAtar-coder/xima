import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Ximatar3D } from '@/components/ximatar3d/Ximatar3D';
import { useAssessmentBenchmarks } from '@/hooks/useAssessmentBenchmarks';
import Seo from '@/components/Seo';

/**
 * The public landing, written for the candidate on a phone (Codex v2 with
 * the 3D XIMAtar, chosen by Pietro on 28/09/2026). The investor pitch that
 * was here lives on at /investitori.
 */
const ANIMALS = ['owl', 'lion', 'fox', 'dolphin', 'bear', 'bee', 'wolf', 'cat', 'parrot', 'elephant', 'horse', 'chameleon'] as const;

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">{children}</p>
);

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: benchmarks } = useAssessmentBenchmarks();
  const start = () => navigate('/ximatar-journey');
  // The duration is an estimate until enough tests have been timed.
  const duration = benchmarks?.medianMinutes
    ? t('landing2.duration_measured', { minutes: benchmarks.medianMinutes })
    : t('landing2.duration_estimate');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title={t('landing2.seo_title')}
        description={t('landing2.seo_description')}
        path="/"
      />
      <LandingHeader />
      <main id="main-content" className="flex-1">
        {/* Hero: the question, then the 3D XIMAtar as a preview of the result */}
        <section className="mx-auto grid max-w-[1120px] gap-10 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-16">
          <div>
            <Eyebrow>{t('landing2.hero_eyebrow')}</Eyebrow>
            <h1 className="mt-4 text-[40px] font-semibold leading-[1.02] tracking-[-1.6px] text-foreground sm:text-[56px]">
              {t('landing2.hero_title_1')}{' '}
              <span className="text-primary">{t('landing2.hero_title_2')}</span>
            </h1>
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-muted-foreground">{t('landing2.hero_body')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[t('landing2.chip_free'), t('landing2.chip_no_cv'), duration].map((chip) => (
                <span key={chip} className="rounded-md border border-[hsl(var(--xs-line))] bg-card px-2.5 py-1 text-[13px] text-foreground">{chip}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={start}
              className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-[17px] font-semibold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.25)] transition-colors hover:bg-primary/90 sm:w-auto sm:px-8"
            >
              {t('landing2.cta')} <span aria-hidden>→</span>
            </button>
            <p className="mt-3 text-[14px] text-muted-foreground">{t('landing2.cta_note')}</p>
          </div>

          <article className="overflow-hidden rounded-[28px] bg-[#0E1B3D] text-white shadow-[0_24px_60px_rgba(14,27,61,0.25)]">
            <div className="flex items-center justify-between px-6 pt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
              <span>{t('landing2.sample_label')}</span>
              <span>{t('landing2.sample_tag')}</span>
            </div>
            <Ximatar3D ximatarId="owl" mode="sway" fallbackSrc="/ximatars/owl.webp" alt={t('landing2.sample_alt')} className="h-[300px] sm:h-[340px]" />
            <div className="bg-white px-6 pb-6 pt-5 text-foreground dark:bg-card">
              <h2 className="text-[32px] font-semibold tracking-[-1px]">{t('ximatar.owl.name')}</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">{t('landing2.sample_tagline')}</p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="border-l-2 border-primary pl-3">
                  <small className="block text-[12px] text-muted-foreground">{t('landing2.sample_resource')}</small>
                  <b className="mt-0.5 block text-[15px] font-semibold">{t('pillars.computational_power.name')}</b>
                </div>
                <div className="border-l-2 border-[hsl(var(--xs-line))] pl-3">
                  <small className="block text-[12px] text-muted-foreground">{t('landing2.sample_grow')}</small>
                  <b className="mt-0.5 block text-[15px] font-semibold">{t('pillars.creativity.name')}</b>
                </div>
              </div>
              <p className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4 text-[14px] text-muted-foreground">{t('landing2.sample_note')}</p>
            </div>
          </article>
        </section>

        {/* The path, four steps, the mentor included */}
        <section className="border-t border-[hsl(var(--xs-line))] bg-card">
          <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
            <Eyebrow>{t('landing2.path_eyebrow')}</Eyebrow>
            <h2 className="mt-3 max-w-[640px] text-[34px] font-semibold leading-[1.08] tracking-[-1.2px] text-foreground sm:text-[44px]">{t('landing2.path_title')}</h2>
            <p className="mt-4 max-w-[560px] text-[16px] text-muted-foreground">{t('landing2.path_body')}</p>
            <ol className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="grid grid-cols-[34px_1fr] gap-2 sm:block">
                  <span className="font-mono text-[13px] font-semibold text-primary">0{n}</span>
                  <div className="sm:mt-2">
                    <h3 className="text-[19px] font-semibold tracking-[-0.3px] text-foreground">{t(`landing2.step${n}_title`)}</h3>
                    <p className="mt-1.5 text-[15px] text-muted-foreground">{t(`landing2.step${n}_body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The mentor */}
        <section className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
          <Eyebrow>{t('landing2.mentor_eyebrow')}</Eyebrow>
          <h2 className="mt-3 max-w-[640px] text-[34px] font-semibold leading-[1.08] tracking-[-1.2px] text-foreground sm:text-[44px]">{t('landing2.mentor_title')}</h2>
          <p className="mt-4 max-w-[560px] text-[16px] text-muted-foreground">{t('landing2.mentor_body')}</p>
          <div className="mt-6 flex items-center gap-4">
            <img src="/ximatars/owl.webp" alt="" width={64} height={64} className="h-16 w-16 rounded-[14px]" />
            <p className="text-[14px] text-muted-foreground">
              {t('landing2.mentor_example_1')}<br />
              <b className="font-semibold text-foreground">{t('landing2.mentor_example_2')}</b>
            </p>
          </div>
          <p className="mt-6 inline-block border-b-2 border-primary pb-1 text-[15px] font-semibold text-primary">{t('landing2.mentor_free')}</p>
          <p className="mt-4 max-w-[560px] text-[15px] text-muted-foreground">{t('landing2.mentor_how')}</p>
          <p className="mt-2 max-w-[560px] text-[14px] text-muted-foreground">{t('landing2.mentor_growth')}</p>
        </section>

        {/* The twelve XIMAtar */}
        <section className="border-t border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))]">
          <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
            <Eyebrow>{t('landing2.animals_eyebrow')}</Eyebrow>
            <h2 className="mt-3 max-w-[640px] text-[34px] font-semibold leading-[1.08] tracking-[-1.2px] text-foreground sm:text-[44px]">{t('landing2.animals_title')}</h2>
            <p className="mt-4 max-w-[600px] text-[16px] text-muted-foreground">{t('landing2.animals_body')}</p>
            <p className="mt-2 max-w-[600px] text-[14px] text-muted-foreground">{t('landing2.animals_drive')}</p>
            <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {ANIMALS.map((id) => (
                <li key={id} className="text-center">
                  <img src={`/ximatars/${id}.webp`} alt="" width={160} height={160} loading="lazy" className="w-full rounded-[16px]" />
                  <span className="mt-1.5 block text-[13px] text-muted-foreground">{t(`ximatar.${id}.name`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* After the result */}
        <section className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
          <Eyebrow>{t('landing2.after_eyebrow')}</Eyebrow>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-1.2px] text-foreground sm:text-[44px]">{t('landing2.after_title')}</h2>
          <p className="mt-4 max-w-[560px] text-[16px] font-medium text-foreground">{t('landing2.after_every_company')}</p>
          <p className="mt-2 max-w-[560px] text-[16px] text-muted-foreground">{t('landing2.after_body')}</p>
          <div className="mt-6 max-w-[640px]">
            {(['register', 'label'] as const).map((k) => (
              <details key={k} className="border-t border-[hsl(var(--xs-line))] py-4 text-[15px] last:border-b">
                <summary className="cursor-pointer font-semibold text-foreground">{t(`landing2.faq_${k}_q`)}</summary>
                <p className="mt-2 text-muted-foreground">{t(`landing2.faq_${k}_a`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="mx-auto max-w-[1120px] px-5 pb-16 sm:px-8">
          <div className="rounded-[28px] bg-card p-7 shadow-[0_1px_0_hsl(var(--xs-line))] sm:p-10">
            <Eyebrow>{t('landing2.final_eyebrow')}</Eyebrow>
            <h2 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-1.2px] text-foreground sm:text-[44px]">{t('landing2.final_title')}</h2>
            <p className="mt-4 text-[16px] text-muted-foreground">{t('landing2.final_body')}</p>
            <button
              type="button"
              onClick={start}
              className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-[17px] font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto sm:px-8"
            >
              {t('landing2.cta')} <span aria-hidden>→</span>
            </button>
            <p className="mt-3 text-[14px] text-muted-foreground">{t('landing2.chip_free')} · {duration}</p>
            <Link to="/business" className="mt-5 inline-block text-[14px] text-foreground underline underline-offset-4">{t('landing2.business_link')}</Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
