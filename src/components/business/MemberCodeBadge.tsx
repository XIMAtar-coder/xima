import React from 'react';
import { BadgeCheck, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberCodeBadgeProps {
  code?: string | null;
  variant?: 'default' | 'founding';
  className?: string;
}

/**
 * Anonymous member-code chip ("Member #A001").
 * Renders nothing when no code is provided.
 * subscriber_code is a non-PII sequential code — never exposes identity.
 */
export const MemberCodeBadge: React.FC<MemberCodeBadgeProps> = ({ code, variant = 'default', className }) => {
  if (!code) return null;

  const Icon = variant === 'founding' ? Crown : BadgeCheck;
  const styles =
    variant === 'founding'
      ? 'bg-amber-500/15 border-amber-500/25 text-amber-700 dark:text-amber-300'
      : 'bg-muted/60 border-border text-foreground/80';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        styles,
        className
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      Member #{code}
    </span>
  );
};
