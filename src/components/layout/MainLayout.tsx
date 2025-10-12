import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useUser } from '../../context/UserContext';
import LanguageSwitcher from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useUser();
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

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

  return (
    <div className="min-h-screen bg-background">
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-200 ease-out ${
          scrolled 
            ? 'h-14 md:h-16 lg:h-[68px] bg-background/80 backdrop-blur-md border-border/50 shadow-sm' 
            : 'h-14 md:h-16 lg:h-18 bg-background border-border/10'
        }`}
      >
        <div className="container mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => navigate(`/${i18n.language}`)} 
                className="flex items-center group"
              >
                <img 
                  src={logoSrc}
                  alt="XIMA logo" 
                  className={`transition-all duration-200 ease-out ${
                    scrolled 
                      ? 'h-8 md:h-10 lg:h-11' 
                      : 'h-10 md:h-12 lg:h-14'
                  }`}
                />
              </button>
              
              <div className="hidden md:flex space-x-6">
                <button 
                  onClick={() => navigate('/')}
                  className="text-sm font-medium text-foreground/80 hover:text-foreground relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-[#2C6CFF] after:to-[#22D3EE] after:transition-all after:duration-200"
                >
                  {t('nav.home')}
                </button>
                <button 
                  onClick={() => navigate('/how-it-works')}
                  className="text-sm font-medium text-foreground/80 hover:text-foreground relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-[#2C6CFF] after:to-[#22D3EE] after:transition-all after:duration-200"
                >
                  {t('nav.how_it_works')}
                </button>
                <button 
                  onClick={() => navigate('/about')}
                  className="text-sm font-medium text-foreground/80 hover:text-foreground relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-[#2C6CFF] after:to-[#22D3EE] after:transition-all after:duration-200"
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
                    className="bg-gradient-to-r from-[#2C6CFF] to-[#22D3EE] text-white hover:opacity-90 transition-opacity"
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
      
      <footer className="bg-muted/30 py-8 mt-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <img 
                src={logoSrc}
                alt="XIMA logo" 
                className="h-8"
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
