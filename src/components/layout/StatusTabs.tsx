import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Flat tab strip with counts from the redesign ("Tutte 3 · Attive 1 · Archiviate 2").
 * Filter buttons, not routed tabs: aria-pressed instead of role=tab.
 */
export interface StatusTabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export function StatusTabs<T extends string>({
  items, value, onChange, label, className,
}: {
  items: StatusTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-[hsl(var(--xs-line))]', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('xs-num rounded-full px-1.5 text-xs', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default StatusTabs;
