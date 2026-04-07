import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../context/UserContext';
import LanguageSwitcher from '../LanguageSwitcher';
import { useAssessment } from '../../contexts/AssessmentContext';
import { Logo } from '../Logo';
import { useUserHeaderData } from '@/hooks/useUserHeaderData';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsDropdown } from '../NotificationsDropdown';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, GraduationCap, Settings, HelpCircle, Gift } from 'lucide-react';
import Footer from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { XimaJourneyGuideModal } from '../onboarding/XimaJourneyGuideModal';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { ThemeToggle } from '../ThemeToggle';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fullHeight?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false, fullHeight = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, signOut } = useUser();
  const { t } = useTranslation();
  const { assessmentInProgress } = useAssessment();
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { completeStep } = useOnboardingState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerData = useUserHeaderData(user?.id);

  const { data: pendingOffersCount = 0 } = useQuery({
    queryKey: ['pending-offers-count'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return 0;
      const { count } = await supabase
        .from('hiring_offers')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_user_id', authUser.id)
        .eq('offer_status', 'sent');
      return count || 0;
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });


    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;
      try {
        const { data } = await (supabase.rpc as any)('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    };
    checkAdminRole();
  }, [user?.id]);

  useEffect(() => {
    const checkMentorStatus = async () => {
      if (!user?.id) { setIsMentor(false); return; }
      try {
        const { data, error } = await supabase
          .from('mentors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsMentor(!!data && !error);
      } catch (error) {
        console.error('Error checking mentor status:', error);
        setIsMentor(false);
      }
    };
    checkMentorStatus();
  }, [user?.id]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (assessmentInProgress) return;
    if (isAuthenticated) navigate('/dashboard');
    else navigate('/');
  };

  const navLinkClass = (active: boolean) =>
    `text-[14px] xl:text-[15px] font-medium transition-all duration-200 ease-out relative px-2 xl:px-3 py-1.5 rounded-[10px] ${
      active
        ? 'text-primary font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]'
    }`;

  /* ── Public nav links (logged-out only) ── */
  const publicNavLinks = [
    { path: '/how-it-works', label: t('nav.how_it_works') },
    { path: '/assessment-guide', label: t('nav.guide') },
    { path: '/about', label: t('nav.about') },
    { path: '/business', label: t('nav.business') },
  ];

  return (
    <div className={`min-h-screen ${fullHeight ? 'h-screen flex flex-col overflow-hidden' : ''}`}>
      {/* ── Floating Glass Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-200 ease-out ${
        scrolled ? 'h-14 md:h-16' : 'h-16 md:h-[72px]'
      }`}>
        <div className="container mx-auto px-4 md:px-8 xl:px-12 h-full">
          <div className="flex justify-between items-center h-full">
            {/* Left: Logo + public nav (logged-out only) */}
            <div className="flex items-center gap-4 xl:gap-8">
              <button
                onClick={handleLogoClick}
                disabled={assessmentInProgress}
                className={`flex items-center ${assessmentInProgress ? 'cursor-default opacity-70' : 'logo-hover'}`}
              >
                <Logo
                  variant="symbol"
                  alt="XIMA logo"
                  className={`transition-all duration-200 ease-out ${scrolled ? 'h-7 md:h-8 xl:h-9' : 'h-8 md:h-9 xl:h-10'}`}
                />
              </button>

              {/* Public nav links — only when logged OUT, hidden on mobile */}
              {!isAuthenticated && (
                <div className="hidden md:flex items-center gap-1">
                  {publicNavLinks.map(({ path, label }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={navLinkClass(location.pathname === path)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              {/* ── Logged-OUT right side ── */}
              {!isAuthenticated && (
                <div className="hidden md:flex items-center gap-3">
                  <ThemeToggle />
                  <Button
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="rounded-[14px] px-5 py-2.5"
                  >
                    {t('nav.login')}
                  </Button>
                </div>
              )}

              {/* ── Logged-IN right side ── */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2 md:gap-3 animate-fade-in">
                  <NotificationsDropdown />
                  <ThemeToggle />

                  <div className="hidden xl:flex items-center gap-1">
                    {!(isMentor && location.pathname.startsWith('/mentor')) && (
                      <>
                        <button onClick={() => navigate('/profile')} className={navLinkClass(location.pathname === '/profile' || location.pathname === '/dashboard')}>
                          {t('nav.dashboard')}
                        </button>
                        <button onClick={() => navigate('/chat')} className={navLinkClass(location.pathname === '/chat')}>
                          {t('nav.feed')}
                        </button>
                        <button onClick={() => navigate('/messages')} className={navLinkClass(location.pathname === '/messages')}>
                          {t('nav.messages')}
                        </button>
                        <button onClick={() => navigate('/development-plan')} className={navLinkClass(location.pathname.startsWith('/test') || location.pathname === '/development-plan')}>
                          {t('nav.tests')}
                        </button>
                        <button onClick={() => navigate('/settings')} className={navLinkClass(location.pathname === '/settings')}>
                          <span className="flex items-center gap-1">
                            <Settings className="h-4 w-4" strokeWidth={1.5} />
                            {t('nav.settings', 'Impostazioni')}
                          </span>
                        </button>
                        <button onClick={() => setGuideOpen(true)} className={navLinkClass(false)}>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
                            Help
                          </span>
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => navigate('/analytics')} className={navLinkClass(location.pathname === '/analytics')}>
                          {t('nav.analytics')}
                        </button>
                        <button onClick={() => navigate('/admin')} className={navLinkClass(location.pathname === '/admin')}>
                          {t('nav.developer')}
                        </button>
                      </>
                    )}
                    {isMentor && (
                      <button onClick={() => navigate('/mentor')} className={navLinkClass(location.pathname.startsWith('/mentor') && !location.pathname.includes('/login'))}>
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4" strokeWidth={1.5} />
                          {t('nav.mentor_portal', 'Mentor Portal')}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Credits badge — desktop only */}
                  <div className="hidden xl:flex items-center gap-3">
                    {!headerData.isLoading && headerData.ximatarImage && (
                      <img
                        src={headerData.ximatarImage}
                        alt="XIMAtar"
                        className="w-8 h-8 xl:w-9 xl:h-9 rounded-[18px] object-cover border border-[var(--divider)] shadow-sm"
                      />
                    )}
                    {!headerData.isLoading && headerData.totalScore > 0 && (
                      <span className="text-sm font-semibold text-secondary">
                        {headerData.totalScore}
                      </span>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:inline-flex">
                    {t('nav.logout')}
                  </Button>
                </div>
              )}

              {/* ── Mobile / Tablet menu ── */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="xl:hidden">
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                    <Menu className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[340px] backdrop-blur-[40px]">
                  <nav className="flex flex-col gap-1 mt-8">
                    {/* Public links for logged-out, auth links for logged-in */}
                    {!isAuthenticated ? (
                      <>
                        {publicNavLinks.map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                            className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] rounded-[10px] px-3 py-3 min-h-[48px] flex items-center transition-all duration-200"
                          >
                            {label}
                          </button>
                        ))}
                        <div className="h-px bg-[var(--divider)] my-3" />
                        <div className="flex items-center gap-3 px-3">
                          <LanguageSwitcher />
                          <ThemeToggle />
                        </div>
                        <div className="h-px bg-[var(--divider)] my-3" />
                        <Button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full rounded-[14px] min-h-[48px]">
                          {t('nav.login')}
                        </Button>
                      </>
                    ) : (
                      <>
                        {[
                          { path: '/profile', label: t('nav.dashboard') },
                          { path: '/chat', label: t('nav.feed') },
                          { path: '/messages', label: t('nav.messages') },
                          { path: '/development-plan', label: t('nav.tests') },
                          { path: '/settings', label: t('nav.settings', 'Impostazioni') },
                        ].map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                            className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] rounded-[10px] px-3 py-3 min-h-[48px] flex items-center transition-all duration-200"
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          onClick={() => { setGuideOpen(true); setMobileMenuOpen(false); }}
                          className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] rounded-[10px] px-3 py-3 min-h-[48px] flex items-center gap-2 transition-all duration-200"
                        >
                          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
                          Help
                        </button>
                        {isMentor && (
                          <button
                            onClick={() => { navigate('/mentor'); setMobileMenuOpen(false); }}
                            className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] rounded-[10px] px-3 py-3 min-h-[48px] flex items-center gap-2 transition-all duration-200"
                          >
                            <GraduationCap className="h-[18px] w-[18px]" strokeWidth={1.5} />
                            {t('nav.mentor_portal', 'Mentor Portal')}
                          </button>
                        )}
                        <div className="h-px bg-[var(--divider)] my-3" />
                        <div className="flex items-center gap-3 px-3">
                          <LanguageSwitcher />
                          <ThemeToggle />
                        </div>
                        <div className="h-px bg-[var(--divider)] my-3" />
                        <Button variant="outline" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full min-h-[48px]">
                          {t('nav.logout')}
                        </Button>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <main className={`pt-16 md:pt-[72px] ${isAuthenticated ? 'pb-20 md:pb-0' : ''} ${fullHeight ? 'flex-1 overflow-hidden' : 'flex-1'}`}>
        {children}
      </main>

      {!fullHeight && <Footer />}
      <MobileTabBar />

      {isAuthenticated && (
        <XimaJourneyGuideModal
          open={guideOpen}
          onClose={(dontShow) => {
            setGuideOpen(false);
            if (dontShow) completeStep('welcome_seen');
          }}
        />
      )}
    </div>
  );
};

export default MainLayout;
