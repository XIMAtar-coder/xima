import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export const LandingFinalCTA: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden px-6 lg:px-10 py-20 md:py-28"
      style={{
        background: 'linear-gradient(135deg, #071E3A 0%, #0A2A5E 100%)',
      }}
    >
      {/* Decorative wave */}
      <svg
        className="absolute right-0 bottom-0 pointer-events-none"
        width="60%"
        height="100%"
        viewBox="0 0 800 600"
        aria-hidden="true"
        style={{ opacity: 0.35 }}
      >
        <defs>
          <linearGradient id="cta-wave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B6BFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0B6BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 24 }).map((_, i) => (
          <path
            key={i}
            d={`M ${100 + i * 30} 600 Q ${300 + i * 18} ${300 - i * 8}, ${800} ${200 + i * 6}`}
            fill="none"
            stroke="url(#cta-wave)"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="max-w-[1200px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <img
            src="/images/xima-full-white.svg"
            alt="XIMA"
            style={{ height: 32, width: 'auto', marginBottom: 24 }}
          />
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              marginBottom: 16,
            }}
          >
            {t('landing.final_cta.headline')}
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, maxWidth: 480 }}>
            {t('landing.final_cta.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:items-end">
          <button
            onClick={() => navigate('/ximatar-journey')}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#0B6BFF',
              color: '#FFFFFF',
              borderRadius: 14,
              padding: '16px 28px',
              fontWeight: 600,
              fontSize: 16,
              minWidth: 260,
              boxShadow: '0 18px 40px rgba(11,107,255,0.35)',
            }}
          >
            {t('landing.final_cta.primary')}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/business')}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'transparent',
              color: '#FFFFFF',
              borderRadius: 14,
              padding: '16px 28px',
              fontWeight: 600,
              fontSize: 16,
              minWidth: 260,
              border: '1.5px solid rgba(255,255,255,0.6)',
            }}
          >
            {t('landing.final_cta.secondary')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingFinalCTA;
