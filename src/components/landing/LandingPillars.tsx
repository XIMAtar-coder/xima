import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, MessageCircle, BookOpen, Lightbulb, Zap } from 'lucide-react';

type PillarKey = 'computational_power' | 'communication' | 'knowledge' | 'creativity' | 'drive';

const ICONS: Record<PillarKey, React.ReactNode> = {
  computational_power: <Cpu className="w-7 h-7" strokeWidth={1.6} />,
  communication: <MessageCircle className="w-7 h-7" strokeWidth={1.6} />,
  knowledge: <BookOpen className="w-7 h-7" strokeWidth={1.6} />,
  creativity: <Lightbulb className="w-7 h-7" strokeWidth={1.6} />,
  drive: <Zap className="w-7 h-7" strokeWidth={1.6} />,
};

const ORDER: PillarKey[] = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'];

export const LandingPillars: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-6 lg:px-10" style={{ background: '#F7FAFF' }}>
      <div className="max-w-[1200px] mx-auto">
        <h2
          className="text-center mb-5"
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            color: '#071E3A',
            letterSpacing: '-0.01em',
          }}
        >
          {t('pillars.title')}
        </h2>

        <div className="max-w-[680px] mx-auto text-center mb-14">
          <p
            style={{
              fontSize: 18,
              color: '#607089',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}
          >
            {t('pillars.storytelling')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {ORDER.map((key) => (
            <div
              key={key}
              className="group transition-all duration-300"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(10,40,80,0.06)',
                borderRadius: 20,
                padding: 24,
                boxShadow: '0 4px 20px rgba(7,30,58,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(7,30,58,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(7,30,58,0.04)';
              }}
            >
              <div className="mb-4" style={{ color: '#0B6BFF' }}>
                {ICONS[key]}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#071E3A',
                  marginBottom: 8,
                }}
              >
                {t(`pillars.items.${key}.name`)}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: '#607089',
                  lineHeight: 1.6,
                }}
              >
                {t(`pillars.items.${key}.tagline`)}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-[720px] mx-auto text-center mt-14 space-y-5">
          <p style={{ fontSize: 16, color: '#607089', lineHeight: 1.7 }}>
            {t('pillars.ximatar_intro')}
          </p>
          <p
            style={{
              fontSize: 18,
              color: '#0B6BFF',
              fontWeight: 500,
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}
          >
            {t('pillars.compass')}
          </p>
          <p style={{ fontSize: 15, color: '#607089', lineHeight: 1.7 }}>
            {t('pillars.explanation')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default LandingPillars;
