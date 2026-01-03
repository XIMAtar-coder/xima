import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, Target, FileText, BarChart3, 
  Settings, LogOut, Menu, X, Building2, Briefcase, Globe
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
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
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[#0F1419] to-[#0A0F1C] border-r border-[#3A9FFF]/20 transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#3A9FFF]/20">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#3A9FFF]/10 border border-[#3A9FFF]/20">
                    <Building2 className="text-[#3A9FFF]" size={24} />
                  </div>
                  <span className="text-lg font-bold text-white">XIMA Business</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:bg-[#3A9FFF]/10"
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
                      ? 'bg-[#3A9FFF]/20 text-[#3A9FFF] border border-[#3A9FFF]/30'
                      : 'text-[#A3ABB5] hover:bg-[#3A9FFF]/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span className="font-medium">{t(item.labelKey)}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-[#3A9FFF]/20">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#3A9FFF]/10">
                  <div className="w-10 h-10 rounded-full bg-[#3A9FFF] flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0) || 'B'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.name || 'Business User'}
                    </p>
                    <p className="text-xs text-[#A3ABB5] truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[#A3ABB5] hover:text-white hover:bg-[#3A9FFF]/10"
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
                className="w-full hover:bg-[#3A9FFF]/10"
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
        {/* Top Header with Language Switcher */}
        <header className="sticky top-0 z-40 flex items-center justify-end px-6 py-3 bg-[#0A0F1C]/80 backdrop-blur-sm border-b border-[#3A9FFF]/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center gap-2 text-[#A3ABB5] hover:text-white hover:bg-[#3A9FFF]/10"
                aria-label={`Current language: ${currentLanguage.name}`}
              >
                <Globe size={16} />
                <span className="hidden sm:inline">{currentLanguage.flag}</span>
                <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px] bg-[#0F1419] border-[#3A9FFF]/20">
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`flex items-center gap-3 cursor-pointer ${
                    i18n.language === language.code ? 'bg-[#3A9FFF]/20 text-[#3A9FFF]' : 'text-[#A3ABB5] hover:text-white'
                  }`}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        {/* Dark scrim overlay for improved readability */}
        <div className="fixed inset-0 bg-black/50 pointer-events-none" style={{ marginLeft: sidebarOpen ? '256px' : '80px', top: '49px' }} />
        <div className="relative z-10 p-8 pb-32">
          {children}
        </div>
      </main>
    </div>
  );
};

export default BusinessLayout;
