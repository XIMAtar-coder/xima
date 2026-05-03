import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { Archetype } from './archetypes';

interface Props {
  archetype: Archetype;
  transitioning: boolean;
  onNext: () => void;
}

export const XimatarGlassCard: React.FC<Props> = ({ archetype, transitioning, onNext }) => {
  const { t } = useTranslation();

  return (
    <div
      className="absolute hidden lg:block animate-fade-in"
      style={{
        right: '3%',
        top: 420,
        width: 400,
        minHeight: 200,
        background: 'rgba(20,35,55,0.16)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.36)',
        borderRadius: 28,
        boxShadow: '0 24px 70px rgba(7,30,58,0.22)',
        color: 'white',
        animationDelay: '0.5s',
      }}
    >
      <div
        className="flex h-full p-5 gap-3"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        <div className="flex-1 flex flex-col">
          <span className="text-[10px] font-semibold tracking-[2px] mb-1.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {t('landing.ximatar_card.label')}
          </span>
          <h3 className="text-[28px] font-bold leading-none mb-1" style={{ color: 'white' }}>
            {archetype.name}
          </h3>
          <p className="text-[13px] font-semibold mb-2" style={{ color: '#7DB3FF' }}>
            {archetype.trait}
          </p>
          <p className="text-[12px] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {archetype.description}
          </p>
        </div>

        <div className="relative flex items-center justify-center" style={{ width: 120 }}>
          <div
            style={{
              width: 110,
              height: 110,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: 4,
            }}
          >
            <img
              src={archetype.image}
              alt={`${archetype.name} XIMAtar`}
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
        onClick={onNext}
        aria-label="Next archetype"
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
