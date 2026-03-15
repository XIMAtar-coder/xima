import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanyLegal, CompanyLegalInput } from '@/hooks/useCompanyLegal';
import { Building2, MapPin, FileText, Mail, Save, Loader2 } from 'lucide-react';

const CompanyLegalSettings: React.FC = () => {
  const { t } = useTranslation();
  const { companyLegal, isLoading, upsert, isUpserting } = useCompanyLegal();
  const [initialized, setInitialized] = useState(false);

  const [formData, setFormData] = useState<CompanyLegalInput>({
    legal_name: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: '',
    vat_number: '',
    registration_number: '',
    contact_email: '',
  });

  // Initialize form data from fetched record
  useEffect(() => {
    if (companyLegal && !initialized) {
      setFormData({
        legal_name: companyLegal.legal_name || '',
        street_address: companyLegal.street_address || '',
        city: companyLegal.city || '',
        postal_code: companyLegal.postal_code || '',
        country: companyLegal.country || '',
        vat_number: companyLegal.vat_number || '',
        registration_number: companyLegal.registration_number || '',
        contact_email: companyLegal.contact_email || '',
      });
      setInitialized(true);
    } else if (!companyLegal && !isLoading && !initialized) {
      setInitialized(true);
    }
  }, [companyLegal, isLoading, initialized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert(formData);
  };

  const updateField = (field: keyof CompanyLegalInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && !initialized) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FileText className="text-primary" />
          {t('businessPortal.settings_legal_title')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('businessPortal.settings_legal_subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Legal Name */}
          <div className="space-y-2">
            <Label htmlFor="legal_name" className="text-foreground flex items-center gap-2">
              <Building2 size={16} />
              {t('businessPortal.settings_legal_company_name_label')}
            </Label>
            <Input
              id="legal_name"
              placeholder={t('business.legal.legal_name_placeholder')}
              className="bg-background border-border text-foreground"
              value={formData.legal_name || ''}
              onChange={(e) => updateField('legal_name', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('businessPortal.settings_legal_company_name_hint')}
            </p>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <Label className="text-foreground flex items-center gap-2">
              <MapPin size={16} />
              {t('businessPortal.settings_legal_address_label')}
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="street_address" className="text-sm text-muted-foreground">
                  {t('businessPortal.settings_legal_address_street')}
                </Label>
                <Input
                  id="street_address"
                  placeholder={t('business.legal.street_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={formData.street_address || ''}
                  onChange={(e) => updateField('street_address', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm text-muted-foreground">
                  {t('business.legal.city')}
                </Label>
                <Input
                  id="city"
                  placeholder={t('business.legal.city_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-sm text-muted-foreground">
                  {t('business.legal.postal_code')}
                </Label>
                <Input
                  id="postal_code"
                  placeholder={t('business.legal.postal_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={formData.postal_code || ''}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="country" className="text-sm text-muted-foreground">
                  {t('business.legal.country')}
                </Label>
                <Input
                  id="country"
                  placeholder={t('business.legal.country_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={formData.country || ''}
                  onChange={(e) => updateField('country', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Registration Info */}
          <div className="space-y-4">
            <Label className="text-foreground flex items-center gap-2">
              <FileText size={16} />
              {t('business.legal.registration_info')}
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vat_number" className="text-sm text-muted-foreground">
                  {t('business.legal.vat_number')}
                </Label>
                <Input
                  id="vat_number"
                  placeholder={t('business.legal.vat_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={formData.vat_number || ''}
                  onChange={(e) => updateField('vat_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number" className="text-sm text-muted-foreground">
                  {t('business.legal.registration_number')}
                </Label>
                <Input
                  id="registration_number"
                  placeholder={t('business.legal.registration_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={formData.registration_number || ''}
                  onChange={(e) => updateField('registration_number', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact_email" className="text-foreground flex items-center gap-2">
              <Mail size={16} />
              {t('business.legal.contact_email')}
            </Label>
            <Input
              id="contact_email"
              type="email"
              placeholder={t('business.legal.contact_email_placeholder')}
              className="bg-background border-border text-foreground"
              value={formData.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('business.legal.contact_email_hint')}
            </p>
          </div>

          {/* Save Button */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isUpserting}
          >
            {isUpserting ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : (
              <Save className="mr-2" size={16} />
            )}
            {isUpserting ? t('business_portal.saving') : t('business.legal.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompanyLegalSettings;
