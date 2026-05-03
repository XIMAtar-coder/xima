import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import heroPortrait from '@/assets/hero-portrait.jpg';
import { RadarGlassCard } from './RadarGlassCard';
import { XimatarGlassCard } from './XimatarGlassCard';
import { ARCHETYPES } from './archetypes';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const change = (next: number) => {
    if (transitioning) return;
    setTransitioning(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIndex(((next % ARCHETYPES.length) + ARCHETYPES.length) % ARCHETYPES.length);
      setTransitioning(false);
    }, 300);
  };
  const goNext = () => change(index + 1);
  const goPrev = () => change(index - 1);
  const current = ARCHETYPES[index];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: 'var(--xima-bg)', minHeight: 'calc(100vh - 76px)' }}
    >
      {/* Hero image right side (desktop only) */}
      <div
        className="hidden lg:block absolute top-0 right-0 h-full"
        style={{ width: '58%' }}
      >
        <img
          src={heroPortrait}
          alt=""
          className="w-full h-full object-cover animate-fade-in"
          style={{ objectPosition: 'center top' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, var(--xima-bg) 0%, color-mix(in srgb, var(--xima-bg) 92%, transparent) 28%, color-mix(in srgb, var(--xima-bg) 35%, transparent) 55%, transparent 100%)',
          }}
        />

        <RadarGlassCard archetype={current} />
        <XimatarGlassCard archetype={current} transitioning={transitioning} onNext={goNext} />

        {/* Slide controls */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[40px] flex items-center gap-4 z-20">
          <span className="text-[13px] font-medium tabular-nums" style={{ color: 'var(--xima-text)' }}>
            {String(index + 1).padStart(2, '0')} / {String(ARCHETYPES.length).padStart(2, '0')}
          </span>
          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{
              background: 'var(--xima-surface-soft)',
              border: '1px solid var(--xima-border-strong)',
              color: 'var(--xima-text)',
            }}
            aria-label="Previous archetype"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{
              background: 'var(--xima-surface-soft)',
              border: '1px solid var(--xima-border-strong)',
              color: 'var(--xima-text)',
            }}
            aria-label="Next archetype"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            {ARCHETYPES.map((_, i) => (
              <button
                key={i}
                onClick={() => change(i)}
                aria-label={`Go to archetype ${i + 1}`}
                className="block rounded-full transition-all"
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  background: i === index ? 'var(--xima-blue)' : 'var(--xima-border-strong)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile/tablet hero image (stacked) */}
      <div className="lg:hidden w-full relative" style={{ height: 360 }}>
        <img
          src={heroPortrait}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center top' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 40%, var(--xima-bg) 100%)',
          }}
        />
      </div>

      {/* Content (left) */}
      <div className="relative max-w-[1440px] mx-auto px-6 lg:px-10 pt-10 lg:pt-20 pb-20 lg:pb-32">
        <div className="lg:max-w-[560px] animate-fade-in">
          <p
            className="font-semibold uppercase mb-6"
            style={{
              color: 'var(--xima-blue)',
              fontSize: 12,
              letterSpacing: 2,
            }}
          >
            {t('landing.hero.label')}
          </p>

          <h1
            className="font-extrabold mb-8"
            style={{
              color: 'var(--xima-text)',
              fontSize: 'clamp(32px, 5.2vw, 64px)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
            }}
          >
            <span className="block">{t('landing.hero.headline_1')}</span>
            <span className="block">{t('landing.hero.headline_2')}</span>
            <span className="block">
              {t('landing.hero.headline_3_prefix')}{' '}
              <span style={{ color: 'var(--xima-blue)' }}>{t('landing.hero.headline_3_brand')}</span>{' '}
              {t('landing.hero.headline_3_suffix')}
            </span>
          </h1>

          <p
            className="mb-10"
            style={{
              color: 'var(--xima-text-muted)',
              fontSize: 18,
              lineHeight: 1.65,
              maxWidth: 560,
            }}
          >
            {t('landing.hero.body')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/ximatar-journey')}
              className="inline-flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'var(--xima-blue)',
                color: 'white',
                borderRadius: 14,
                padding: '16px 28px',
                fontWeight: 600,
                fontSize: 16,
                boxShadow: '0 16px 35px rgba(11,107,255,0.20)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(11,107,255,0.28)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 16px 35px rgba(11,107,255,0.20)';
              }}
            >
              {t('landing.hero.cta_primary')}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/business')}
              className="inline-flex items-center justify-center gap-2 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.70)',
                color: '#0B6BFF',
                border: '1px solid rgba(11,107,255,0.45)',
                borderRadius: 14,
                padding: '16px 28px',
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {t('landing.hero.cta_secondary')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
