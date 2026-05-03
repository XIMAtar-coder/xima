import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const links = [
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/terms', label: t('footer.terms') },
    { href: '/imprint', label: t('footer.imprint') },
  ];

  return (
    <footer
      style={{
        background: '#F7FAFF',
        borderTop: '1px solid rgba(10,40,80,0.08)',
        padding: '32px 0',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <Logo variant="full" alt="XIMA" className="h-7 w-auto" />

          <nav className="flex flex-wrap items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="transition-colors"
                style={{ fontSize: 14, color: '#607089' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0B6BFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#607089')}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <p style={{ fontSize: 13, color: '#8794A8' }}>
            © {year} XIMA. {t('footer.all_rights_reserved')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
