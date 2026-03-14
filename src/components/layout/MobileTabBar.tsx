import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, MessageCircle, BookOpen, Settings, HelpCircle } from 'lucide-react';
import { useUser } from '@/context/UserContext';

const tabs = [
  { path: '/profile', icon: Home, labelKey: 'nav.dashboard' },
  { path: '/chat', icon: MessageCircle, labelKey: 'nav.feed' },
  { path: '/development-plan', icon: BookOpen, labelKey: 'nav.tests' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/help', icon: HelpCircle, labelKey: 'nav.help', fallbackLabel: 'Help' },
];

export const MobileTabBar: React.FC = () => {
  const { isAuthenticated } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => {
    if (path === '/profile') return location.pathname === '/profile' || location.pathname === '/dashboard';
    if (path === '/development-plan') return location.pathname.startsWith('/test') || location.pathname === '/development-plan';
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-tab-bar">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ path, icon: Icon, labelKey, fallbackLabel }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[64px] gap-0.5 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {t(labelKey, fallbackLabel || '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
