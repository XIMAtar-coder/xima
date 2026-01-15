import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

export type FeedChipVariant = 'level' | 'verified' | 'category';

interface FeedChipProps {
  variant: FeedChipVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<FeedChipVariant, string> = {
  level: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  verified: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/20',
  category: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
};

export const FeedChip = ({ variant, children, className }: FeedChipProps) => {
  const isVerified = variant === 'verified';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {isVerified && <CheckCircle2 className="h-2.5 w-2.5" />}
      {children}
    </span>
  );
};
