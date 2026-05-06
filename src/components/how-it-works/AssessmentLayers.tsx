import React from 'react';

/**
 * Stylized 3D "stack of glass platforms" visual representing L1/L2/L3.
 * Pure CSS — themes correctly in light & dark. Replace with /images/assessment-layers.png
 * by editing the wrapper if/when the PNG asset is uploaded.
 */
export const AssessmentLayers: React.FC<{ labels: { l1: string; l2: string; l3: string } }> = ({ labels }) => {
  const platform = (top: number, scale: number, hue: number) =>
    ({
      position: 'absolute' as const,
      top: `${top}%`,
      left: '50%',
      transform: `translateX(-50%) perspective(900px) rotateX(58deg) scale(${scale})`,
      width: '320px',
      height: '90px',
      borderRadius: '20px',
      background: `linear-gradient(135deg, hsl(${hue} 80% 60% / 0.55), hsl(${hue} 80% 50% / 0.35))`,
      border: '1px solid hsl(var(--primary) / 0.4)',
      boxShadow: `0 30px 60px -20px hsl(${hue} 80% 40% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.4)`,
      backdropFilter: 'blur(10px)',
    });

  return (
    <div className="relative w-full aspect-[4/3] max-w-[520px] mx-auto select-none">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(var(--primary) / 0.18) 0%, transparent 65%)',
          filter: 'blur(20px)',
        }}
      />

      {/* L3 - top */}
      <div style={platform(15, 0.85, 217)} />
      {/* L2 - mid */}
      <div style={platform(40, 1.0, 217)} />
      {/* L1 - base */}
      <div style={platform(65, 1.15, 217)} />

      {/* Vertical light beam */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[10%] bottom-[10%] w-px"
        style={{
          background:
            'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.5), transparent)',
        }}
      />

      {/* Labels */}
      <span className="absolute right-[6%] top-[14%] text-xs font-mono font-semibold text-primary px-2 py-1 rounded-full bg-background/70 backdrop-blur border border-primary/30">
        {labels.l3}
      </span>
      <span className="absolute right-[2%] top-[40%] text-xs font-mono font-semibold text-primary px-2 py-1 rounded-full bg-background/70 backdrop-blur border border-primary/30">
        {labels.l2}
      </span>
      <span className="absolute right-[-2%] top-[66%] text-xs font-mono font-semibold text-primary px-2 py-1 rounded-full bg-background/70 backdrop-blur border border-primary/30">
        {labels.l1}
      </span>
    </div>
  );
};

export default AssessmentLayers;
