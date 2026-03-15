import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/context/UserContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Globe, 
  Mail, 
  Save, 
  Clock, 
  TrendingUp, 
  MapPin, 
  Users, 
  Calendar,
  DollarSign,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import CompanyLegalSettings from '@/components/business/CompanyLegalSettings';
import { ProfilingOptOutSection } from '@/components/settings/ProfilingOptOutSection';
import { AccountDeletionSection } from '@/components/settings/AccountDeletionSection';
import { BusinessPlanCard } from '@/components/business/BusinessPlanCard';

const BusinessSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { businessProfile: sharedProfile, invalidate: invalidateBusinessProfile, updateOptimistically } = useBusinessProfile();
  const [loading, setLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Basic profile data
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    hrContactEmail: '',
    defaultChallengeDuration: 7,
    defaultChallengeDifficulty: 3
  });

  // Snapshot override data
  const [snapshotData, setSnapshotData] = useState({
    manual_hq_city: '',
    manual_hq_country: '',
    manual_industry: '',
    manual_employees_count: '',
    manual_revenue_range: '',
    manual_founded_year: '',
    manual_website: '',
    snapshot_manual_override: false,
    // Auto-extracted values for display
    snapshot_hq_city: '',
    snapshot_hq_country: '',
    snapshot_industry: '',
    snapshot_employees_count: '',
    snapshot_revenue_range: '',
    snapshot_founded_year: ''
  });

  // Initialize form data from shared profile
  useEffect(() => {
    if (sharedProfile && !initialized) {
      setFormData({
        companyName: sharedProfile.company_name || '',
        website: sharedProfile.website || '',
        hrContactEmail: sharedProfile.hr_contact_email || '',
        defaultChallengeDuration: sharedProfile.default_challenge_duration || 7,
        defaultChallengeDifficulty: sharedProfile.default_challenge_difficulty || 3
      });

      setSnapshotData({
        manual_hq_city: sharedProfile.manual_hq_city || '',
        manual_hq_country: sharedProfile.manual_hq_country || '',
        manual_industry: sharedProfile.manual_industry || '',
        manual_employees_count: sharedProfile.manual_employees_count?.toString() || '',
        manual_revenue_range: sharedProfile.manual_revenue_range || '',
        manual_founded_year: sharedProfile.manual_founded_year?.toString() || '',
        manual_website: sharedProfile.manual_website || '',
        snapshot_manual_override: sharedProfile.snapshot_manual_override || false,
        // Auto-extracted values
        snapshot_hq_city: sharedProfile.snapshot_hq_city || '',
        snapshot_hq_country: sharedProfile.snapshot_hq_country || '',
        snapshot_industry: sharedProfile.snapshot_industry || '',
        snapshot_employees_count: sharedProfile.snapshot_employees_count?.toString() || '',
        snapshot_revenue_range: sharedProfile.snapshot_revenue_range || '',
        snapshot_founded_year: sharedProfile.snapshot_founded_year?.toString() || ''
      });
      setInitialized(true);
    }
  }, [sharedProfile, initialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('business_profiles')
        .upsert({
          user_id: user?.id,
          company_name: formData.companyName,
          website: formData.website,
          hr_contact_email: formData.hrContactEmail,
          default_challenge_duration: formData.defaultChallengeDuration,
          default_challenge_difficulty: formData.defaultChallengeDifficulty
        });

      if (error) throw error;

      toast({
        title: t('business_portal.success'),
        description: t('business_portal.settings_updated')
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: t('business_portal.error'),
        description: error.message || t('business_portal.failed_update_settings'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = async () => {
    setSnapshotLoading(true);

    const updates = {
      manual_hq_city: snapshotData.manual_hq_city || null,
      manual_hq_country: snapshotData.manual_hq_country || null,
      manual_industry: snapshotData.manual_industry || null,
      manual_employees_count: snapshotData.manual_employees_count 
        ? parseInt(snapshotData.manual_employees_count) 
        : null,
      manual_revenue_range: snapshotData.manual_revenue_range || null,
      manual_founded_year: snapshotData.manual_founded_year 
        ? parseInt(snapshotData.manual_founded_year) 
        : null,
      manual_website: snapshotData.manual_website || null,
      snapshot_manual_override: snapshotData.snapshot_manual_override
    };

    try {
      const { error } = await supabase
        .from('business_profiles')
        .update(updates)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Optimistically update & invalidate shared cache so Dashboard updates immediately
      updateOptimistically(updates);
      invalidateBusinessProfile();

      toast({
        title: t('business_portal.success'),
        description: t('business.settings.snapshot_saved')
      });
    } catch (error: any) {
      console.error('Error saving snapshot:', error);
      toast({
        title: t('business_portal.error'),
        description: error.message || t('business.settings.snapshot_save_failed'),
        variant: 'destructive'
      });
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleResetToAI = async () => {
    setSnapshotLoading(true);

    const resetUpdates = {
      manual_hq_city: null,
      manual_hq_country: null,
      manual_industry: null,
      manual_employees_count: null,
      manual_revenue_range: null,
      manual_founded_year: null,
      manual_website: null,
      snapshot_manual_override: false
    };

    try {
      const { error } = await supabase
        .from('business_profiles')
        .update(resetUpdates)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Reset local state
      setSnapshotData(prev => ({
        ...prev,
        manual_hq_city: '',
        manual_hq_country: '',
        manual_industry: '',
        manual_employees_count: '',
        manual_revenue_range: '',
        manual_founded_year: '',
        manual_website: '',
        snapshot_manual_override: false
      }));

      // Optimistically update & invalidate shared cache so Dashboard updates immediately
      updateOptimistically(resetUpdates);
      invalidateBusinessProfile();

      toast({
        title: t('business_portal.success'),
        description: t('business.settings.snapshot_reset')
      });
    } catch (error: any) {
      console.error('Error resetting snapshot:', error);
      toast({
        title: t('business_portal.error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Get display value: manual if override enabled, otherwise auto
  const getDisplayValue = (field: keyof typeof snapshotData): string => {
    if (snapshotData.snapshot_manual_override) {
      const manualKey = `manual_${field.replace('snapshot_', '')}` as keyof typeof snapshotData;
      return (snapshotData[manualKey] as string) || (snapshotData[field] as string) || '';
    }
    return (snapshotData[field] as string) || '';
  };

  return (
    <BusinessLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.settings_page_title')}</h1>
          <p className="text-muted-foreground">{t('businessPortal.settings_page_subtitle')}</p>
        </div>

        {/* Plan & Entitlements */}
        <BusinessPlanCard />

        <form onSubmit={handleSubmit}>
          {/* Company Information */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="text-primary" />
                {t('businessPortal.settings_company_title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('businessPortal.settings_company_subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-foreground">{t('businessPortal.settings_company_name_label')}</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corporation"
                  className="bg-background border-border text-foreground"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-foreground flex items-center gap-2">
                  <Globe size={16} />
                  {t('businessPortal.settings_company_website_label')}
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://company.com"
                  className="bg-background border-border text-foreground"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hrContactEmail" className="text-foreground flex items-center gap-2">
                  <Mail size={16} />
                  {t('businessPortal.settings_company_hr_email_label')}
                </Label>
                <Input
                  id="hrContactEmail"
                  type="email"
                  placeholder="hr@company.com"
                  className="bg-background border-border text-foreground"
                  value={formData.hrContactEmail}
                  onChange={(e) => setFormData({ ...formData, hrContactEmail: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Challenge Defaults */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">{t('businessPortal.settings_challenge_defaults_title')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('businessPortal.settings_challenge_defaults_subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-foreground flex items-center gap-2">
                  <Clock size={16} />
                  {t('businessPortal.settings_challenge_duration_label')}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="30"
                  className="bg-background border-border text-foreground"
                  value={formData.defaultChallengeDuration}
                  onChange={(e) => setFormData({ ...formData, defaultChallengeDuration: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-foreground flex items-center gap-2">
                  <TrendingUp size={16} />
                  {t('businessPortal.settings_challenge_difficulty_label')}
                </Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="5"
                  className="bg-background border-border text-foreground"
                  value={formData.defaultChallengeDifficulty}
                  onChange={(e) => setFormData({ ...formData, defaultChallengeDifficulty: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            <Save className="mr-2" size={16} />
            {loading ? t('business_portal.saving') : t('businessPortal.settings_save_cta')}
          </Button>
        </form>

        <Separator className="my-8" />

        {/* Company Snapshot Section */}
        <Card id="snapshot" className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="text-amber-500" />
              {t('businessPortal.settings_snapshot_title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('businessPortal.settings_snapshot_subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manual Override Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">
                  {t('businessPortal.settings_snapshot_manual_toggle')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('businessPortal.settings_snapshot_manual_body')}
                </p>
              </div>
              <Switch
                checked={snapshotData.snapshot_manual_override}
                onCheckedChange={(checked) => 
                  setSnapshotData(prev => ({ ...prev, snapshot_manual_override: checked }))
                }
              />
            </div>

            {/* Snapshot Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <MapPin size={16} />
                  {t('businessPortal.settings_snapshot_city_label')}
                </Label>
                <Input
                  placeholder={snapshotData.snapshot_hq_city || t('business.settings.city_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={snapshotData.manual_hq_city}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_hq_city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <MapPin size={16} />
                  {t('businessPortal.settings_snapshot_country_label')}
                </Label>
                <Input
                  placeholder={snapshotData.snapshot_hq_country || t('business.settings.country_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={snapshotData.manual_hq_country}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_hq_country: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Building2 size={16} />
                  {t('business.settings.industry')}
                </Label>
                <Input
                  placeholder={snapshotData.snapshot_industry || t('business.settings.industry_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={snapshotData.manual_industry}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_industry: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Users size={16} />
                  {t('business.settings.employees')}
                </Label>
                <Input
                  type="number"
                  placeholder={snapshotData.snapshot_employees_count || t('business.settings.employees_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={snapshotData.manual_employees_count}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_employees_count: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Globe size={16} />
                  {t('business.settings.website')}
                </Label>
                <Input
                  type="url"
                  placeholder={formData.website || t('business.settings.website_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={snapshotData.manual_website}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <DollarSign size={16} />
                  {t('business.settings.revenue')}
                </Label>
                <Input
                  placeholder={snapshotData.snapshot_revenue_range || t('business.settings.revenue_placeholder')}
                  className="bg-background border-border text-foreground"
                  value={snapshotData.manual_revenue_range}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_revenue_range: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Calendar size={16} />
                  {t('business.settings.founded_year')}
                </Label>
                <Input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder={snapshotData.snapshot_founded_year || t('business.settings.founded_placeholder')}
                  className="bg-background border-border text-foreground max-w-xs"
                  value={snapshotData.manual_founded_year}
                  onChange={(e) => setSnapshotData({ ...snapshotData, manual_founded_year: e.target.value })}
                />
              </div>
            </div>

            {/* Helper text */}
            <p className="text-xs text-muted-foreground">
              {t('business.settings.snapshot_helper')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={handleSaveSnapshot}
                disabled={snapshotLoading}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2" size={16} />
                {snapshotLoading ? t('business_portal.saving') : t('business.settings.save_snapshot')}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleResetToAI}
                disabled={snapshotLoading}
                className="flex-1"
              >
                <RefreshCw className="mr-2" size={16} />
                {t('business.settings.reset_to_ai')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Legal Information Section */}
        <CompanyLegalSettings />

        <Separator className="my-8" />

        {/* GDPR: Profiling Opt-Out (Art. 21/22) */}
        <ProfilingOptOutSection />

        <Separator className="my-8" />

        {/* GDPR: Account Deletion (Art. 17) */}
        <AccountDeletionSection variant="business" />
      </div>
    </BusinessLayout>
  );
};

export default BusinessSettings;
