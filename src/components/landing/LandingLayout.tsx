import React from 'react';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--xima-bg)' }}>
      <LandingHeader />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow">{t('common.skip_to_content')}</a>
      <main id="main-content" className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
};

export default LandingLayout;
