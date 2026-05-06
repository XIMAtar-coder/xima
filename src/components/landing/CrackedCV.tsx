import React from 'react';

/**
 * Powerful "torn CV" illustration: a document splitting vertically with a
 * bright XIMA blue glow shining through the gap. Pure SVG + CSS animations.
 */
export const CrackedCV: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: '4 / 5', maxWidth: 460 }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes ccv-glow-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes ccv-breath-left {
          0%, 100% { transform: rotate(-2deg) translateX(0); }
          50% { transform: rotate(-2.5deg) translateX(-1px); }
        }
        @keyframes ccv-breath-right {
          0%, 100% { transform: rotate(2deg) translateX(0); }
          50% { transform: rotate(2.5deg) translateX(1px); }
        }
        @keyframes ccv-particle {
          0% { transform: translate(0, 0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--ccv-dx, 0), -60px); opacity: 0; }
        }
        .ccv-half-left { transform-origin: 100% 50%; animation: ccv-breath-left 4s ease-in-out infinite; }
        .ccv-half-right { transform-origin: 0% 50%; animation: ccv-breath-right 4s ease-in-out infinite; }
        .ccv-glow { animation: ccv-glow-pulse 3s ease-in-out infinite; transform-origin: center; }
        .ccv-particle { animation: ccv-particle 4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ccv-half-left, .ccv-half-right, .ccv-glow, .ccv-particle { animation: none; }
        }
      `}</style>

      <svg viewBox="0 0 400 500" className="w-full h-full overflow-visible">
        <defs>
          <filter id="ccv-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="20" stdDeviation="22" floodColor="#071E3A" floodOpacity="0.18" />
          </filter>
          <radialGradient id="ccv-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="25%" stopColor="#7FB4FF" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#0B6BFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0B6BFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ccv-tear-edge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0B6BFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#0B6BFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0B6BFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background blue glow shining through the tear */}
        <ellipse
          cx="200"
          cy="250"
          rx="60"
          ry="240"
          fill="url(#ccv-glow-grad)"
          className="ccv-glow"
        />

        {/* Document — wrapped to apply a slight overall ~5deg rotation */}
        <g transform="rotate(-2 200 250)">
          {/* LEFT HALF */}
          <g className="ccv-half-left">
            <g filter="url(#ccv-shadow)">
              <path
                d="M 40 40 L 196 40 L 196 460 L 40 460 Z"
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              {/* Jagged tear edge highlight */}
              <path
                d="M 196 40 L 192 90 L 196 140 L 190 200 L 196 260 L 188 320 L 196 380 L 192 430 L 196 460"
                fill="none"
                stroke="url(#ccv-tear-edge)"
                strokeWidth="1.5"
              />

              {/* Faded CV content */}
              <text
                x="62"
                y="90"
                fontFamily="ui-sans-serif, system-ui"
                fontWeight="800"
                fontSize="32"
                fill="#0F172A"
                opacity="0.18"
                letterSpacing="2"
              >
                CV
              </text>
              <rect x="62" y="140" width="110" height="6" rx="3" fill="#0F172A" opacity="0.15" />
              <rect x="62" y="160" width="90" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="62" y="200" width="120" height="6" rx="3" fill="#0F172A" opacity="0.15" />
              <rect x="62" y="220" width="80" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="62" y="260" width="100" height="6" rx="3" fill="#0F172A" opacity="0.15" />
              <rect x="62" y="300" width="115" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="62" y="320" width="70" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="62" y="380" width="105" height="6" rx="3" fill="#0F172A" opacity="0.15" />
            </g>
          </g>

          {/* RIGHT HALF */}
          <g className="ccv-half-right">
            <g filter="url(#ccv-shadow)">
              <path
                d="M 204 40 L 360 40 L 360 460 L 204 460 Z"
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <path
                d="M 204 40 L 208 90 L 204 140 L 210 200 L 204 260 L 212 320 L 204 380 L 208 430 L 204 460"
                fill="none"
                stroke="url(#ccv-tear-edge)"
                strokeWidth="1.5"
              />

              {/* Photo placeholder, top-right */}
              <rect
                x="298"
                y="60"
                width="46"
                height="56"
                rx="3"
                fill="#0F172A"
                opacity="0.12"
              />

              {/* Faded text lines (right side) */}
              <rect x="220" y="140" width="60" height="6" rx="3" fill="#0F172A" opacity="0.15" />
              <rect x="220" y="160" width="100" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="220" y="200" width="80" height="6" rx="3" fill="#0F172A" opacity="0.15" />
              <rect x="220" y="220" width="120" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="220" y="260" width="90" height="6" rx="3" fill="#0F172A" opacity="0.15" />
              <rect x="220" y="300" width="110" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="220" y="320" width="60" height="6" rx="3" fill="#0F172A" opacity="0.12" />
              <rect x="220" y="380" width="95" height="6" rx="3" fill="#0F172A" opacity="0.15" />
            </g>
          </g>
        </g>

        {/* Floating fragments drifting upward from the tear */}
        <g>
          <rect
            x="196"
            y="240"
            width="6"
            height="6"
            rx="1"
            fill="#FFFFFF"
            stroke="#0B6BFF"
            strokeWidth="0.5"
            className="ccv-particle"
            style={{ ['--ccv-dx' as any]: '-18px', animationDelay: '0s' }}
          />
          <rect
            x="198"
            y="180"
            width="4"
            height="4"
            rx="1"
            fill="#0B6BFF"
            opacity="0.8"
            className="ccv-particle"
            style={{ ['--ccv-dx' as any]: '14px', animationDelay: '1.2s' }}
          />
          <rect
            x="194"
            y="320"
            width="5"
            height="5"
            rx="1"
            fill="#FFFFFF"
            stroke="#0B6BFF"
            strokeWidth="0.5"
            className="ccv-particle"
            style={{ ['--ccv-dx' as any]: '-10px', animationDelay: '2.1s' }}
          />
          <rect
            x="200"
            y="280"
            width="3"
            height="3"
            rx="0.5"
            fill="#7FB4FF"
            className="ccv-particle"
            style={{ ['--ccv-dx' as any]: '20px', animationDelay: '0.6s' }}
          />
        </g>
      </svg>
    </div>
  );
};

export default CrackedCV;
