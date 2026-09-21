import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Left index from the candidate redesign (settings, feed): numbered entries
 * stacked on desktop, a horizontal row of tabs on small screens.
 */
export interface SectionIndexItem {
  id: string;
  label: React.ReactNode;
  /** "01", "02"… shown in mono before the label. */
  number?: string;
  count?: number;
  href?: string;
}

interface SectionIndexProps {
  items: SectionIndexItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Use tab semantics (feed) instead of navigation links (settings). */
  asTabs?: boolean;
  ariaLabel: string;
  className?: string;
}

export const SectionIndex: React.FC<SectionIndexProps> = ({ items, activeId, onSelect, asTabs, ariaLabel, className }) => (
  <nav
    aria-label={ariaLabel}
    role={asTabs ? 'tablist' : undefined}
    className={cn(
      'no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0',
      'lg:flex-col lg:gap-0.5 lg:overflow-visible',
      className,
    )}
  >
    {items.map((item) => {
      const active = item.id === activeId;
      const inner = (
        <>
          {item.number && <span className="font-mono text-[11px] text-muted-foreground">{item.number}</span>}
          <span className="flex-1 truncate">{item.label}</span>
          {typeof item.count === 'number' && (
            <span className={cn('font-mono text-[11px]', active ? 'text-primary' : 'text-muted-foreground')}>
              {String(item.count).padStart(2, '0')}
            </span>
          )}
        </>
      );
      const cls = cn(
        'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-[14px] transition-colors',
        'lg:w-full lg:whitespace-normal',
        active ? 'bg-primary/[0.08] font-semibold text-primary' : 'text-foreground hover:bg-[hsl(var(--xs-page))]',
      );
      if (asTabs || onSelect) {
        return (
          <button
            key={item.id}
            type="button"
            role={asTabs ? 'tab' : undefined}
            aria-selected={asTabs ? active : undefined}
            aria-current={!asTabs && active ? 'true' : undefined}
            onClick={() => onSelect?.(item.id)}
            className={cls}
          >
            {inner}
          </button>
        );
      }
      return (
        <a key={item.id} href={item.href ?? `#${item.id}`} aria-current={active ? 'true' : undefined} className={cls}>
          {inner}
        </a>
      );
    })}
  </nav>
);

export default SectionIndex;
