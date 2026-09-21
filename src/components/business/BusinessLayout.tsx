import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell, type ShellNavItem } from '@/components/layout/AppShell';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, Target, FileText, Swords,
  Settings, LogOut, Briefcase, Globe, HelpCircle, MessageSquare,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { BusinessJourneyGuideModal } from '@/components/business/BusinessJourneyGuideModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBusinessLocale, LANGUAGE_STORAGE_KEY, VALID_LOCALES } from '@/hooks/useBusinessLocale';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

const languages = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

interface BusinessLayoutProps {
  children: React.ReactNode;
}

const BusinessLayout: React.FC<BusinessLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useUser();
  const { locale, changeLocale } = useBusinessLocale();
  const { shouldAutoShowBusinessGuide, completeStep } = useOnboardingState();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideAutoTriggered, setGuideAutoTriggered] = useState(false);

  // Unread pipeline chat count
  const { data: unreadChatCount = 0 } = useQuery({
    queryKey: ['unread-pipeline-chat'],
    queryFn: async () => {
      const { data: threads } = await supabase
        .from('pipeline_chat_threads')
        .select('unread_business')
        .eq('is_active', true);
      if (!threads) return 0;
      return threads.reduce((sum, t) => sum + (t.unread_business || 0), 0);
    },
    refetchInterval: 30000,
  });

  // Closing the tour without "don't show again" hides it for this browser
  // session only. BusinessLayout remounts on every business page, so without
  // this the tour reopened on each navigation.
  const guideSessionKey = `xima:biz-guide-dismissed:${user?.id ?? ''}`;

  useEffect(() => {
    if (!shouldAutoShowBusinessGuide || guideAutoTriggered) return;
    let dismissedThisSession = false;
    try {
      dismissedThisSession = window.sessionStorage.getItem(guideSessionKey) === '1';
    } catch {
      // storage blocked: fall through and show it
    }
    setGuideAutoTriggered(true);
    if (!dismissedThisSession) setGuideOpen(true);
  }, [shouldAutoShowBusinessGuide, guideAutoTriggered, guideSessionKey]);

  const handleGuideClose = (dontShowAgain: boolean) => {
    setGuideOpen(false);
    try {
      window.sessionStorage.setItem(guideSessionKey, '1');
    } catch {
      // ignore
    }
    if (dontShowAgain) {
      completeStep('biz_welcome_seen');
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLang && VALID_LOCALES.includes(storedLang as any) && i18n.language?.split('-')[0] !== storedLang) {
      i18n.changeLanguage(storedLang);
    }
  }, [i18n]);

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[1];

  const handleLanguageChange = (languageCode: string) => {
    changeLocale(languageCode as 'en' | 'it' | 'es');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/business/login');
  };

  const navItems: ShellNavItem[] = [
    { path: '/business/dashboard', icon: LayoutDashboard, label: t('businessPortal.nav_overview') },
    { path: '/business/hiring-goals', icon: Target, label: t('businessPortal.nav_hiring_goals'), prefix: true },
    { path: '/business/candidates', icon: Users, label: t('businessPortal.nav_candidates'), prefix: true },
    { path: '/business/challenges', icon: Swords, label: t('businessPortal.nav_challenges'), prefix: true },
    { path: '/business/messages', icon: MessageSquare, label: t('businessPortal.nav_messages'), badge: unreadChatCount || undefined },
    { path: '/business/jobs', icon: Briefcase, label: t('businessPortal.nav_jobs'), prefix: true },
    { path: '/business/evaluations', icon: FileText, label: t('businessPortal.nav_evaluations') },
    { path: '/business/settings', icon: Settings, label: t('businessPortal.nav_settings') },
  ];

  const railFooter = (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-md bg-white/5 px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {user?.name?.charAt(0) || 'B'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{user?.name || 'Business'}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
      >
        <LogOut size={16} />
        {t('businessPortal.nav_logout')}
      </button>
    </div>
  );

  const topRight = (
    <>
      <NotificationsDropdown />
      <ThemeToggle />
      <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <HelpCircle size={16} />
        <span className="hidden text-sm font-medium sm:inline">{t('businessPortal.nav_guide')}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground" aria-label={`Current language: ${currentLanguage.name}`}>
            <Globe size={16} />
            <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[150px]">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex cursor-pointer items-center gap-3 ${i18n.language === language.code ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="font-medium">{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const footer = (
    <footer className="border-t border-[hsl(var(--xs-line))] px-4 py-6 sm:px-8">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} XIMA. {t('footer.all_rights_reserved')}</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-primary">{t('footer.privacy')}</Link>
          <Link to="/terms" className="text-xs text-muted-foreground transition-colors hover:text-primary">{t('footer.terms')}</Link>
          <Link to="/imprint" className="text-xs text-muted-foreground transition-colors hover:text-primary">{t('footer.imprint')}</Link>
        </div>
      </div>
    </footer>
  );

  return (
    <>
      <AppShell
        nav={navItems}
        areaLabel={t('businessPortal.area_label', 'Company area')}
        railFooter={railFooter}
        topRight={topRight}
        breadcrumb={<span className="truncate">{t('businessPortal.area_label', 'Company area')}</span>}
        storageKey="xima:biz:rail-collapsed"
        footer={footer}
      >
        {children}
      </AppShell>

      <BusinessJourneyGuideModal
        open={guideOpen}
        onClose={handleGuideClose}
        isAutoOpen={shouldAutoShowBusinessGuide}
      />
    </>
  );
};

export default BusinessLayout;
