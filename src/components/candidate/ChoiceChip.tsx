import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toggle chip from the preferences redesign: a blue border and a visible
 * check mark say "selected" without relying on colour alone.
 */
interface ChoiceChipProps {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hint?: React.ReactNode;
  /** Radio semantics (one of many) instead of checkbox. */
  role?: 'checkbox' | 'radio';
  disabled?: boolean;
  className?: string;
}

export const ChoiceChip: React.FC<ChoiceChipProps> = ({ selected, onToggle, children, hint, role = 'checkbox', disabled, className }) => (
  <button
    type="button"
    role={role}
    aria-checked={selected}
    disabled={disabled}
    onClick={onToggle}
    className={cn(
      'inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 text-left text-[14px] transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      selected
        ? 'border-primary bg-primary/[0.07] font-medium text-foreground'
        : 'border-[hsl(var(--xs-line))] bg-card text-foreground hover:border-primary/50',
      disabled && 'opacity-50',
      className,
    )}
  >
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
        selected ? 'border-primary bg-primary text-white' : 'border-[hsl(var(--xs-line))] bg-background',
      )}
    >
      {selected && <Check size={12} strokeWidth={3} />}
    </span>
    <span className="min-w-0">
      <span className="block leading-tight">{children}</span>
      {hint && <span className="block text-[12px] font-normal text-muted-foreground">{hint}</span>}
    </span>
  </button>
);

export default ChoiceChip;
