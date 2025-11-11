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

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, signOut } = useUser();
  const { t } = useTranslation();
  const { assessmentInProgress } = useAssessment();
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const headerData = useUserHeaderData(user?.id);

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

  // Check if user is admin
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (assessmentInProgress) return;
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-200 ease-out relative ${
          scrolled 
            ? 'h-14 md:h-16 lg:h-[68px] bg-card/80 backdrop-blur-md border-border/50 shadow-sm' 
            : 'h-14 md:h-16 lg:h-18 bg-card border-border/30'
        }`}
      >
        {/* Gradient accent border at bottom */}
        <div 
          className="absolute left-0 right-0 bottom-0 h-0.5 gradient-accent opacity-25"
          style={{ 
            background: 'linear-gradient(90deg, hsl(var(--xima-accent)), hsl(var(--xima-teal)))' 
          }}
        />
        <div className="container mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-8">
              <button 
                onClick={handleLogoClick}
                disabled={assessmentInProgress}
                aria-disabled={assessmentInProgress}
                className={`flex items-center group logo-wrap ${
                  assessmentInProgress ? 'cursor-default opacity-70' : 'logo-hover'
                }`}
              >
                <Logo 
                  variant="symbol"
                  alt="XIMA logo" 
                  className={`transition-all duration-200 ease-out relative z-10 ${
                    scrolled 
                      ? 'h-8 md:h-9' 
                      : 'h-10 md:h-11'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center space-x-6">
              <LanguageSwitcher />
              
              {isAuthenticated && user && <NotificationsDropdown />}
              
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-6 animate-[fade-in_0.5s_ease-out]">
                  {/* Navigation Links */}
                  <div className="hidden md:flex items-center space-x-6">
                    <button 
                      onClick={() => navigate('/profile')}
                      className={`text-sm font-body hover:text-[hsl(var(--xima-accent))] transition-colors relative ${
                        location.pathname === '/profile' || location.pathname === '/dashboard' 
                          ? 'text-[hsl(var(--xima-accent))]' 
                          : ''
                      }`}
                      style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                    >
                      Dashboard
                      {(location.pathname === '/profile' || location.pathname === '/dashboard') && (
                        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[hsl(var(--xima-accent))]" />
                      )}
                    </button>
                    <button 
                      onClick={() => navigate('/risultati')}
                      className={`text-sm font-body hover:text-[hsl(var(--xima-accent))] transition-colors relative ${
                        location.pathname === '/risultati' ? 'text-[hsl(var(--xima-accent))]' : ''
                      }`}
                      style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                    >
                      Risultati
                      {location.pathname === '/risultati' && (
                        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[hsl(var(--xima-accent))]" />
                      )}
                    </button>
                    <button 
                      onClick={() => navigate('/chat')}
                      className={`text-sm font-body hover:text-[hsl(var(--xima-accent))] transition-colors relative ${
                        location.pathname === '/chat' ? 'text-[hsl(var(--xima-accent))]' : ''
                      }`}
                      style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                    >
                      Chat
                      {location.pathname === '/chat' && (
                        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[hsl(var(--xima-accent))]" />
                      )}
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => navigate('/admin')}
                        className={`text-sm font-body hover:text-[hsl(var(--xima-accent))] transition-colors relative ${
                          location.pathname === '/admin' ? 'text-[hsl(var(--xima-accent))]' : ''
                        }`}
                        style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                      >
                        Developer
                        {location.pathname === '/admin' && (
                          <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[hsl(var(--xima-accent))]" />
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => navigate('/development-plan')}
                      className={`text-sm font-body hover:text-[hsl(var(--xima-accent))] transition-colors relative ${
                        location.pathname.startsWith('/test') || location.pathname === '/development-plan' 
                          ? 'text-[hsl(var(--xima-accent))]' 
                          : ''
                      }`}
                      style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                    >
                      Tests
                      {(location.pathname.startsWith('/test') || location.pathname === '/development-plan') && (
                        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[hsl(var(--xima-accent))]" />
                      )}
                    </button>
                  </div>
                  
                  {/* User Info - Desktop */}
                  <div className="hidden lg:flex items-center space-x-3">
                    {!headerData.isLoading && headerData.ximatarImage && (
                      <img 
                        src={headerData.ximatarImage}
                        alt="XIMAtar"
                        className="w-10 h-10 rounded-full object-cover border-2 border-[hsl(var(--xima-accent))]/30"
                      />
                    )}
                    {!headerData.isLoading && headerData.totalScore > 0 && (
                      <span className="text-sm font-bold text-[hsl(var(--xima-accent))]">
                        {headerData.totalScore}
                      </span>
                    )}
                  </div>
                  
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="font-body bg-[hsl(var(--xima-accent))]/10 hover:bg-[hsl(var(--xima-accent))]/20 transition-all hover:shadow-lg hover:shadow-[hsl(var(--xima-accent))]/20"
                    style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="font-body"
                    style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                  >
                    {t('nav.login')}
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/register')}
                    className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-sm font-body"
                    style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                  >
                    {t('nav.register')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-1 pt-14 md:pt-16 lg:pt-18">
        {children}
      </main>
      
      <footer className="bg-card/50 py-8 mt-16 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center logo-wrap">
              <Logo 
                variant="full"
                alt="XIMA logo" 
                className="h-7 relative z-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
