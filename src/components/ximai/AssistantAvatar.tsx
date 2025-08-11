import React from "react";

interface AssistantAvatarProps {
  size?: number; 
  className?: string;
  isActive?: boolean;
  isThinking?: boolean;
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ 
  size = 40, 
  className,
  isActive = false,
  isThinking = false
}) => {
  const s = size;
  const gradientId = `avatar-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const glowId = `avatar-glow-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`relative ${className || ''}`}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="relative z-10"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.12)" />
            <stop offset="60%" stopColor="hsl(var(--muted) / 0.25)" />
            <stop offset="100%" stopColor="hsl(var(--muted) / 0.4)" />
          </radialGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main avatar circle with premium gradient */}
        <circle 
          cx="32" 
          cy="32" 
          r="28" 
          fill={`url(#${gradientId})`}
          filter={isActive ? `url(#${glowId})` : undefined}
          className="transition-all duration-300"
        />
        
        {/* Eyes with subtle design */}
        <circle cx="24" cy="27" r="2.5" fill="hsl(var(--foreground) / 0.85)" />
        <circle cx="40" cy="27" r="2.5" fill="hsl(var(--foreground) / 0.85)" />
        
        {/* Subtle smile */}
        <path 
          d="M23 38c2.5 2.5 6 4 9 4s6.5-1.5 9-4" 
          stroke="hsl(var(--foreground) / 0.65)" 
          strokeWidth="1.5" 
          fill="none" 
          strokeLinecap="round" 
        />
      </svg>
      
      {/* Active state glow ring */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse-gentle"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)`,
            transform: 'scale(1.2)',
          }}
        />
      )}
      
      {/* Thinking state indicator */}
      {isThinking && (
        <div className="absolute -bottom-1 -right-1 flex space-x-0.5">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

export default AssistantAvatar;
