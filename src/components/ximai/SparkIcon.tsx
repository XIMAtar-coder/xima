import React from "react";

interface SparkIconProps {
  size?: number;
  className?: string;
  isActive?: boolean;
}

export const SparkIcon: React.FC<SparkIconProps> = ({ 
  size = 24, 
  className = "",
  isActive = false
}) => {
  const sparkId = `spark-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} ${isActive ? 'animate-pulse-gentle' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={sparkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
        </linearGradient>
      </defs>
      
      {/* Main spark/wave shape - geometric and minimal */}
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill={`url(#${sparkId})`}
        className={`transition-all duration-150 ${isActive ? 'opacity-80' : 'opacity-100'}`}
      />
      
      {/* Additional subtle accent marks */}
      <circle 
        cx="12" 
        cy="10" 
        r="1.5" 
        fill="hsl(var(--background))" 
        className="transition-all duration-150"
      />
    </svg>
  );
};

export default SparkIcon;