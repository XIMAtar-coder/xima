import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, MessageCircle, BookOpen, Lightbulb, Zap,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';

type PillarKey = 'computational_power' | 'communication' | 'knowledge' | 'creativity' | 'drive';

const ICONS: Record<PillarKey, React.ReactNode> = {
  computational_power: <Cpu className="w-7 h-7" strokeWidth={1.6} />,
  communication: <MessageCircle className="w-7 h-7" strokeWidth={1.6} />,
  knowledge: <BookOpen className="w-7 h-7" strokeWidth={1.6} />,
  creativity: <Lightbulb className="w-7 h-7" strokeWidth={1.6} />,
  drive: <Zap className="w-7 h-7" strokeWidth={1.6} />,
};

const ORDER: PillarKey[] = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'];

// Maps card key -> i18n root key for as_strength/as_weakness (which lives at pillars.<root>)
const STRENGTH_ROOT: Record<PillarKey, string> = {
  computational_power: 'computational',
  communication: 'communication',
  knowledge: 'knowledge',
  creativity: 'creativity',
  drive: 'drive',
};

const NAVY = 'var(--xima-text)';
const MUTED = 'var(--xima-text-muted)';
const BLUE = 'var(--xima-blue)';

export const LandingPillars: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<PillarKey | null>(null);

  return (
    <section className="py-20 px-6 lg:px-10" style={{ background: '#F7FAFF' }}>
      <div className="max-w-[1200px] mx-auto">
        <h2
          className="text-center mb-5"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}
        >
          {t('pillars.title')}
        </h2>

        <div className="max-w-[680px] mx-auto text-center mb-12">
          <p style={{ fontSize: 18, color: MUTED, fontStyle: 'italic', lineHeight: 1.6 }}>
            {t('pillars.storytelling')}
          </p>
        </div>

        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}
        >
          {ORDER.map((key) => {
            const isOpen = expanded === key;
            const name = t(`pillars.items.${key}.name`);
            const tagline = t(`pillars.items.${key}.tagline`);
            const description = t(`pillars.items.${key}.description`);
            const root = STRENGTH_ROOT[key];
            const strength = t(`pillars.${root}.as_strength`);
            const weakness = t(`pillars.${root}.as_weakness`);

            const evalRaw = t(`pillars.items.${key}.how_we_evaluate`, { returnObjects: true });
            const evalList = Array.isArray(evalRaw) ? (evalRaw as string[]) : [];
            const tipsRaw = t(`pillars.items.${key}.tips`, { returnObjects: true });
            const tipsList = Array.isArray(tipsRaw) ? (tipsRaw as string[]) : [];

            return (
              <button
                key={key}
                type="button"
                onClick={() => setExpanded(isOpen ? null : key)}
                aria-expanded={isOpen}
                className="text-left transition-all duration-300 relative"
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${isOpen ? 'rgba(11,107,255,0.35)' : 'rgba(10,40,80,0.06)'}`,
                  borderRadius: 20,
                  padding: 24,
                  boxShadow: isOpen
                    ? '0 16px 40px rgba(7,30,58,0.10)'
                    : '0 4px 20px rgba(7,30,58,0.04)',
                  gridColumn: isOpen ? '1 / -1' : 'auto',
                }}
                onMouseEnter={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(7,30,58,0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(7,30,58,0.04)';
                  }
                }}
              >
                <div className="absolute top-5 right-5" style={{ color: MUTED }}>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>

                <div className="mb-4" style={{ color: BLUE }}>{ICONS[key]}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: NAVY, marginBottom: 8 }}>{name}</h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{tagline}</p>

                {isOpen && (
                  <div className="mt-6 pt-6 animate-fade-in" style={{ borderTop: '1px solid rgba(10,40,80,0.08)' }}>
                    <div className="grid md:grid-cols-3 gap-8">
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
                          {t('pillars.detail_description', 'Descrizione')}
                        </h4>
                        <p style={{ fontSize: 14, color: NAVY, lineHeight: 1.6, marginBottom: 14 }}>
                          {description}
                        </p>
                        <div className="space-y-2">
                          <p style={{ fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: BLUE }}>{t('common.as_strength')}: </span>
                            {strength}
                          </p>
                          <p style={{ fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: '#C2410C' }}>{t('common.as_weakness')}: </span>
                            {weakness}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
                          {t('pillars.how_we_evaluate', 'Come valutiamo')}
                        </h4>
                        <ul className="space-y-2">
                          {evalList.map((item, i) => (
                            <li key={i} className="flex gap-2" style={{ fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: BLUE }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
                          {t('pillars.tips_to_improve', 'Suggerimenti per migliorare')}
                        </h4>
                        <ul className="space-y-2">
                          {tipsList.map((item, i) => (
                            <li key={i} className="flex gap-2" style={{ fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: BLUE }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Archetype explanation */}
        <div className="max-w-[760px] mx-auto text-center mt-16 space-y-5">
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7 }}>
            {t('pillars.assignment_logic')}
          </p>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7 }}>
            {t('pillars.drive_paths')}
          </p>
          <p style={{ fontSize: 18, color: BLUE, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.6, paddingTop: 8 }}>
            {t('pillars.compass')}
          </p>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>
            {t('pillars.explanation')}
          </p>
        </div>

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
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(11,107,255,0.28)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 16px 35px rgba(11,107,255,0.20)';
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
