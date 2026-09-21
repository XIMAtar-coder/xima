import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * Shared shell for the signed-in areas (company and candidate), from the
 * chosen redesign: a dark-blue rail with the navigation on the left, a thin
 * top bar with breadcrumb and utilities, and the page in a bounded column.
 * Both areas use it so they read as one product.
 */

export interface ShellNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Match on prefix instead of exact path (e.g. /business/hiring-goals/...). */
  prefix?: boolean;
}

export interface AppShellProps {
  nav: ShellNavItem[];
  /** Small caption under the logo in the rail ("Area azienda", "Il tuo spazio"). */
  areaLabel: string;
  /** Bottom of the rail: user block, plan, sign-out. */
  railFooter?: React.ReactNode;
  /** Right side of the top bar: notifications, theme, language, help. */
  topRight?: React.ReactNode;
  /** Left side of the top bar: breadcrumb. */
  breadcrumb?: React.ReactNode;
  /** Persist the collapsed state under this key. */
  storageKey?: string;
  /** Widest the page column gets. Defaults to 1500px like the mockups. */
  maxWidthClass?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  nav, areaLabel, railFooter, topRight, breadcrumb, storageKey = 'xima:shell:collapsed',
  maxWidthClass = 'max-w-[1500px]', footer, children,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, collapsed ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [collapsed, storageKey]);

  const isActive = (item: ShellNavItem) =>
    item.prefix ? location.pathname.startsWith(item.path) : location.pathname === item.path;

  const rail = (
    <div className="flex h-full min-h-screen flex-col">
      <div className={cn('flex items-center gap-3 px-4 pt-5 pb-4', collapsed && 'justify-center px-2')}>
        <Logo variant="symbol" alt="XIMA" className="h-8 w-8 shrink-0 brightness-0 invert" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">XIMA</p>
            <p className="xs-eyebrow !text-white/60 !normal-case !tracking-normal !font-sans !text-[11px]">{areaLabel}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="ml-auto rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label={t('a11y.close_menu', 'Close menu')}
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2" aria-label={areaLabel}>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors',
                active ? 'bg-primary text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge ? (
                <span className="min-w-5 rounded-full bg-white/20 px-1.5 text-center text-xs font-semibold text-white">{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn('border-t border-white/10 px-3 py-3', collapsed && 'px-2')}>
        {!collapsed && railFooter}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mt-2 hidden w-full items-center justify-center gap-2 rounded-md py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white lg:flex"
          aria-label={collapsed ? t('a11y.expand_menu', 'Expand menu') : t('a11y.collapse_menu', 'Collapse menu')}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} />{t('common.collapse', 'Collapse')}</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--xs-page))]">
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-[hsl(var(--xs-rail))] text-white transition-[width,transform] duration-200',
          collapsed ? 'w-[68px]' : 'w-64',
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {rail}
      </aside>

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        {t('common.skip_to_content')}
      </a>

      <div className={cn('min-h-screen transition-[margin] duration-200', collapsed ? 'lg:ml-[68px]' : 'lg:ml-64')}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[hsl(var(--xs-line))] bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-label={t('a11y.open_menu')}>
            <Menu size={20} />
          </Button>
          <div className="min-w-0 flex-1 text-sm text-muted-foreground">{breadcrumb}</div>
          <div className="flex items-center gap-1">{topRight}</div>
        </header>

        <main id="main-content" className={cn('mx-auto w-full px-4 pb-16 pt-6 sm:px-6 lg:px-9', maxWidthClass)}>
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
};

export default AppShell;
