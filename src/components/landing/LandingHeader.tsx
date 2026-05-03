import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const LandingHeader: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { label: t('landing.nav.how_it_works'), href: '/how-it-works' },
    { label: t('landing.nav.guide'), href: '/assessment-guide' },
    { label: t('landing.nav.about'), href: '/about' },
    { label: t('landing.nav.business'), href: '/business' },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        height: 76,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(10,40,80,0.08)',
      }}
    >
      <div className="max-w-[1440px] mx-auto h-full px-6 lg:px-10 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center" aria-label="XIMA Home">
          <Logo variant="full" className="h-9 w-auto" />
        </button>

        <nav className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className="text-[15px] font-medium transition-colors"
              style={{ color: '#071E3A' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0B6BFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#071E3A')}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Globe className="hidden sm:block w-5 h-5" style={{ color: '#071E3A' }} />
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <ThemeToggle />
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex items-center font-medium text-[15px]"
            style={{
              background: 'white',
              color: '#0B6BFF',
              borderRadius: 14,
              padding: '10px 22px',
              border: '1px solid rgba(10,40,80,0.10)',
              boxShadow: '0 2px 8px rgba(7,30,58,0.06)',
            }}
          >
            {t('landing.nav.login')}
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden p-2" aria-label="Menu">
                <Menu className="w-6 h-6" style={{ color: '#071E3A' }} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="text-left text-base font-medium py-2"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => navigate('/login')}
                  className="mt-4 text-left text-base font-semibold py-2"
                  style={{ color: '#0B6BFF' }}
                >
                  {t('landing.nav.login')}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
