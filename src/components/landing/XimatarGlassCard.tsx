import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Archetype } from './archetypes';

interface Props {
  archetype: Archetype;
  transitioning: boolean;
  onNext: () => void;
  variant?: 'desktop' | 'mobile';
}

export const XimatarGlassCard: React.FC<Props> = ({ archetype, transitioning, variant = 'desktop' }) => {
  const { t } = useTranslation();
  const isMobile = variant === 'mobile';
  // The mobile card sits on the page background and stays dark; the desktop one
  // lies over the photo and is light, so the text colours follow the surface.
  const ink = isMobile ? 'white' : 'var(--xima-text)';
  const inkSoft = isMobile ? 'rgba(255,255,255,0.85)' : 'var(--xima-text-muted)';
  const inkFaint = isMobile ? 'rgba(255,255,255,0.75)' : 'var(--xima-text-muted)';
  const accent = isMobile ? '#7DB3FF' : 'var(--xima-blue)';

  return (
    <div
      className={isMobile ? 'relative w-full animate-fade-in' : 'absolute hidden lg:block animate-fade-in'}
      style={
        isMobile
          ? {
              width: '100%',
              minHeight: 180,
              background: 'rgba(15,25,45,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 24,
              boxShadow: '0 16px 40px rgba(7,30,58,0.35)',
              color: 'white',
            }
          : {
              right: '3%',
              top: 420,
              width: 400,
              minHeight: 200,
              background: 'rgba(255,255,255,0.62)',
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.75)',
              borderRadius: 28,
              boxShadow: '0 20px 50px rgba(7,30,58,0.12)',
              color: 'var(--xima-text)',
              animationDelay: '0.5s',
            }
      }
    >
      <div
        className="flex h-full p-5 gap-3"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        <div className="flex-1 flex flex-col">
          <span className="text-[10px] font-semibold tracking-[2px] mb-1.5" style={{ color: inkFaint }}>
            {t('landing.ximatar_card.label')}
          </span>
          <h3 className="text-[28px] font-bold leading-none mb-1" style={{ color: ink }}>
            {archetype.name}
          </h3>
          <p className="text-[13px] font-semibold mb-2" style={{ color: accent }}>
            {t(`landing.archetypes.${archetype.id}.trait`, archetype.trait)}
          </p>
          <p className="text-[12px] leading-[1.5]" style={{ color: inkSoft }}>
            {t(`landing.archetypes.${archetype.id}.description`, archetype.description)}
          </p>
        </div>

        <div className="relative flex items-center justify-center" style={{ width: 120 }}>
          <div
            style={{
              width: 110,
              height: 110,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: isMobile
                ? 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.45))',
              border: isMobile ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.9)',
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

    </div>
  );
};

export default XimatarGlassCard;
