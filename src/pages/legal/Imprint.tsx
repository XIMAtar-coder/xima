import React from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Phone, MapPin, FileText, User } from 'lucide-react';

const Imprint = () => {
  const { t } = useTranslation();

  return (
    <MainLayout>
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
              <p className="font-semibold text-foreground">XIMA S.r.l.</p>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>
                  Via Example, 123<br />
                  20100 Milano (MI)<br />
                  Italia
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
                <a href="mailto:info@xima.app" className="hover:text-primary transition-colors">
                  info@xima.app
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+39 02 1234567</span>
              </div>
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
              <p>{t('legal.imprint.managing_director')}: [Name]</p>
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
              <p>{t('legal.imprint.vat')}: IT12345678901</p>
              <p>{t('legal.imprint.rea')}: MI-1234567</p>
              <p>{t('legal.imprint.share_capital')}: €10.000,00 i.v.</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Protection Officer */}
        <Card className="mt-6 bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              {t('legal.imprint.dpo_title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('legal.imprint.dpo_info')}
            </p>
            <a 
              href="mailto:privacy@xima.app" 
              className="text-primary hover:underline mt-2 inline-block"
            >
              privacy@xima.app
            </a>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Imprint;
