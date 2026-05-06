import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, MessageCircle, BookOpen, Lightbulb, Zap,
  ChevronDown, ChevronUp, ArrowRight, Check, AlertTriangle,
} from 'lucide-react';

type PillarKey = 'drive' | 'computational' | 'knowledge' | 'communication' | 'creativity';

const ICONS: Record<PillarKey, React.ReactNode> = {
  drive: <Zap className="w-8 h-8" strokeWidth={1.6} />,
  computational: <Cpu className="w-8 h-8" strokeWidth={1.6} />,
  knowledge: <BookOpen className="w-8 h-8" strokeWidth={1.6} />,
  communication: <MessageCircle className="w-8 h-8" strokeWidth={1.6} />,
  creativity: <Lightbulb className="w-8 h-8" strokeWidth={1.6} />,
};

const ORDER: PillarKey[] = ['drive', 'computational', 'knowledge', 'communication', 'creativity'];

const NAVY = 'var(--xima-text)';
const MUTED = 'var(--xima-text-muted)';
const BLUE = 'var(--xima-blue)';

export const LandingPillars: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<PillarKey | null>(null);

  return (
    <section className="py-24 px-6 lg:px-10" style={{ background: 'var(--xima-bg)' }}>
      <div className="max-w-[1200px] mx-auto">
        <p
          className="text-center"
          style={{
            fontSize: 12, fontWeight: 600, letterSpacing: 2,
            color: BLUE, textTransform: 'uppercase', marginBottom: 18,
          }}
        >
          {t('landing.pillars.label')}
        </p>
        <h2
          className="text-center mb-4"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}
        >
          {t('landing.pillars.title')}
        </h2>
        <p className="text-center mb-14" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6 }}>
          {t('landing.pillars.subtitle')}
        </p>

        {/* Cards row */}
        <div className="grid gap-4 sm:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {ORDER.map((key) => {
            const isOpen = expanded === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setExpanded(isOpen ? null : key)}
                aria-expanded={isOpen}
                className="text-left transition-all duration-300 relative"
                style={{
                  background: 'var(--xima-surface)',
                  border: `1px solid ${isOpen ? 'rgba(11,107,255,0.35)' : 'var(--xima-border)'}`,
                  borderRadius: 16,
                  padding: 22,
                  boxShadow: isOpen
                    ? '0 16px 40px rgba(7,30,58,0.10)'
                    : '0 4px 18px rgba(7,30,58,0.04)',
                }}
                onMouseEnter={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(7,30,58,0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(7,30,58,0.04)';
                  }
                }}
              >
                <div className="absolute top-4 right-4" style={{ color: MUTED }}>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div className="mb-4" style={{ color: BLUE }}>{ICONS[key]}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                  {t(`landing.pillars.items.${key}.title`)}
                </h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
                  {t(`landing.pillars.items.${key}.subtitle`)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Expanded panel below the row */}
        {expanded && (
          <div
            className="mt-6 animate-fade-in"
            style={{
              background: 'var(--xima-surface-soft, #F7FAFF)',
              border: '1px solid var(--xima-border)',
              borderRadius: 20,
              padding: 32,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span style={{ color: BLUE }}>{ICONS[expanded]}</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
                {t(`landing.pillars.items.${expanded}.title`)}
              </h3>
            </div>

            {/* What */}
            <div className="mb-6">
              <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
                {t('landing.pillars.what_label')}
              </h4>
              <p style={{ fontSize: 16, color: NAVY, lineHeight: 1.7 }}>
                {t(`landing.pillars.items.${expanded}.what`)}
              </p>
            </div>

            {/* Strong / Weak */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div
                style={{
                  background: 'var(--xima-surface)',
                  border: '1px solid rgba(11,107,255,0.18)',
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div className="flex items-center gap-2 mb-2" style={{ color: BLUE }}>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('landing.pillars.strong_label')}
                  </span>
                </div>
                <p style={{ fontSize: 15, color: NAVY, lineHeight: 1.6 }}>
                  {t(`landing.pillars.items.${expanded}.strong`)}
                </p>
              </div>
              <div
                style={{
                  background: 'var(--xima-surface)',
                  border: '1px solid rgba(194,65,12,0.18)',
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div className="flex items-center gap-2 mb-2" style={{ color: '#C2410C' }}>
                  <AlertTriangle className="w-4 h-4" strokeWidth={2.2} />
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('landing.pillars.weak_label')}
                  </span>
                </div>
                <p style={{ fontSize: 15, color: NAVY, lineHeight: 1.6 }}>
                  {t(`landing.pillars.items.${expanded}.weak`)}
                </p>
              </div>
            </div>

            {/* How */}
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
                {t('landing.pillars.how_label')}
              </h4>
              <p style={{ fontSize: 15, color: NAVY, lineHeight: 1.7 }}>
                {t(`landing.pillars.items.${expanded}.how`)}
              </p>
            </div>
          </div>
        )}

        {/* Free CTA */}
        <div className="max-w-[720px] mx-auto text-center mt-20">
          <h3 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: NAVY, marginBottom: 10 }}>
            {t('landing.free_cta_title')}
          </h3>
          <p style={{ fontSize: 17, color: MUTED, marginBottom: 28, lineHeight: 1.5 }}>
            {t('landing.free_cta_subtitle')}
          </p>
          <button
            onClick={() => navigate('/ximatar-journey')}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: BLUE,
              color: 'white',
              borderRadius: 14,
              padding: '16px 32px',
              fontWeight: 600,
              fontSize: 16,
              boxShadow: '0 16px 35px rgba(11,107,255,0.20)',
            }}
          >
            {t('landing.free_cta_button')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingPillars;
