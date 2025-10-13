import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useUser } from '../../context/UserContext';
import LanguageSwitcher from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';
import { useAssessment } from '../../contexts/AssessmentContext';
import { supabase } from '@/integrations/supabase/client';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useUser();
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const { assessmentInProgress } = useAssessment();
  const [scrolled, setScrolled] = useState(false);
  const [ximatarData, setXimatarData] = useState<{ name: string; image: string } | null>(null);

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchXimatar = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ximatar')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.ximatar) {
          const { data: ximatarType } = await supabase
            .from('ximatars')
            .select('label, image_url')
            .eq('label', profile.ximatar)
            .single();

          if (ximatarType) {
            setXimatarData({
              name: ximatarType.label.charAt(0).toUpperCase() + ximatarType.label.slice(1),
              image: ximatarType.image_url || ''
            });
          }
        }
      };
      fetchXimatar();
    }
  }, [isAuthenticated, user]);

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

  const isDark = resolvedTheme === 'dark';
  const logoSrc = isDark ? '/assets/logo_dark.png' : '/assets/logo_light.png';

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
            background: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal)))' 
          }}
        />
        <div className="container mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-8">
              <button 
                onClick={handleLogoClick}
                disabled={assessmentInProgress}
                aria-disabled={assessmentInProgress}
                className={`flex items-center group logo-wrap transition-opacity ${
                  assessmentInProgress ? 'cursor-default opacity-70' : 'hover:opacity-90'
                }`}
              >
                <img 
                  src={logoSrc}
                  alt="XIMA logo" 
                  className={`transition-all duration-200 ease-out relative z-10 ${
                    scrolled 
                      ? 'h-8 md:h-10 lg:h-11' 
                      : 'h-10 md:h-12 lg:h-14'
                  }`}
                />
              </button>
              
              <div className="hidden md:flex space-x-6">
                <button 
                  onClick={() => navigate('/')}
                  className="text-sm font-medium text-foreground/70 hover:text-foreground relative nav-link-gradient transition-colors"
                >
                  {t('nav.home')}
                </button>
                <button 
                  onClick={() => navigate('/how-it-works')}
                  className="text-sm font-medium text-foreground/70 hover:text-foreground relative nav-link-gradient transition-colors"
                >
                  {t('nav.how_it_works')}
                </button>
                <button 
                  onClick={() => navigate('/about')}
                  className="text-sm font-medium text-foreground/70 hover:text-foreground relative nav-link-gradient transition-colors"
                >
                  {t('nav.about')}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher />
              
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  {ximatarData && (
                    <div className="hidden md:flex items-center gap-2 rounded-full border border-border/50 px-3 py-1.5 bg-card/50">
                      <img 
                        src={ximatarData.image.startsWith('/') ? ximatarData.image : `/${ximatarData.image}`} 
                        alt={ximatarData.name} 
                        className="h-6 w-6 rounded-full object-cover" 
                      />
                      <span className="text-sm font-medium text-foreground/80">{ximatarData.name}</span>
                    </div>
                  )}
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/profile')}
                    className="text-foreground/80 hover:text-foreground"
                  >
                    {t('nav.profile')}
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="border-border/50 text-foreground/80 hover:text-foreground hover:border-border"
                  >
                    {t('nav.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="text-foreground/80 hover:text-foreground"
                  >
                    {t('nav.login')}
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/register')}
                    className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-sm"
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
              <img 
                src={logoSrc}
                alt="XIMA logo" 
                className="h-8 relative z-10"
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
