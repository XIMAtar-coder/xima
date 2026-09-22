import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Archetype } from './archetypes';

const PILLAR_KEYS = ['drive', 'computational', 'knowledge', 'communication', 'creativity'] as const;

interface Props {
  archetype: Archetype;
  variant?: 'desktop' | 'mobile';
}

export const RadarGlassCard: React.FC<Props> = ({ archetype, variant = 'desktop' }) => {
  const { t } = useTranslation();
  // Radar sits on a translucent dark glass — always use the white symbol.
  const symbolSrc = '/images/xima-symbol-white.svg';
  const cx = 190;
  const cy = 150;
  const maxR = 88;
  const max = 10;

  const pillars = PILLAR_KEYS.map((key) => ({
    key,
    label: t(`landing.radar.${key}`),
    sub: key === 'drive' ? t('landing.radar.drive_subtitle') : '',
    value: archetype.pillarScores[key],
  }));

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  const ringPath = (r: number) =>
    pillars.map((_, i) => {
      const p = point(i, r);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + 'Z';

  const dataPath =
    pillars.map((p, i) => {
      const pt = point(i, (p.value / max) * maxR);
      return `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ') + 'Z';

  const isMobile = variant === 'mobile';
  // Same rule as the archetype card: dark surface on mobile, light frosted
  // glass over the photo on desktop, with the strokes following the surface.
  const ink = isMobile ? 'white' : 'var(--xima-text)';
  const inkOpacity = isMobile ? { value: 0.95, label: 0.75, sub: 0.6 } : { value: 1, label: 0.85, sub: 0.7 };
  const web = isMobile ? 'rgba(255,255,255,0.22)' : 'rgba(23,42,71,0.18)';
  const spoke = isMobile ? 'rgba(255,255,255,0.18)' : 'rgba(23,42,71,0.14)';
  const dot = isMobile ? 'white' : 'var(--xima-blue)';
  const dotGlow = isMobile ? 'drop-shadow(0 0 4px rgba(255,255,255,0.9))' : 'drop-shadow(0 0 3px rgba(11,107,255,0.45))';

  return (
    <div
      className={isMobile ? 'relative w-full animate-fade-in' : 'absolute hidden lg:block animate-fade-in'}
      style={
        isMobile
          ? {
              width: '100%',
              maxWidth: '100%',
              aspectRatio: '380 / 300',
              background: 'rgba(15,25,45,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 24,
              boxShadow: '0 16px 40px rgba(7,30,58,0.35)',
            }
          : {
              right: '2%',
              top: 60,
              width: 380,
              height: 300,
              background: 'rgba(255,255,255,0.62)',
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.75)',
              borderRadius: 28,
              boxShadow: '0 20px 50px rgba(7,30,58,0.12)',
            }
      }
    >
      <svg viewBox="0 0 380 300" className="w-full h-full" style={{ overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map((s, idx) => (
          <path
            key={idx}
            d={ringPath(maxR * s)}
            fill="none"
            stroke={web}
            strokeWidth={1}
          />
        ))}
        {pillars.map((_, i) => {
          const p = point(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={spoke}
              strokeWidth={1}
            />
          );
        })}
        <path
          d={dataPath}
          fill="rgba(11,107,255,0.35)"
          stroke="rgba(140,190,255,0.95)"
          strokeWidth={1.5}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(11,107,255,0.5))',
            transition: 'd 0.4s ease',
          }}
        />
        {pillars.map((p, i) => {
          const pt = point(i, (p.value / max) * maxR);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={dot}
              style={{ filter: dotGlow, transition: 'all 0.4s ease' }}
            />
          );
        })}
        <foreignObject x={cx - 14} y={cy - 14} width={28} height={28}>
          <img src={symbolSrc} alt="" style={{ width: '100%', height: '100%', opacity: 0.95 }} />
        </foreignObject>
        {pillars.map((p, i) => {
          const pt = point(i, maxR + 24);
          const anchor = pt.x < cx - 5 ? 'end' : pt.x > cx + 5 ? 'start' : 'middle';
          return (
            <g key={i} style={{ transition: 'opacity 0.3s ease' }}>
              <text x={pt.x} y={pt.y - 6} textAnchor={anchor} fill={ink} fontSize={13} fontWeight={600} opacity={inkOpacity.value}>
                {p.value.toFixed(1)}
              </text>
              <text x={pt.x} y={pt.y + 8} textAnchor={anchor} fill={ink} fontSize={10} opacity={inkOpacity.label}>
                {p.label}
              </text>
              {p.sub && (
                <text x={pt.x} y={pt.y + 20} textAnchor={anchor} fill={ink} fontSize={9} opacity={inkOpacity.sub}>
                  {p.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarGlassCard;
