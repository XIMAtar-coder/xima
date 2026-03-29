import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Globe, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { ConsentCheckboxes } from '@/components/auth/ConsentCheckboxes';
import { recordUserConsents } from '@/hooks/useConsentRecording';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const INDUSTRIES = [
  'technology', 'finance', 'consulting', 'manufacturing',
  'automotive', 'energy', 'healthcare', 'education',
  'media', 'retail', 'food', 'real_estate',
  'nonprofit', 'government', 'other',
] as const;

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

const GROWTH_STAGES = ['startup', 'scaleup', 'established', 'enterprise', 'nonprofit_public'] as const;

const CULTURES = ['high_performance', 'collaborative', 'innovation_first', 'people_centered', 'mission_driven'] as const;

const HIRING_APPROACHES = ['skills_first', 'cultural_fit', 'potential', 'balanced'] as const;

interface FormData {
  email: string;
  password: string;
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  growthStage: string;
  headquartersCountry: string;
  headquartersCity: string;
  teamCulture: string;
  hiringApproach: string;
}

const BusinessRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '', password: '', companyName: '', website: '',
    industry: '', companySize: '', growthStage: '',
    headquartersCountry: '', headquartersCity: '',
    teamCulture: '', hiringApproach: '',
  });

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  const update = (key: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const canProceedStep1 = formData.companyName && formData.email && formData.password.length >= 6;
  const canSubmit = privacyAccepted && termsAccepted;

  const handleSubmit = async () => {
    if (!canSubmit) { setShowConsentError(true); return; }
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/business/dashboard`,
          data: { name: formData.companyName, user_type: 'business' },
        },
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user returned');

      await recordUserConsents(authData.user.id, i18n.language);

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'register_business_account' as any,
        {
          p_user_id: authData.user.id,
          p_company_name: formData.companyName,
          p_website_url: formData.website || null,
          p_recruiter_email: null,
          p_industry: formData.industry || null,
          p_company_size: formData.companySize || null,
          p_headquarters_country: formData.headquartersCountry || null,
          p_headquarters_city: formData.headquartersCity || null,
          p_hiring_approach: formData.hiringApproach || null,
          p_team_culture: formData.teamCulture || null,
          p_growth_stage: formData.growthStage || null,
        } as any,
      );

      if (rpcError) throw rpcError;
      const result = rpcResult as any;
      if (result && !result.success) throw new Error(result.error || 'Registration failed');

      // Trigger company profile generation async
      if (formData.website) {
        supabase.functions.invoke('generate-company-profile', {
          body: {
            company_id: authData.user.id,
            company_name: formData.companyName,
            website: formData.website,
          },
        }).catch(e => console.error('Company profile gen error:', e));
      }

      toast({
        title: t('businessRegistration.success', 'Account Created!'),
        description: t('businessRegistration.success_desc', 'Your business account is ready. Check your email to verify.'),
      });
      setTimeout(() => navigate('/business/login'), 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: t('businessRegistration.failed', 'Registration Failed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const SelectableCard = ({ value, current, onSelect, label, description }: {
    value: string; current: string; onSelect: (v: string) => void; label: string; description: string;
  }) => (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all duration-200',
        current === value
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          current === value ? 'border-primary bg-primary' : 'border-muted-foreground/30'
        )}>
          {current === value && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );

  const stepSubtitles = [
    t('businessRegistration.step1_subtitle', 'Start your free trial — discover how identity-first hiring transforms your team.'),
    t('businessRegistration.step2_subtitle', 'This helps XIMA understand your company\'s identity — like a XIMAtar, but for organizations.'),
    t('businessRegistration.step3_subtitle', 'XIMA matches candidates to companies based on identity, not just skills. Help us understand yours.'),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg border-border/50 shadow-xl">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <Building2 className="text-primary" size={28} />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t('businessRegistration.title', 'Business Portal')}
          </CardTitle>
          <CardDescription className="text-sm">{stepSubtitles[step - 1]}</CardDescription>
          {/* Progress */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1">
                <Progress value={step >= s ? 100 : 0} className="h-1.5" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('businessRegistration.step_label', 'Step {{current}} of {{total}}', { current: step, total: 3 })}
          </p>
        </CardHeader>

        <CardContent className="pt-2">
          {/* STEP 1 — The Basics */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('businessRegistration.company_name', 'Company Name')}</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input placeholder="Acme Corporation" className="pl-10" value={formData.companyName}
                    onChange={e => update('companyName', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('businessRegistration.email', 'Business Email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input type="email" placeholder="hr@company.com" className="pl-10" value={formData.email}
                    onChange={e => update('email', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('businessRegistration.password', 'Password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input type="password" placeholder="••••••••" className="pl-10" value={formData.password}
                    onChange={e => update('password', e.target.value)} required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('businessRegistration.website', 'Company Website')}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input type="url" placeholder="https://company.com" className="pl-10" value={formData.website}
                    onChange={e => update('website', e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('businessRegistration.website_hint', 'Your company profile will be automatically generated from this website')}
                </p>
              </div>
              <Button className="w-full" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                {t('businessRegistration.continue', 'Continue')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 — Your Organization */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('businessRegistration.industry', 'Industry Sector')}</Label>
                <Select value={formData.industry} onValueChange={v => update('industry', v)}>
                  <SelectTrigger><SelectValue placeholder={t('businessRegistration.select_industry', 'Select industry')} /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => (
                      <SelectItem key={ind} value={ind}>
                        {t(`businessRegistration.industries.${ind}`, ind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('businessRegistration.company_size', 'Company Size')}</Label>
                <Select value={formData.companySize} onValueChange={v => update('companySize', v)}>
                  <SelectTrigger><SelectValue placeholder={t('businessRegistration.select_size', 'Select size')} /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map(s => (
                      <SelectItem key={s} value={s}>{s} {t('businessRegistration.employees', 'employees')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('businessRegistration.growth_stage', 'Growth Stage')}</Label>
                <div className="space-y-2">
                  {GROWTH_STAGES.map(gs => (
                    <SelectableCard key={gs} value={gs} current={formData.growthStage}
                      onSelect={v => update('growthStage', v)}
                      label={t(`businessRegistration.stages.${gs}`, gs)}
                      description={t(`businessRegistration.stages.${gs}_desc`, '')} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('businessRegistration.country', 'Country')}</Label>
                  <Input placeholder="Germany" value={formData.headquartersCountry}
                    onChange={e => update('headquartersCountry', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('businessRegistration.city', 'City')}</Label>
                  <Input placeholder="Berlin" value={formData.headquartersCity}
                    onChange={e => update('headquartersCity', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('businessRegistration.back', 'Back')}
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  {t('businessRegistration.continue', 'Continue')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — How You Build Teams */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('businessRegistration.team_culture', 'Your team culture')}</Label>
                <div className="space-y-2">
                  {CULTURES.map(c => (
                    <SelectableCard key={c} value={c} current={formData.teamCulture}
                      onSelect={v => update('teamCulture', v)}
                      label={t(`businessRegistration.cultures.${c}`, c)}
                      description={t(`businessRegistration.cultures.${c}_desc`, '')} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('businessRegistration.hiring_approach', 'Your hiring approach')}</Label>
                <div className="space-y-2">
                  {HIRING_APPROACHES.map(ha => (
                    <SelectableCard key={ha} value={ha} current={formData.hiringApproach}
                      onSelect={v => update('hiringApproach', v)}
                      label={t(`businessRegistration.approaches.${ha}`, ha)}
                      description={t(`businessRegistration.approaches.${ha}_desc`, '')} />
                  ))}
                </div>
              </div>

              <ConsentCheckboxes
                privacyAccepted={privacyAccepted} termsAccepted={termsAccepted}
                onPrivacyChange={setPrivacyAccepted} onTermsChange={setTermsAccepted}
                showError={showConsentError} className="pt-2"
              />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('businessRegistration.back', 'Back')}
                </Button>
                <Button className="flex-1" disabled={loading} onClick={handleSubmit}>
                  {loading
                    ? t('businessRegistration.creating', 'Creating...')
                    : t('businessRegistration.submit', 'Create Business Account')}
                </Button>
              </div>
            </div>
          )}

          <div className="text-center text-sm mt-4">
            <span className="text-muted-foreground">{t('businessRegistration.have_account', 'Already have an account?')} </span>
            <Link to="/business/login" className="text-primary hover:underline">
              {t('businessRegistration.sign_in', 'Sign in')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessRegister;
