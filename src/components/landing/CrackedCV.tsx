import React from 'react';

/** Decorative cracked-CV illustration. Pure SVG, theme-aware via CSS vars. */
export const CrackedCV: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: '4 / 5', maxWidth: 460 }}>
      <svg viewBox="0 0 400 500" className="w-full h-full" aria-hidden="true">
        <defs>
          <filter id="cv-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="20" stdDeviation="22" floodColor="#071E3A" floodOpacity="0.18" />
          </filter>
          <linearGradient id="crack-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B6BFF" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#0B6BFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.7" />
          </linearGradient>
          <filter id="crack-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Page */}
        <g transform="rotate(-3 200 250)" filter="url(#cv-shadow)">
          <rect x="40" y="30" width="320" height="440" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />

          {/* CV header */}
          <text x="70" y="85" fontFamily="ui-sans-serif, system-ui" fontWeight="800" fontSize="34" fill="#071E3A" letterSpacing="2">CV</text>
          <line x1="70" y1="100" x2="200" y2="100" stroke="#0B6BFF" strokeWidth="3" />

          {/* Section labels + skeleton lines */}
          {[
            { y: 140, label: 'ESPERIENZE' },
            { y: 230, label: 'FORMAZIONE' },
            { y: 320, label: 'COMPETENZE' },
            { y: 400, label: 'LINGUE' },
          ].map((s) => (
            <g key={s.label}>
              <text x="70" y={s.y} fontFamily="ui-sans-serif, system-ui" fontWeight="700" fontSize="11" fill="#94A3B8" letterSpacing="1.5">{s.label}</text>
              <rect x="70" y={s.y + 10} width="240" height="6" rx="3" fill="#E2E8F0" />
              <rect x="70" y={s.y + 24} width="200" height="6" rx="3" fill="#EDF2F7" />
              <rect x="70" y={s.y + 38} width="220" height="6" rx="3" fill="#EDF2F7" />
            </g>
          ))}
        </g>

        {/* Crack — diagonal jagged path with blue glow */}
        <g filter="url(#crack-glow)">
          <path
            d="M 250 20 L 232 90 L 258 130 L 220 200 L 250 250 L 210 310 L 248 360 L 215 420 L 250 480"
            fill="none"
            stroke="url(#crack-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner bright core */}
          <path
            d="M 250 20 L 232 90 L 258 130 L 220 200 L 250 250 L 210 310 L 248 360 L 215 420 L 250 480"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.9"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Floating fragments */}
        <g opacity="0.85">
          <rect x="180" y="455" width="14" height="14" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
          <rect x="265" y="465" width="10" height="10" rx="2" fill="#FFFFFF" stroke="#CBD5E1" />
          <rect x="295" y="448" width="8" height="8" rx="2" fill="#0B6BFF" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
};

export default CrackedCV;
