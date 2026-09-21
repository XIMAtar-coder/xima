import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSectionHeader } from '@/components/business/SettingsSectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanyLegal, CompanyLegalInput } from '@/hooks/useCompanyLegal';
import { Building2, MapPin, FileText, Mail, Save, Loader2 } from 'lucide-react';

const inputClass = 'bg-background border-[hsl(var(--xs-line))] text-foreground';

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
      <section id="legale" className="xs-panel scroll-mt-20 flex items-center justify-center py-12" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </section>
    );
  }

  return (
    <section id="legale" className="xs-panel scroll-mt-20">
      <SettingsSectionHeader
        index="04"
        eyebrow={t('businessPortal.settings_eyebrow_legal')}
        title={t('businessPortal.settings_legal_title')}
        subtitle={t('businessPortal.settings_legal_subtitle')}
      />
      <div>
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
              className={inputClass}
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
                  className={inputClass}
                  value={formData.street_address || ''}
                  onChange={(e) => updateField('street_address', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm text-muted-foreground">
                  {t('businessPortal.settings_legal_address_city')}
                </Label>
                <Input
                  id="city"
                  placeholder={t('business.legal.city_placeholder')}
                  className={inputClass}
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-sm text-muted-foreground">
                  {t('businessPortal.settings_legal_address_zip')}
                </Label>
                <Input
                  id="postal_code"
                  placeholder={t('business.legal.postal_placeholder')}
                  className={inputClass}
                  value={formData.postal_code || ''}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="country" className="text-sm text-muted-foreground">
                  {t('businessPortal.settings_legal_address_country')}
                </Label>
                <Input
                  id="country"
                  placeholder={t('business.legal.country_placeholder')}
                  className={inputClass}
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
              {t('businessPortal.settings_legal_registration_title')}
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vat_number" className="text-sm text-muted-foreground">
                  {t('businessPortal.settings_legal_vat_label')}
                </Label>
                <Input
                  id="vat_number"
                  placeholder={t('business.legal.vat_placeholder')}
                  className={inputClass}
                  value={formData.vat_number || ''}
                  onChange={(e) => updateField('vat_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number" className="text-sm text-muted-foreground">
                  {t('businessPortal.settings_legal_rea_label')}
                </Label>
                <Input
                  id="registration_number"
                  placeholder={t('business.legal.registration_placeholder')}
                  className={inputClass}
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
              {t('businessPortal.settings_legal_contact_email_label')}
            </Label>
            <Input
              id="contact_email"
              type="email"
              placeholder={t('business.legal.contact_email_placeholder')}
              className={inputClass}
              value={formData.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('businessPortal.settings_legal_contact_email_hint')}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex flex-col gap-3 border-t border-[hsl(var(--xs-line))] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">{t('businessPortal.settings_save_hint')}</span>
            <Button type="submit" disabled={isUpserting}>
              {isUpserting ? (
                <Loader2 className="mr-2 animate-spin" size={16} aria-hidden="true" />
              ) : (
                <Save className="mr-2" size={16} aria-hidden="true" />
              )}
              {isUpserting ? t('business_portal.saving') : t('businessPortal.settings_legal_save_cta')}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default CompanyLegalSettings;
