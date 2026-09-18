import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Globe, ArrowLeft, ArrowRight, Check, Eye, EyeOff, X } from 'lucide-react';
import { ConsentCheckboxes } from '@/components/auth/ConsentCheckboxes';
import { recordUserConsents } from '@/hooks/useConsentRecording';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { log } from '@/lib/log';
import { INDUSTRIES, industryLabelKey } from '@/lib/business/industries';
import { checkPassword, isPasswordAuthError } from '@/lib/auth/passwordPolicy';

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

  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  // Set when Supabase itself rejects the password at the end of step 3.
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [focusPasswordOnStep1, setFocusPasswordOnStep1] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof FormData, value: string) => {
    if (key === 'password') setPasswordServerError(null);
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const passwordCheck = useMemo(
    () => checkPassword(formData.password, { email: formData.email, companyName: formData.companyName }),
    [formData.password, formData.email, formData.companyName],
  );
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const canProceedStep1 = !!formData.companyName.trim() && emailLooksValid && passwordCheck.valid && !passwordServerError;
  const showPasswordRules = passwordTouched || formData.password.length > 0 || !!passwordServerError;

  useEffect(() => {
    if (step === 1 && focusPasswordOnStep1) {
      passwordInputRef.current?.focus();
      setFocusPasswordOnStep1(false);
    }
  }, [step, focusPasswordOnStep1]);
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
      if (signUpError) {
        if (isPasswordAuthError(signUpError)) {
          // Back to the password, keeping everything entered in steps 2 and 3.
          setPasswordServerError(signUpError.message);
          setPasswordTouched(true);
          setStep(1);
          setFocusPasswordOnStep1(true);
          toast({
            title: t('businessRegistration.failed', 'Registration Failed'),
            description: t('businessRegistration.password_rejected_toast'),
            variant: 'destructive',
          });
          return;
        }
        throw signUpError;
      }
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
        }).then(({ data, error }) => {
          if (error) {
            log.error('Company profile gen error:', error);
            return;
          }
          if ((data as any)?.website_scan_status === 'insufficient') {
            toast({
              title: t('businessRegistration.success', 'Account Created!'),
              description: t('business.dashboard.profile_generated_partial', 'Non siamo riusciti a leggere bene il sito — abbiamo usato i dati che hai inserito; puoi modificare il profilo.'),
            });
          }
        }).catch(e => log.error('Company profile gen error:', e));
      }

      toast({
        title: t('businessRegistration.success', 'Account Created!'),
        description: t('businessRegistration.success_desc', 'Your business account is ready. Check your email to verify.'),
      });
      setTimeout(() => navigate('/business/login'), 2000);
    } catch (error: any) {
      log.error('Registration error:', error);
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
                <Label htmlFor="biz-reg-company">{t('businessRegistration.company_name', 'Company Name')}</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input id="biz-reg-company" placeholder="Acme Corporation" className="pl-10" value={formData.companyName}
                    onChange={e => update('companyName', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-reg-email">{t('businessRegistration.email', 'Business Email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input id="biz-reg-email" type="email" placeholder="hr@company.com" className="pl-10" value={formData.email}
                    onChange={e => update('email', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-reg-password">{t('businessRegistration.password', 'Password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} aria-hidden="true" />
                  <Input
                    id="biz-reg-password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pl-10 pr-11"
                    value={formData.password}
                    onChange={e => update('password', e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    required
                    minLength={8}
                    aria-invalid={showPasswordRules && (!passwordCheck.valid || !!passwordServerError)}
                    aria-describedby="biz-reg-password-rules"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword
                      ? t('businessRegistration.password_hide', 'Hide password')
                      : t('businessRegistration.password_show', 'Show password')}
                    aria-pressed={showPassword}
                    aria-controls="biz-reg-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
                <div id="biz-reg-password-rules" aria-live="polite">
                  {passwordServerError && (
                    <p className="text-xs text-destructive mb-1" role="alert">
                      {t('businessRegistration.password_rejected_inline')}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {passwordCheck.rules.map(rule => {
                      const state = rule.ok ? 'ok' : showPasswordRules ? 'fail' : 'pending';
                      return (
                        <li
                          key={rule.id}
                          className={cn(
                            'flex items-center gap-1.5 text-xs',
                            state === 'ok' && 'text-green-700 dark:text-green-400',
                            state === 'fail' && 'text-destructive',
                            state === 'pending' && 'text-muted-foreground',
                          )}
                        >
                          {state === 'ok'
                            ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            : state === 'fail'
                              ? <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              : <span className="h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center" aria-hidden="true">•</span>}
                          <span>
                            {t(`businessRegistration.password_rule_${rule.id}`, { count: 8 })}
                            <span className="sr-only">
                              {' '}{state === 'ok'
                                ? t('businessRegistration.password_rule_met')
                                : t('businessRegistration.password_rule_unmet')}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-reg-website">{t('businessRegistration.website', 'Company Website')}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input id="biz-reg-website" type="url" placeholder="https://company.com" className="pl-10" value={formData.website}
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
                <Label id="biz-reg-industry-label">{t('businessRegistration.industry', 'Industry Sector')}</Label>
                <Select value={formData.industry} onValueChange={v => update('industry', v)}>
                  <SelectTrigger aria-labelledby="biz-reg-industry-label biz-reg-industry-value"><SelectValue id="biz-reg-industry-value" placeholder={t('businessRegistration.select_industry', 'Select industry')} /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => (
                      <SelectItem key={ind} value={ind}>
                        {t(industryLabelKey(ind), ind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label id="biz-reg-size-label">{t('businessRegistration.company_size', 'Company Size')}</Label>
                <Select value={formData.companySize} onValueChange={v => update('companySize', v)}>
                  <SelectTrigger aria-labelledby="biz-reg-size-label biz-reg-size-value"><SelectValue id="biz-reg-size-value" placeholder={t('businessRegistration.select_size', 'Select size')} /></SelectTrigger>
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
                  <Label htmlFor="biz-reg-country">{t('businessRegistration.country', 'Country')}</Label>
                  <Input id="biz-reg-country" placeholder="Germany" value={formData.headquartersCountry}
                    onChange={e => update('headquartersCountry', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biz-reg-city">{t('businessRegistration.city', 'City')}</Label>
                  <Input id="biz-reg-city" placeholder="Berlin" value={formData.headquartersCity}
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
