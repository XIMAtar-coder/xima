import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../Logo';

interface FooterProps {
  variant?: 'default' | 'minimal';
}

const Footer: React.FC<FooterProps> = ({ variant = 'default' }) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/terms', label: t('footer.terms') },
    { href: '/imprint', label: t('footer.imprint') },
  ];

  if (variant === 'minimal') {
    return (
      <footer className="py-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[rgba(255,255,255,0.4)]">
              © {currentYear} XIMA. {t('footer.all_rights_reserved')}
            </p>
            <div className="flex items-center gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-xs text-[rgba(255,255,255,0.4)] hover:text-primary transition-colors duration-[220ms]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="py-10 mt-16 border-t border-[rgba(255,255,255,0.06)]">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center">
            <Logo
              variant="full"
              alt="XIMA logo"
              className="h-7 opacity-60"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm text-[rgba(255,255,255,0.4)] hover:text-foreground transition-colors duration-[220ms]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="text-sm text-[rgba(255,255,255,0.4)]">
            © {currentYear} {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
