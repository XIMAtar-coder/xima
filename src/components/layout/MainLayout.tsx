import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useUser } from '../../context/UserContext';
import LanguageSwitcher from '../LanguageSwitcher';
import { useAssessment } from '../../contexts/AssessmentContext';
import { Logo } from '../Logo';
import { useUserHeaderData } from '@/hooks/useUserHeaderData';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsDropdown } from '../NotificationsDropdown';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, GraduationCap, Settings, HelpCircle } from 'lucide-react';
import Footer from './Footer';
import { XimaJourneyGuideModal } from '../onboarding/XimaJourneyGuideModal';
import { useOnboardingState } from '@/hooks/useOnboardingState';

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

  useEffect(() => {
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
    `text-[15px] font-medium transition-all duration-200 ease-out relative px-3 py-1.5 rounded-[10px] ${
      active
        ? 'text-primary font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)]'
    }`;

  return (
    <div className={`min-h-screen ${fullHeight ? 'h-screen flex flex-col overflow-hidden' : ''}`}>
      {/* ── Floating Glass Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-200 ease-out ${
        scrolled ? 'h-14 md:h-16' : 'h-16 md:h-[72px]'
      }`}>
        <div className="container mx-auto px-5 md:px-12 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center gap-8">
              <button
                onClick={handleLogoClick}
                disabled={assessmentInProgress}
                className={`flex items-center ${assessmentInProgress ? 'cursor-default opacity-70' : 'logo-hover'}`}
              >
                <Logo
                  variant="symbol"
                  alt="XIMA logo"
                  className={`transition-all duration-200 ease-out ${scrolled ? 'h-8 md:h-9' : 'h-9 md:h-10'}`}
                />
              </button>

              {/* Public Nav */}
              <div className="hidden lg:flex items-center gap-1">
                {[
                  { path: '/how-it-works', label: t('nav.how_it_works') },
                  { path: '/assessment-guide', label: t('nav.guide') },
                  { path: '/about', label: t('nav.about') },
                  { path: '/business', label: t('nav.business') },
                ].map(({ path, label }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={navLinkClass(location.pathname === path)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {isAuthenticated && user && <NotificationsDropdown />}

              {!isAuthenticated && (
                <div className="hidden md:flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    {t('nav.login')}
                  </Button>
                  <Button size="sm" onClick={() => navigate('/business')}>
                    {t('nav.for_business')}
                  </Button>
                </div>
              )}

              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <nav className="flex flex-col gap-2 mt-8">
                    {[
                      { path: '/how-it-works', label: t('nav.how_it_works') },
                      { path: '/assessment-guide', label: t('nav.guide') },
                      { path: '/about', label: t('nav.about') },
                      { path: '/business', label: t('nav.business') },
                    ].map(({ path, label }) => (
                      <button
                        key={path}
                        onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                        className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] rounded-[10px] px-3 py-2.5 transition-all duration-200"
                      >
                        {label}
                      </button>
                    ))}

                    {isAuthenticated && (
                      <>
                        <div className="h-px bg-[rgba(60,60,67,0.12)] my-3" />
                        {[
                          { path: '/profile', label: t('nav.dashboard') },
                          { path: '/chat', label: t('nav.feed') },
                        ].map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                            className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] rounded-[10px] px-3 py-2.5 transition-all duration-200"
                          >
                            {label}
                          </button>
                        ))}
                        {isMentor && (
                          <button
                            onClick={() => { navigate('/mentor'); setMobileMenuOpen(false); }}
                            className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] rounded-[10px] px-3 py-2.5 transition-all duration-200 flex items-center gap-2"
                          >
                            <GraduationCap className="h-[18px] w-[18px]" strokeWidth={1.5} />
                            {t('nav.mentor_portal', 'Mentor Portal')}
                          </button>
                        )}
                        <button
                          onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                          className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] rounded-[10px] px-3 py-2.5 transition-all duration-200 flex items-center gap-2"
                        >
                          <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
                          {t('nav.settings', 'Settings')}
                        </button>
                        <button
                          onClick={() => { setGuideOpen(true); setMobileMenuOpen(false); }}
                          className="text-left text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-[rgba(0,0,0,0.04)] rounded-[10px] px-3 py-2.5 transition-all duration-200 flex items-center gap-2"
                        >
                          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
                          {t('guide.open_button', 'Guide')}
                        </button>
                      </>
                    )}

                    <div className="h-px bg-[rgba(60,60,67,0.12)] my-3" />
                    {!isAuthenticated ? (
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full">
                          {t('nav.login')}
                        </Button>
                        <Button onClick={() => { navigate('/business'); setMobileMenuOpen(false); }} className="w-full">
                          {t('nav.for_business')}
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full">
                        {t('nav.logout')}
                      </Button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Desktop authenticated nav */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-4 animate-fade-in">
                  <div className="hidden md:flex items-center gap-1">
                    {!(isMentor && location.pathname.startsWith('/mentor')) && (
                      <>
                        <button onClick={() => navigate('/profile')} className={navLinkClass(location.pathname === '/profile' || location.pathname === '/dashboard')}>
                          {t('nav.dashboard')}
                        </button>
                        <button onClick={() => navigate('/chat')} className={navLinkClass(location.pathname === '/chat')}>
                          {t('nav.feed')}
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
                    {!(isMentor && location.pathname.startsWith('/mentor')) && (
                      <>
                        <button onClick={() => navigate('/development-plan')} className={navLinkClass(location.pathname.startsWith('/test') || location.pathname === '/development-plan')}>
                          {t('nav.tests')}
                        </button>
                        <button onClick={() => navigate('/settings')} className={navLinkClass(location.pathname === '/settings')}>
                          <span className="flex items-center gap-1">
                            <Settings className="h-4 w-4" strokeWidth={1.5} />
                            {t('nav.settings', 'Settings')}
                          </span>
                        </button>
                        <button onClick={() => setGuideOpen(true)} className={navLinkClass(false)}>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
                            {t('guide.open_button', 'Guide')}
                          </span>
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

                  {/* User avatar */}
                  <div className="hidden lg:flex items-center gap-3">
                    {!headerData.isLoading && headerData.ximatarImage && (
                      <img
                        src={headerData.ximatarImage}
                        alt="XIMAtar"
                        className="w-9 h-9 rounded-[18px] object-cover border border-[rgba(60,60,67,0.12)] shadow-sm"
                      />
                    )}
                    {!headerData.isLoading && headerData.totalScore > 0 && (
                      <span className="text-sm font-semibold text-secondary">
                        {headerData.totalScore}
                      </span>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    {t('nav.logout')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className={`pt-16 md:pt-[72px] ${fullHeight ? 'flex-1 overflow-hidden' : 'flex-1'}`}>
        {children}
      </main>

      {!fullHeight && <Footer />}

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
