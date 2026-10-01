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
import { Building2, Mail, Lock, Globe, ArrowLeft, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
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

/** What the generator wrote, as shown at the end of the registration. */
interface BuiltProfile {
  summary?: string | null;
  values?: string[] | null;
  ideal_traits?: string[] | null;
  recommended_ximatars?: string[] | null;
  website_scan_status?: string | null;
}

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
  // After the account exists: the profile is written from the website and
  // shown here, so the company sees what candidates will read before it
  // ever reaches the dashboard.
  const [phase, setPhase] = useState<'form' | 'building' | 'ready' | 'later'>('form');
  const [builtProfile, setBuiltProfile] = useState<BuiltProfile | null>(null);
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
          p_company_name: formData.companyName.trim(),
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

      toast({
        title: t('businessRegistration.success', 'Account Created!'),
        description: t('businessRegistration.success_desc', 'Your business account is ready. Check your email to verify.'),
      });

      // No session (the project asks to confirm the email first): the old
      // way, through the login. The profile is then built from the dashboard.
      if (!authData.session) {
        setTimeout(() => navigate('/business/login'), 2000);
        return;
      }
      if (!formData.website) {
        navigate('/business/dashboard');
        return;
      }

      setPhase('building');
      const userId = authData.user.id;
      const generation = supabase.functions.invoke('generate-company-profile', {
        body: { company_id: userId, company_name: formData.companyName.trim(), website: formData.website, language: i18n.language },
      });
      const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 75_000));
      const outcome = await Promise.race([generation, timeout]);
      if (outcome === 'timeout' || outcome.error) {
        if (outcome !== 'timeout') log.error('Company profile gen error:', outcome.error);
        setPhase('later');
        return;
      }
      const { data: row } = await supabase
        .from('company_profiles')
        .select('summary, values, ideal_traits, recommended_ximatars, website_scan_status')
        .eq('company_id', userId)
        .maybeSingle();
      if (row) {
        setBuiltProfile(row as BuiltProfile);
        setPhase('ready');
      } else {
        setPhase('later');
      }
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
    t('businessRegistration.step1_subtitle', 'In 20 minutes you have your first hiring goal ready. Let us start from who you are.'),
    t('businessRegistration.step2_subtitle', 'Two facts about the company: they help read candidates better.'),
    t('businessRegistration.step3_subtitle', 'How you work and how you choose: this is what candidates will see of you.'),
  ];

  // Strength in four notches, from the rules already checked: no list to read.
  const rulesOk = passwordCheck.rules.filter(r => r.ok).length;
  const strength = formData.password.length === 0 ? 0 : passwordCheck.valid ? (formData.password.length >= 12 ? 4 : 3) : Math.min(2, Math.max(1, rulesOk - 2));
  const firstFailing = passwordCheck.rules.find(r => !r.ok);

  if (phase !== 'form') {
    const thin = builtProfile?.website_scan_status === 'insufficient';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-xl border-border/50 shadow-xl">
          <CardHeader className="space-y-2 pb-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{formData.companyName.trim()}</p>
            <CardTitle className="text-2xl font-bold">
              {phase === 'building' && t('businessRegistration.building_title', 'We are reading your website')}
              {phase === 'ready' && t('businessRegistration.ready_title', 'This is how we present you')}
              {phase === 'later' && t('businessRegistration.later_title', 'Your account is ready')}
            </CardTitle>
            <CardDescription className="text-sm">
              {phase === 'building' && t('businessRegistration.building_body', 'About half a minute: we are writing the profile candidates will read.')}
              {phase === 'ready' && t('businessRegistration.ready_body', 'You can correct it whenever you want from the settings.')}
              {phase === 'later' && t('businessRegistration.later_body', 'The company profile will be ready in the dashboard in a moment.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {phase === 'building' && (
              <div role="status" className="space-y-3">
                <Progress value={66} className="h-1.5 animate-pulse" />
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>{t('businessRegistration.building_step_1', 'Reading the pages of the site')}</li>
                  <li>{t('businessRegistration.building_step_2', 'Values, way of working, what you look for')}</li>
                  <li>{t('businessRegistration.building_step_3', 'The XIMAtars closest to you')}</li>
                </ul>
              </div>
            )}

            {phase === 'ready' && builtProfile && (
              <div className="space-y-4">
                {builtProfile.summary && <p className="text-sm leading-relaxed text-foreground">{builtProfile.summary}</p>}
                {!!builtProfile.values?.length && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t('businessRegistration.ready_values', 'Values')}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {builtProfile.values.map(v => <span key={v} className="rounded-md border border-border px-2 py-0.5 text-xs text-foreground">{v}</span>)}
                    </div>
                  </div>
                )}
                {!!builtProfile.ideal_traits?.length && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t('businessRegistration.ready_traits', 'What you look for in a person')}</p>
                    <p className="mt-1 text-sm text-foreground">{builtProfile.ideal_traits.join(' · ')}</p>
                  </div>
                )}
                {!!builtProfile.recommended_ximatars?.length && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t('businessRegistration.ready_ximatars', 'The XIMAtars closest to you')}</p>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {builtProfile.recommended_ximatars.map(x => (
                        <div key={x} className="flex items-center gap-2 text-sm text-foreground">
                          <img src={`/ximatars/${x}.webp`} alt="" width={36} height={36} className="h-9 w-9 object-contain" loading="lazy" />
                          <span>{t(`ximatar.${x}.name`, x.charAt(0).toUpperCase() + x.slice(1))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {thin && (
                  <p className="rounded-lg border-l-4 border-primary bg-primary/5 p-3 text-sm text-foreground">
                    {t('businessRegistration.ready_thin', 'Your website said little about how you work: add a few lines from the settings and the profile will sound more like you.')}
                  </p>
                )}
              </div>
            )}

            {phase !== 'building' && (
              <div className="space-y-2">
                <Button className="w-full" onClick={() => navigate('/business/dashboard')}>
                  {t('businessRegistration.ready_cta', 'Go to the dashboard')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">{t('businessRegistration.ready_email', 'We have sent you an email to confirm your address.')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // The draft of the profile, from what has been typed so far. Nothing is
  // sent anywhere: it only shows that every answer ends up somewhere.
  const draftFilled = [formData.companyName, formData.website, formData.industry, formData.companySize, formData.growthStage, formData.teamCulture, formData.hiringApproach].filter(v => v.trim()).length;
  const draftLevel = draftFilled >= 6 ? 3 : draftFilled >= 3 ? 2 : 1;
  const siteHost = (() => {
    try { return formData.website ? new URL(formData.website.includes('://') ? formData.website : `https://${formData.website}`).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
  })();
  const draftMeta = [
    formData.industry ? t(industryLabelKey(formData.industry as Parameters<typeof industryLabelKey>[0]), formData.industry) : '',
    formData.companySize ? `${formData.companySize} ${t('businessRegistration.employees', 'employees')}` : '',
    formData.growthStage ? t(`businessRegistration.stages.${formData.growthStage}`, formData.growthStage) : '',
    [formData.headquartersCity, formData.headquartersCountry].filter(Boolean).join(', '),
  ].filter(Boolean);

  const draft = (
    <aside id="biz-reg-draft" aria-label={t('businessRegistration.draft_title', 'The draft of your profile')} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{t('businessRegistration.draft_title', 'The draft of your profile')}</p>
        <span className="text-[11px] text-muted-foreground">{t('businessRegistration.draft_live', 'Updates as you type')}</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary" aria-hidden="true">
          {(formData.companyName.trim()[0] || '·').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-foreground">{formData.companyName.trim() || t('businessRegistration.draft_empty', 'Your company')}</p>
          {draftMeta.length > 0 && <p className="text-xs text-muted-foreground">{draftMeta.join(' · ')}</p>}
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        {formData.teamCulture && (
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">{t('businessRegistration.draft_culture', 'How you work')}</dt>
            <dd className="text-foreground">{t(`businessRegistration.cultures.${formData.teamCulture}`, formData.teamCulture)}</dd>
          </div>
        )}
        {formData.hiringApproach && (
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">{t('businessRegistration.draft_hiring', 'How you choose')}</dt>
            <dd className="text-foreground">{t(`businessRegistration.approaches.${formData.hiringApproach}`, formData.hiringApproach)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        {siteHost
          ? t('businessRegistration.draft_site_yes', { host: siteHost, defaultValue: 'From {{host}} we will read your values, your way of working and the traits you look for.' })
          : t('businessRegistration.draft_site_no', 'Without a website we start from what you write here: you can enrich it later.')}
      </p>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('businessRegistration.draft_level_label', 'Profile detail')}</span>
          <span className="font-medium text-foreground">{t(`businessRegistration.draft_level_${draftLevel}`, ['Essential', 'Good', 'Complete'][draftLevel - 1])}</span>
        </div>
        <Progress value={Math.round((draftFilled / 7) * 100)} className="mt-1.5 h-1.5" />
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="grid w-full max-w-lg gap-5 lg:max-w-5xl lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <Card className="w-full border-border/50 shadow-xl">
        <CardHeader className="space-y-3 pb-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{t('businessRegistration.title', 'Business Portal')}</p>
          <CardTitle className="text-2xl font-bold tracking-[-0.02em]">
            {t('businessRegistration.headline', 'Your next colleague starts here.')}
          </CardTitle>
          <CardDescription className="text-sm">{stepSubtitles[step - 1]}</CardDescription>
          {/* Progress, with the name of each step */}
          <ol className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3].map(n => (
              <li key={n}>
                <Progress value={step >= n ? 100 : 0} className="h-1.5" />
                <span className={cn('mt-1.5 block text-xs', step === n ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  0{n} · {t(`businessRegistration.step_name_${n}`, ['Access', 'Company', 'How you choose'][n - 1])}
                </span>
              </li>
            ))}
          </ol>
          <a href="#biz-reg-draft" className="text-xs font-medium text-primary underline-offset-4 hover:underline lg:hidden">
            {t('businessRegistration.draft_see', 'See the draft of your profile ↓')}
          </a>
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
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map(n => (
                      <span
                        key={n}
                        className={cn(
                          'h-1 flex-1 rounded-full',
                          strength >= n ? (strength >= 3 ? 'bg-green-600' : 'bg-amber-500') : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                  <p
                    className={cn(
                      'mt-1.5 text-xs',
                      passwordCheck.valid ? 'text-green-700 dark:text-green-400' : showPasswordRules && firstFailing ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {passwordCheck.valid
                      ? t('businessRegistration.password_ok', 'Good password.')
                      : showPasswordRules && firstFailing
                        ? t(`businessRegistration.password_rule_${firstFailing.id}`, { count: 8 })
                        : t('businessRegistration.password_one_rule', 'At least 8 characters with a letter and a number; not a common one, not your company name.')}
                  </p>
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
      {draft}
      </div>
    </div>
  );
};

export default BusinessRegister;
