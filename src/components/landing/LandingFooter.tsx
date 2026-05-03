import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  const logoSrc = isDark ? '/images/xima-full-white.svg' : '/images/xima-full-dark.svg';

  const links = [
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/terms', label: t('footer.terms') },
    { href: '/imprint', label: t('footer.imprint') },
  ];

  return (
    <footer
      style={{
        background: 'var(--xima-bg)',
        borderTop: '1px solid var(--xima-border)',
        padding: '32px 0',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <img src={logoSrc} alt="XIMA" style={{ height: 28, width: 'auto' }} />

          <nav className="flex flex-wrap items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="transition-colors hover:opacity-80"
                style={{ fontSize: 14, color: 'var(--xima-text-muted)' }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <p style={{ fontSize: 13, color: 'var(--xima-text-faint)' }}>
            © 2026 XIMA. {t('footer.all_rights_reserved')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
