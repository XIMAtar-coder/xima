import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Layers, Activity } from 'lucide-react';

export const FeatureStrip: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    { Icon: ShieldCheck, title: t('landing.features.gdpr_title'), sub: t('landing.features.gdpr_subtitle') },
    { Icon: Lock, title: t('landing.features.demographic_title'), sub: t('landing.features.demographic_subtitle') },
    { Icon: Layers, title: t('landing.features.pillars_title'), sub: t('landing.features.pillars_subtitle') },
    { Icon: Activity, title: t('landing.features.ai_title'), sub: t('landing.features.ai_subtitle') },
  ];

  return (
    <div
      className="relative mx-auto animate-fade-in"
      style={{
        marginTop: -50,
        maxWidth: '92%',
        background: 'var(--xima-surface-soft)',
        border: '1px solid var(--xima-border)',
        borderRadius: 28,
        boxShadow: '0 24px 70px rgba(7,30,58,0.10)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        padding: '28px 36px',
        zIndex: 10,
        animationDelay: '0.8s',
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0">
        {features.map((f, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 ${
              i > 0 ? 'lg:pl-8 lg:border-l lg:border-[rgba(10,40,80,0.08)]' : ''
            } lg:pr-4`}
          >
            <f.Icon className="w-9 h-9 flex-shrink-0" strokeWidth={1.5} style={{ color: '#0B6BFF' }} />
            <div>
              <div className="text-[15px] font-semibold leading-tight" style={{ color: '#071E3A' }}>
                {f.title}
              </div>
              <div className="text-[14px]" style={{ color: '#607089' }}>
                {f.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureStrip;
