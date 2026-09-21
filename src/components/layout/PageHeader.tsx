import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Page title block from the redesign: mono eyebrow, large title, one-line
 * subtitle, actions on the right. Used by every page inside AppShell so the
 * hierarchy is the same everywhere.
 */
export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Small status/meta line under the actions (e.g. "Bozza · salvataggio locale"). */
  meta?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, actions, meta, className }) => (
  <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
    <div className="min-w-0">
      {eyebrow && <p className="xs-eyebrow mb-2">{eyebrow}</p>}
      <h1 className="xs-title">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>}
    </div>
    {(actions || meta) && (
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
    )}
  </div>
);

/** Two columns: main content and a context column on the right (340px on desktop). */
export const WithContext: React.FC<{ context: React.ReactNode; children: React.ReactNode; className?: string; contextClassName?: string }> = ({ context, children, className, contextClassName }) => (
  <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]', className)}>
    <div className="min-w-0 space-y-6">{children}</div>
    <aside className={cn('space-y-6 lg:sticky lg:top-20 lg:self-start', contextClassName)}>{context}</aside>
  </div>
);

/** Small uppercase label used inside panels ("SELEZIONE IN CORSO"). */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn('xs-eyebrow', className)}>{children}</p>
);

/** Flat panel from the redesign; pass `glass` only for the one key surface of a page. */
export const Panel: React.FC<React.HTMLAttributes<HTMLDivElement> & { glass?: boolean; accent?: boolean }> = ({ glass, accent, className, ...props }) => (
  <div className={cn(glass ? 'xs-glass' : 'xs-panel', accent && 'xs-panel-accent', className)} {...props} />
);

/** One figure with its label, for the counter strips. */
export const Stat: React.FC<{ value: React.ReactNode; label: React.ReactNode; hint?: React.ReactNode; className?: string }> = ({ value, label, hint, className }) => (
  <div className={cn('min-w-0', className)}>
    <p className="text-[13px] text-muted-foreground">{label}</p>
    <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums text-foreground">{value}</p>
    {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default PageHeader;
