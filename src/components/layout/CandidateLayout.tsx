import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Newspaper, MessageSquare, Briefcase, Gift, TrendingUp, Settings, LogOut } from 'lucide-react';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';
import { useUser } from '@/context/UserContext';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Shell for the signed-in candidate pages: the same dark rail and page
 * structure as the company area. Public and guest pages (home, journey,
 * register) keep MainLayout's top bar.
 */
const CandidateLayout: React.FC<{ children: React.ReactNode; breadcrumb?: React.ReactNode }> = ({ children, breadcrumb }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useUser();

  const nav: ShellNavItem[] = [
    { path: '/profile', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/chat', icon: Newspaper, label: t('nav.feed') },
    { path: '/jobs', icon: Briefcase, label: t('nav.browse_jobs', 'Job listings') },
    { path: '/my-offers', icon: Gift, label: t('nav.my_offers', 'Your offers') },
    { path: '/development-plan', icon: TrendingUp, label: t('nav.tests') },
    { path: '/messages', icon: MessageSquare, label: t('nav.messages') },
    { path: '/settings', icon: Settings, label: t('nav.settings', 'Settings') },
  ];

  const railFooter = (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-md bg-white/5 px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {user?.name?.charAt(0) || 'C'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{user?.name || ''}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => { await signOut(); navigate('/'); }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
      >
        <LogOut size={16} />
        {t('nav.logout', 'Log out')}
      </button>
    </div>
  );

  return (
    <AppShell
      nav={nav}
      areaLabel={t('nav.candidate_area', 'Your space')}
      railFooter={railFooter}
      breadcrumb={breadcrumb ?? <span className="truncate">{t('nav.candidate_area', 'Your space')}</span>}
      topRight={<><NotificationsDropdown /><ThemeToggle /><LanguageSwitcher /></>}
      storageKey="xima:cand:rail-collapsed"
    >
      {children}
    </AppShell>
  );
};

export default CandidateLayout;
