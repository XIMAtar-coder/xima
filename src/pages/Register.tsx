import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import { RegistrationForm } from '../types';
import LandingLayout from '@/components/landing/LandingLayout';
import Seo from '@/components/Seo';
import { syncGuestAssessmentToProfile, syncGuestCvToProfile } from '@/utils/assessmentSync';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAuthButton, PENDING_CONSENT_KEY } from '@/components/auth/GoogleAuthButton';
import { ConsentCheckboxes } from '@/components/auth/ConsentCheckboxes';
import { recordUserConsents } from '@/hooks/useConsentRecording';
import { checkPassword, isPasswordAuthError, PASSWORD_MIN_LENGTH } from '@/lib/auth/passwordPolicy';
import { useXimatarsCatalog } from '@/hooks/useXimatarsCatalog';
import { normalizeXimatarImageUrl } from '@/utils/normalizeXimatarImage';
import { Eyebrow, Panel } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { log } from '@/lib/log';
import { Check } from 'lucide-react';

/** The guest's result, if the journey ran in this tab: shown beside the form. */
function useGuestResult() {
  const [label] = useState(() => {
    try { return sessionStorage.getItem('guest_ximatar'); } catch { return null; }
  });
  const [name] = useState(() => {
    try { return sessionStorage.getItem('guest_ximatar_name'); } catch { return null; }
  });
  const [hasCv] = useState(() => {
    try { return !!sessionStorage.getItem('guest_cv_analysis'); } catch { return false; }
  });
  const { catalogMap } = useXimatarsCatalog();
  if (!label) return null;
  const item = catalogMap.get(label.toLowerCase());
  return {
    label,
    name: name || label,
    tagline: item?.translation?.title || '',
    imageUrl: item?.image_url ? normalizeXimatarImageUrl(item.image_url) : `/ximatars/${label.toLowerCase()}.webp`,
    hasCv,
  };
}

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signUp, isAuthenticated } = useUser();
  const { t, i18n } = useTranslation();
  const refCode = searchParams.get('ref') || '';
  const guestResult = useGuestResult();

  const [formData, setFormData] = useState<RegistrationForm>({
    name: '',
    email: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Partial<RegistrationForm> & { confirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  React.useEffect(() => {
    if (isSubmitting) return;
    if (isAuthenticated) {
      const savedSelection = localStorage.getItem('selectedProfessional');
      if (savedSelection) {
        localStorage.removeItem('selectedProfessional');
        navigate('/profile', { state: JSON.parse(savedSelection) });
      } else {
        navigate('/profile');
      }
    }
  }, [isAuthenticated, isSubmitting, navigate]);

  const validateForm = () => {
    const newErrors: Partial<RegistrationForm> & { confirm?: string } = {};
    if (!formData.name.trim()) newErrors.name = t('register.name_required');
    if (!formData.email.trim()) newErrors.email = t('register.email_required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('register.email_invalid');
    if (!formData.password) newErrors.password = t('register.password_required');
    else if (!checkPassword(formData.password, { email: formData.email }).valid) newErrors.password = t('register.password_rules_unmet', 'The password does not meet the requirements below.');
    if (formData.password && confirmPassword !== formData.password) newErrors.confirm = t('register.passwords_match');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateConsents = () => {
    const consentsValid = privacyAccepted && termsAccepted;
    setShowConsentError(!consentsValid);
    return consentsValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formValid = validateForm();
    const consentsValid = validateConsents();
    if (!formValid || !consentsValid) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await signUp(formData.email, formData.password, formData.name);
      if (error) {
        if (isPasswordAuthError(error)) {
          // Supabase also rejects leaked passwords; say so at the field.
          setErrors(prev => ({ ...prev, password: t('register.password_rejected', 'This password appears in lists of leaked or easy-to-guess passwords. Choose a different one.') }));
          document.getElementById('password')?.focus();
          return;
        }
        toast({ title: t('register.registration_failed'), description: error.message, variant: "destructive" });
        return;
      }

      const newUserId = data?.user?.id;
      const hasSession = !!data?.session;

      // Persist pending post-signup actions
      try {
        sessionStorage.setItem('xima_pending_welcome', JSON.stringify({
          userId: newUserId,
          email: formData.email,
          name: formData.name?.split(' ')[0] || formData.name,
          locale: (i18n.language || 'en').slice(0, 2),
        }));
        if (refCode) sessionStorage.setItem('xima_pending_ref', refCode);
      } catch (e) { log.warn('[Register] non-critical error', e); }

      if (newUserId && hasSession) {
        const consentResult = await recordUserConsents(newUserId, i18n.language);
        if (!consentResult.success) {
          await supabase.auth.signOut();
          toast({ title: t('register.consent_error_title', 'Registration Error'), description: t('register.consent_error_desc', 'Failed to record your consent. Please try registering again.'), variant: "destructive" });
          return;
        }

        if (refCode) {
          try { await supabase.rpc('apply_referral_on_signup', { invite_code: refCode }); }
          catch (refErr) { log.warn('[Register] Referral apply exception:', refErr); }
        }

        // 72h verification window
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 72);

        try {
          await supabase.from('profiles').update({
            verification_required_until: deadline.toISOString(),
            email_verified_at: null,
          }).eq('user_id', newUserId);
        } catch (e) { log.warn('[Register] verification deadline update failed', e); }

        try {
          const { error: emailErr } = await supabase.functions.invoke('send-verification-email', {
            body: {
              user_id: newUserId,
              email: formData.email,
              name: formData.name,
              verification_deadline: deadline.toISOString(),
            },
          });
          if (emailErr) {
            log.error('[Register] Verification email failed:', emailErr);
            toast({ title: 'Account creato', description: 'La mail di verifica potrebbe arrivare con qualche minuto di ritardo.' });
          } else {
            toast({ title: 'Account creato!', description: 'Controlla la tua email per confermare entro 72 ore.' });
          }
        } catch (emailErr) { log.error('[Register] verification email exception', emailErr); }

        const assessmentSynced = await syncGuestAssessmentToProfile(newUserId).catch((e) => {
          log.error('[Register] assessment sync failed:', e);
          return false;
        });
        if (!assessmentSynced) {
          log.error('[Register] assessment sync did not complete for user:', newUserId);
        }

        const cvSynced = await syncGuestCvToProfile(newUserId).catch((e) => {
          log.error('[Register] cv sync failed (non-fatal):', e);
          return false;
        });
        log.debug('[Register] guest sync completed before dashboard navigation', {
          assessmentSynced,
          cvSynced,
        });

        try {
          sessionStorage.setItem('xima_profile_sync_completed', String(Date.now()));
        } catch (e) { log.warn('[Register] non-critical error', e); }
        navigate('/profile');
        return;
      }

      // Fallback: no session (e.g. confirm-email still enabled somehow) → go to login
      toast({ title: 'Account creato', description: 'Accedi per continuare.' });
      navigate('/login');

    } catch (error) {
      toast({ title: t('register.registration_failed'), description: t('register.try_again'), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (invalid: boolean) =>
    cn('h-[46px] rounded-md border-[hsl(var(--xs-line))] px-3 text-[15px]', invalid && 'ring-2 ring-destructive');
  const revealClass = 'absolute inset-y-0 right-0 flex items-center px-3 text-[11px] font-medium text-primary hover:underline';

  return (
    <LandingLayout>
      <Seo
        title="Create your account — XIMA"
        description="Join XIMA and build your XIMAtar — a behavioral identity across five pillars that connects you with the right mentors and employers."
        path="/register"
      />
      <div className="mx-auto grid w-full max-w-[1160px] gap-8 px-4 pb-14 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-x-[88px] lg:pt-14">
        {/* Context: what the account keeps. */}
        <aside className="min-w-0 lg:pt-6">
          {guestResult ? (
            <>
              <Eyebrow>{t('register.context_eyebrow')}</Eyebrow>
              <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-1.2px] text-foreground sm:text-[40px] sm:tracking-[-1.6px] lg:text-[48px] lg:tracking-[-1.8px]">
                {t('register.context_title')}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:mt-5 sm:text-[17px]">{t('register.context_lead')}</p>

              {/* The XIMAtar art is an opaque square, so it is framed on the
                  tinted field rather than cut out over it. */}
              <div className="relative mt-5 overflow-hidden rounded-lg border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] p-4 sm:mt-7 sm:p-6">
                <img
                  src={guestResult.imageUrl}
                  alt={guestResult.name}
                  className="mx-auto h-[180px] w-[180px] rounded-lg object-contain sm:mr-0 sm:h-[260px] sm:w-[260px]"
                  onError={(e) => { e.currentTarget.src = '/ximatars/fox.webp'; }}
                />
                <div className="mt-4 grid rounded border border-[hsl(var(--xs-line))] bg-card px-4 py-3 sm:absolute sm:bottom-6 sm:left-6 sm:mt-0 sm:min-w-[205px] sm:max-w-[55%] sm:px-5 sm:py-3.5">
                  <Eyebrow>{t('register.your_ximatar')}</Eyebrow>
                  <strong className="text-[22px] font-semibold capitalize tracking-[-0.6px] text-foreground sm:text-[26px] sm:tracking-[-0.8px]">{guestResult.name}</strong>
                  {guestResult.tagline && <span className="text-[11px] text-muted-foreground">{guestResult.tagline}</span>}
                </div>
              </div>

              <div className="mt-4 flex gap-3.5 text-[13px] text-muted-foreground sm:mt-6">
                <Check size={20} className="shrink-0 text-primary" aria-hidden />
                <p>
                  <strong className="font-semibold text-foreground">{t('register.saved_title')}</strong>
                  <br />
                  {guestResult.hasCv ? t('register.saved_body_with_cv') : t('register.saved_body')}
                </p>
              </div>
            </>
          ) : (
            <Panel className="p-6 sm:p-8">
              <Eyebrow>{t('register.neutral_eyebrow')}</Eyebrow>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-1px] text-foreground sm:text-[34px] sm:tracking-[-1.3px]">
                {t('register.neutral_title')}
              </h2>
              <p className="mt-3 text-[15px] text-muted-foreground">{t('register.neutral_lead')}</p>
            </Panel>
          )}
        </aside>

        {/* The form. */}
        <section aria-label={t('register.tab_register')} className="min-w-0">
          <div className="mb-6 flex gap-7 border-b border-[hsl(var(--xs-line))]" role="group" aria-label={t('register.tab_register')}>
            <button type="button" aria-pressed="true" className="-mb-px border-b-[3px] border-primary py-3 text-[15px] font-bold text-foreground">
              {t('register.tab_register')}
            </button>
            <button type="button" aria-pressed="false" onClick={() => navigate('/login')} className="-mb-px border-b-[3px] border-transparent py-3 text-[15px] text-muted-foreground hover:text-foreground">
              {t('register.tab_login')}
            </button>
          </div>
          <Eyebrow>{t('register.kicker')}</Eyebrow>
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.12] tracking-[-1.1px] text-foreground sm:text-[34px] sm:tracking-[-1.3px]">
            {t('register.title_new')}
          </h1>
          <p className="mb-6 mt-3 text-[15px] text-muted-foreground">
            {guestResult ? t('register.intro_with_results') : t('register.subtitle')}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Consent applies to both ways of signing up: Google used to skip it. */}
            <ConsentCheckboxes
              legend={t('register.consents_legend')}
              privacyAccepted={privacyAccepted} termsAccepted={termsAccepted}
              onPrivacyChange={setPrivacyAccepted} onTermsChange={setTermsAccepted}
              showError={showConsentError} className="mb-4"
            />

            <GoogleAuthButton
              mode="register"
              beforeStart={() => {
                if (!validateConsents()) return false;
                try { sessionStorage.setItem(PENDING_CONSENT_KEY, i18n.language); } catch { /* storage unavailable */ }
                return true;
              }}
            />

            <div className="my-5 flex items-center gap-3.5 text-[11px] text-muted-foreground before:h-px before:flex-1 before:bg-[hsl(var(--xs-line))] after:h-px after:flex-1 after:bg-[hsl(var(--xs-line))]">
              {t('register.or_with_email_short')}
            </div>

            <div className="grid gap-3.5">
              <div>
                <Label htmlFor="name" className="mb-1.5 block text-xs font-semibold">{t('register.full_name')}</Label>
                <Input
                  id="name" name="name" autoComplete="name"
                  placeholder={t('register.name_placeholder')}
                  value={formData.name} onChange={handleChange}
                  aria-invalid={!!errors.name}
                  className={fieldClass(!!errors.name)}
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="mb-1.5 block text-xs font-semibold">{t('register.email')}</Label>
                <Input
                  id="email" name="email" type="email" autoComplete="email"
                  placeholder={t('register.email_placeholder')}
                  value={formData.email} onChange={handleChange}
                  aria-invalid={!!errors.email}
                  className={fieldClass(!!errors.email)}
                />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="mb-1.5 block text-xs font-semibold">{t('register.password')}</Label>
                <div className="relative">
                  <Input
                    id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                    placeholder={t('register.password_placeholder')}
                    value={formData.password} onChange={handleChange}
                    aria-describedby="password-requirements"
                    aria-invalid={!!errors.password}
                    className={cn(fieldClass(!!errors.password), 'pr-20')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={revealClass}
                    aria-label={showPassword ? t('register.hide_password') : t('register.show_password')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? t('register.hide') : t('register.show')}
                  </button>
                </div>
                <ul id="password-requirements" className="mt-2 space-y-0.5" aria-live="polite">
                  {checkPassword(formData.password, { email: formData.email }).rules.map((rule) => (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-1.5 text-xs ${rule.ok ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}
                    >
                      {rule.ok ? <Check size={12} className="shrink-0" /> : <span className="w-3 shrink-0 text-center">•</span>}
                      {t(`register.password_rule_${rule.id}`, { count: PASSWORD_MIN_LENGTH })}
                    </li>
                  ))}
                </ul>
                {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold">{t('register.confirm_password')}</Label>
                <div className="relative">
                  <Input
                    id="confirm-password" name="confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                    placeholder={t('register.confirm_placeholder')}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={!!errors.confirm}
                    className={cn(fieldClass(!!errors.confirm), 'pr-20')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className={revealClass}
                    aria-label={showConfirm ? t('register.hide_confirm_password') : t('register.show_confirm_password')}
                    aria-pressed={showConfirm}
                  >
                    {showConfirm ? t('register.hide') : t('register.show')}
                  </button>
                </div>
                {errors.confirm && <p className="mt-1 text-sm text-destructive">{errors.confirm}</p>}
              </div>
            </div>

            <Button type="submit" className="mt-5 min-h-[48px] w-full rounded-[7px] text-[15px]" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('register.creating_account')}
                </>
              ) : (
                guestResult ? t('register.create_and_save') : t('register.create_account')
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            {t('register.have_account')}{' '}
            <button type="button" onClick={() => navigate('/login')} className="font-semibold text-primary hover:underline">
              {t('register.log_in')}
            </button>
          </p>
        </section>
      </div>
    </LandingLayout>
  );
};

export default Register;
