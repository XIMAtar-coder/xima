import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export const XimatarGlassCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      className="absolute hidden lg:block animate-fade-in"
      style={{
        right: '5%',
        top: 372,
        width: 480,
        minHeight: 240,
        background: 'rgba(20,35,55,0.32)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '1px solid rgba(255,255,255,0.42)',
        borderRadius: 28,
        boxShadow: '0 24px 70px rgba(7,30,58,0.22)',
        color: 'white',
        animationDelay: '0.5s',
      }}
    >
      <div className="flex h-full p-6 gap-4">
        <div className="flex-1 flex flex-col">
          <span
            className="text-[10px] font-semibold tracking-[2px] mb-2"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {t('landing.ximatar_card.label')}
          </span>
          <h3 className="text-[34px] font-bold leading-none mb-1" style={{ color: 'white' }}>
            {t('landing.ximatar_card.name')}
          </h3>
          <p
            className="text-[15px] font-semibold mb-3"
            style={{ color: '#7DB3FF' }}
          >
            {t('landing.ximatar_card.trait')}
          </p>
          <p
            className="text-[12.5px] leading-[1.55]"
            style={{ color: 'rgba(255,255,255,0.82)' }}
          >
            {t('landing.ximatar_card.description')}
          </p>
        </div>

        <div className="relative flex items-center justify-center" style={{ width: 150 }}>
          <div
            style={{
              width: 140,
              height: 140,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: 4,
            }}
          >
            <img
              src="/ximatars/horse.png"
              alt="Horse XIMAtar"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
            />
          </div>
        </div>
      </div>

      <button
        aria-label="More archetypes"
        className="absolute -bottom-3 -right-3 flex items-center justify-center transition-transform hover:scale-110"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: '#0B6BFF',
          color: 'white',
          boxShadow: '0 8px 24px rgba(11,107,255,0.45)',
          border: '2px solid white',
        }}
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default XimatarGlassCard;
