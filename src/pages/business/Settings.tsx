import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Globe, Mail, Save, Clock, TrendingUp } from 'lucide-react';

const BusinessSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    hrContactEmail: '',
    defaultChallengeDuration: 7,
    defaultChallengeDifficulty: 3
  });

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          companyName: data.company_name || '',
          website: data.website || '',
          hrContactEmail: data.hr_contact_email || '',
          defaultChallengeDuration: data.default_challenge_duration || 7,
          defaultChallengeDifficulty: data.default_challenge_difficulty || 3
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: t('business_portal.error'),
        description: t('business_portal.failed_load_profile'),
        variant: 'destructive'
      });
    }
  };

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

  return (
    <BusinessLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('business_portal.settings')}</h1>
          <p className="text-[#A3ABB5]">{t('business_portal.manage_preferences')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Company Information */}
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="text-[#3A9FFF]" />
                {t('business_portal.company_info')}
              </CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                {t('business_portal.update_details')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-white">{t('business_portal.company_name')}</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corporation"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-white flex items-center gap-2">
                  <Globe size={16} />
                  {t('business_portal.website')}
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://company.com"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hrContactEmail" className="text-white flex items-center gap-2">
                  <Mail size={16} />
                  {t('business_portal.hr_contact_email')}
                </Label>
                <Input
                  id="hrContactEmail"
                  type="email"
                  placeholder="hr@company.com"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.hrContactEmail}
                  onChange={(e) => setFormData({ ...formData, hrContactEmail: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Challenge Defaults */}
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white">{t('business_portal.challenge_defaults')}</CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                {t('business_portal.default_parameters')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-white flex items-center gap-2">
                  <Clock size={16} />
                  {t('business_portal.default_duration')}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="30"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.defaultChallengeDuration}
                  onChange={(e) => setFormData({ ...formData, defaultChallengeDuration: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-white flex items-center gap-2">
                  <TrendingUp size={16} />
                  {t('business_portal.default_difficulty')}
                </Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="5"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.defaultChallengeDifficulty}
                  onChange={(e) => setFormData({ ...formData, defaultChallengeDifficulty: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            type="submit"
            className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/90"
            disabled={loading}
          >
            <Save className="mr-2" size={16} />
            {loading ? t('business_portal.saving') : t('business_portal.save_settings')}
          </Button>
        </form>
      </div>
    </BusinessLayout>
  );
};

export default BusinessSettings;