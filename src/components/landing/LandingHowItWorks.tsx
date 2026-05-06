import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, BarChart3, Hexagon, Shield, Building2 } from 'lucide-react';

const STEP_ICONS = [Search, BarChart3, Hexagon, Shield, Building2];
const KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;

export const LandingHowItWorks: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 px-6 lg:px-10" style={{ background: 'var(--xima-surface-soft, #F7FAFF)' }}>
      <div className="max-w-[1200px] mx-auto">
        <p
          className="text-center"
          style={{
            fontSize: 12, fontWeight: 600, letterSpacing: 2,
            color: 'var(--xima-blue)', textTransform: 'uppercase', marginBottom: 18,
          }}
        >
          {t('landing.how_it_works.label')}
        </p>
        <h2
          className="text-center mb-16"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: 'var(--xima-text)', letterSpacing: '-0.01em' }}
        >
          {t('landing.how_it_works.title')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative">
          {KEYS.map((k, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={k} className="flex flex-col items-center text-center relative">
                {/* Dotted connector (desktop) */}
                {i < KEYS.length - 1 && (
                  <div
                    className="hidden md:block absolute"
                    style={{
                      top: 28,
                      left: 'calc(50% + 32px)',
                      right: 'calc(-50% + 32px)',
                      borderTop: '2px dotted var(--xima-blue)',
                      opacity: 0.35,
                    }}
                  />
                )}
                {/* Icon circle */}
                <div
                  className="flex items-center justify-center mb-4 relative z-10"
                  style={{
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: 'var(--xima-surface)',
                    border: '2px solid var(--xima-blue)',
                    color: 'var(--xima-blue)',
                    boxShadow: '0 6px 18px rgba(11,107,255,0.12)',
                  }}
                >
                  <Icon className="w-6 h-6" strokeWidth={1.7} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--xima-blue)', marginBottom: 8 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--xima-text)', marginBottom: 6, lineHeight: 1.3 }}>
                  {t(`landing.how_it_works.${k}.title`)}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--xima-text-muted)', lineHeight: 1.55, maxWidth: 200 }}>
                  {t(`landing.how_it_works.${k}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
