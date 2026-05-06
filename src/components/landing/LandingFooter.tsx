import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();

  const links = [
    { href: '/privacy', label: t('landing.footer.privacy') },
    { href: '/terms', label: t('landing.footer.terms') },
    { href: '/imprint', label: t('landing.footer.imprint') },
  ];

  return (
    <footer style={{ background: '#071E3A', padding: '40px 0 32px', color: 'rgba(255,255,255,0.7)' }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img src="/images/xima-full-white.svg" alt="XIMA" style={{ height: 26, width: 'auto' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              {t('landing.footer.copyright')}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="transition-colors hover:opacity-90"
                style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div
            className="flex items-center gap-2"
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 999,
              padding: '6px 12px',
            }}
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.7} style={{ color: '#3B82F6' }} />
            {t('landing.footer.gdpr_badge')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
