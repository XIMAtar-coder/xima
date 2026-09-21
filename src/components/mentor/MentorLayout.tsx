import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, CalendarDays, UserPen, Eye, LogOut } from 'lucide-react';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';
import { useUser } from '@/context/UserContext';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Shell for the mentor area. Until now these pages used MainLayout with their
 * own headings, so the third role of XIMA looked like a different product
 * from the company and candidate areas.
 */
const MentorLayout: React.FC<{ children: React.ReactNode; breadcrumb?: React.ReactNode }> = ({ children, breadcrumb }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useUser();
  const { mentorProfile } = useMentorProfile();

  const nav: ShellNavItem[] = [
    { path: '/mentor', icon: Home, label: t('mentor.nav_portal', 'Mentor portal') },
    { path: '/mentor/calendar', icon: CalendarDays, label: t('mentor.nav_calendar', 'Calendar and sessions'), prefix: true },
    { path: '/mentor/profile', icon: UserPen, label: t('mentor.nav_profile', 'My profile') },
    { path: '/mentor/preview', icon: Eye, label: t('mentor.nav_preview', 'Profile preview') },
  ];

  const name = mentorProfile?.name || user?.name || '';

  const railFooter = (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-md bg-white/5 px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {name.charAt(0) || 'M'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="truncate text-xs text-white/60">{t('mentor.role_label', 'Mentor')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => { await signOut(); navigate('/mentor/login'); }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
      >
        <LogOut size={16} aria-hidden="true" />
        {t('nav.logout', 'Log out')}
      </button>
    </div>
  );

  return (
    <AppShell
      nav={nav}
      areaLabel={t('mentor.area_label', 'Mentor area')}
      railFooter={railFooter}
      breadcrumb={breadcrumb ?? <span className="truncate">{t('mentor.area_label', 'Mentor area')}</span>}
      topRight={<><NotificationsDropdown /><ThemeToggle /><LanguageSwitcher /></>}
      storageKey="xima:mentor:rail-collapsed"
      maxWidthClass="max-w-[1280px]"
    >
      {children}
    </AppShell>
  );
};

export default MentorLayout;
