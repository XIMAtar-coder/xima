import React from "react";

export const AssistantAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="g" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground) / 0.1)" />
          <stop offset="100%" stopColor="hsl(var(--muted) / 0.4)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#g)" />
      <circle cx="24" cy="28" r="3" fill="hsl(var(--foreground) / 0.9)" />
      <circle cx="40" cy="28" r="3" fill="hsl(var(--foreground) / 0.9)" />
      <path d="M22 40c3 3 7 5 10 5s7-2 10-5" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
};

export default AssistantAvatar;
