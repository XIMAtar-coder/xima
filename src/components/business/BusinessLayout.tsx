import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, Target, FileText, BarChart3, 
  Settings, LogOut, Menu, X, Building2, Briefcase, Globe, HelpCircle
} from 'lucide-react';
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

const languages = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

interface BusinessLayoutProps {
  children: React.ReactNode;
}

const BusinessLayout: React.FC<BusinessLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useUser();
  const { locale, changeLocale } = useBusinessLocale();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { shouldAutoShowBusinessGuide, completeStep } = useOnboardingState();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideAutoTriggered, setGuideAutoTriggered] = useState(false);

  useEffect(() => {
    if (shouldAutoShowBusinessGuide && !guideAutoTriggered) {
      setGuideOpen(true);
      setGuideAutoTriggered(true);
    }
  }, [shouldAutoShowBusinessGuide, guideAutoTriggered]);

  const handleGuideClose = (dontShowAgain: boolean) => {
    setGuideOpen(false);
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

  const navItems = [
    { path: '/business/dashboard', icon: LayoutDashboard, labelKey: 'business.nav.overview' },
    { path: '/business/candidates', icon: Users, labelKey: 'business.nav.candidates' },
    { path: '/business/challenges', icon: Target, labelKey: 'business.nav.challenges' },
    { path: '/business/jobs', icon: Briefcase, labelKey: 'business.nav.jobs' },
    { path: '/business/evaluations', icon: FileText, labelKey: 'business.nav.evaluations' },
    { path: '/business/reports', icon: BarChart3, labelKey: 'business.nav.reports' },
    { path: '/business/settings', icon: Settings, labelKey: 'business.nav.settings' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-card border-r border-border transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Building2 className="text-primary" size={24} />
                  </div>
                  <span className="text-lg font-bold text-foreground">XIMA Business</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:bg-primary/10"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span className="font-medium">{t(item.labelKey)}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {user?.name?.charAt(0) || 'B'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.name || 'Business User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  onClick={handleSignOut}
                >
                  <LogOut size={18} className="mr-2" />
                  {t('business.nav.sign_out')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="w-full hover:bg-primary/10"
              >
                <LogOut size={20} />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 min-h-screen ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex items-center justify-end gap-2 px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-primary/10"
          >
            <HelpCircle size={16} />
            <span className="text-sm font-medium">{t('business_guide.open_button', 'Guide')}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                aria-label={`Current language: ${currentLanguage.name}`}
              >
                <Globe size={16} />
                <span className="hidden sm:inline">{currentLanguage.flag}</span>
                <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`flex items-center gap-3 cursor-pointer ${
                    i18n.language === language.code ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        <div className="relative z-10 p-8 pb-16">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="relative z-10 border-t border-border px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} XIMA. {t('footer.all_rights_reserved')}
            </p>
            <div className="flex items-center gap-6">
              <Link 
                to="/privacy" 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.privacy')}
              </Link>
              <Link 
                to="/terms" 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.terms')}
              </Link>
              <Link 
                to="/imprint" 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.imprint')}
              </Link>
            </div>
          </div>
        </footer>
      </main>

      <BusinessJourneyGuideModal
        open={guideOpen}
        onClose={handleGuideClose}
        isAutoOpen={shouldAutoShowBusinessGuide}
      />
    </div>
  );
};

export default BusinessLayout;
