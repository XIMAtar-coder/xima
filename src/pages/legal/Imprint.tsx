import React from 'react';
import { useTranslation } from 'react-i18next';
import LandingLayout from '@/components/landing/LandingLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Phone, MapPin, FileText, User, Shield } from 'lucide-react';

/**
 * Legal Imprint / Legal Notice page
 * 
 * IMPORTANT: This page displays the operating company's legal information.
 * All data must be accurate and up-to-date for GDPR compliance.
 * 
 * To update the company information:
 * - Edit the COMPANY_LEGAL constant below with your real company data
 * - Ensure all placeholders are replaced before public release
 */

// ========================================
// LEGAL COMPANY INFORMATION
// Replace ALL values below with your actual company data
// ========================================
const COMPANY_LEGAL = {
  // Company name (as registered)
  name: 'XIMA S.r.l.',
  
  // Registered address
  address: {
    street: 'Via Torino, 2',
    city: 'Milano',
    postalCode: '20123',
    province: 'MI',
    country: 'Italia'
  },
  
  // Contact information
  contact: {
    email: 'info@xima.app',
    phone: '+39 02 8088 0088',
    pec: 'xima@pec.it' // Certified email (Italy)
  },
  
  // Legal representative
  representative: {
    title: 'Amministratore Unico',
    name: 'Pietro Cozzi'
  },
  
  // Registration information
  registration: {
    vatNumber: 'IT12345678901', // Partita IVA
    reaNumber: 'MI-2678901', // REA number
    shareCapital: '€10.000,00 i.v.',
    registrationOffice: 'Camera di Commercio di Milano'
  },
  
  // Data Protection Officer
  dpo: {
    email: 'privacy@xima.app',
    description: 'dpo_info' // i18n key
  }
} as const;

const Imprint = () => {
  const { t } = useTranslation();

  return (
    <LandingLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('legal.imprint.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('legal.imprint.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Company Information */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                {t('legal.imprint.company_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold text-foreground">{COMPANY_LEGAL.name}</p>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>
                  {COMPANY_LEGAL.address.street}<br />
                  {COMPANY_LEGAL.address.postalCode} {COMPANY_LEGAL.address.city} ({COMPANY_LEGAL.address.province})<br />
                  {COMPANY_LEGAL.address.country}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                {t('legal.imprint.contact')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${COMPANY_LEGAL.contact.email}`} className="hover:text-primary transition-colors">
                  {COMPANY_LEGAL.contact.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <a href={`tel:${COMPANY_LEGAL.contact.phone.replace(/\s/g, '')}`} className="hover:text-primary transition-colors">
                  {COMPANY_LEGAL.contact.phone}
                </a>
              </div>
              {COMPANY_LEGAL.contact.pec && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>PEC: {COMPANY_LEGAL.contact.pec}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legal Representative */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {t('legal.imprint.representative')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>{COMPANY_LEGAL.representative.title}: <span className="text-foreground font-medium">{COMPANY_LEGAL.representative.name}</span></p>
            </CardContent>
          </Card>

          {/* Registration Info */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                {t('legal.imprint.registration')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
              <p>{t('legal.imprint.vat')}: <span className="text-foreground">{COMPANY_LEGAL.registration.vatNumber}</span></p>
              <p>{t('legal.imprint.rea')}: <span className="text-foreground">{COMPANY_LEGAL.registration.reaNumber}</span></p>
              <p>{t('legal.imprint.share_capital')}: <span className="text-foreground">{COMPANY_LEGAL.registration.shareCapital}</span></p>
              <p className="text-sm">{t('legal.imprint.registered_at')}: {COMPANY_LEGAL.registration.registrationOffice}</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Protection Officer */}
        <Card className="mt-6 bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              {t('legal.imprint.dpo_title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('legal.imprint.dpo_info')}
            </p>
            <a 
              href={`mailto:${COMPANY_LEGAL.dpo.email}`}
              className="text-primary hover:underline mt-2 inline-block"
            >
              {COMPANY_LEGAL.dpo.email}
            </a>
          </CardContent>
        </Card>

        {/* Last updated notice */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('legal.imprint.last_updated')}: {new Date().toLocaleDateString()}
        </p>
      </div>
    </LandingLayout>
  );
};

export default Imprint;
