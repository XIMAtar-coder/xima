import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import { RegistrationForm } from '../types';
import { Logo } from '@/components/Logo';
import LandingLayout from '@/components/landing/LandingLayout';
import Seo from '@/components/Seo';
import { syncGuestAssessmentToProfile, syncGuestCvToProfile } from '@/utils/assessmentSync';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { ConsentCheckboxes } from '@/components/auth/ConsentCheckboxes';
import { recordUserConsents } from '@/hooks/useConsentRecording';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signUp, isAuthenticated } = useUser();
  const { t, i18n } = useTranslation();
  const refCode = searchParams.get('ref') || '';
  
  const [formData, setFormData] = useState<RegistrationForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Partial<RegistrationForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  
  React.useEffect(() => {
    if (isAuthenticated) {
      const savedSelection = localStorage.getItem('selectedProfessional');
      if (savedSelection) {
        localStorage.removeItem('selectedProfessional');
        navigate('/profile', { state: JSON.parse(savedSelection) });
      } else {
        navigate('/profile');
      }
    }
  }, [isAuthenticated, navigate]);
  
  const validateForm = () => {
    const newErrors: Partial<RegistrationForm> = {};
    if (!formData.name.trim()) newErrors.name = t('register.name_required');
    if (!formData.email.trim()) newErrors.email = t('register.email_required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('register.email_invalid');
    if (!formData.password) newErrors.password = t('register.password_required');
    else if (formData.password.length < 6) newErrors.password = t('register.password_length');
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('register.passwords_match');
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
      } catch {}

      if (newUserId && hasSession) {
        const consentResult = await recordUserConsents(newUserId, i18n.language);
        if (!consentResult.success) {
          await supabase.auth.signOut();
          toast({ title: t('register.consent_error_title', 'Registration Error'), description: t('register.consent_error_desc', 'Failed to record your consent. Please try registering again.'), variant: "destructive" });
          return;
        }

        if (refCode) {
          try { await supabase.rpc('apply_referral_on_signup', { invite_code: refCode }); }
          catch (refErr) { console.warn('[Register] Referral apply exception:', refErr); }
        }

        // 72h verification window
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 72);

        try {
          await supabase.from('profiles').update({
            verification_required_until: deadline.toISOString(),
            email_verified_at: null,
          }).eq('user_id', newUserId);
        } catch (e) { console.warn('[Register] verification deadline update failed', e); }

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
            console.error('[Register] Verification email failed:', emailErr);
            toast({ title: 'Account creato', description: 'La mail di verifica potrebbe arrivare con qualche minuto di ritardo.' });
          } else {
            toast({ title: 'Account creato!', description: 'Controlla la tua email per confermare entro 72 ore.' });
          }
        } catch (emailErr) { console.error('[Register] verification email exception', emailErr); }

        await syncGuestAssessmentToProfile(newUserId);
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
  
  return (
    <LandingLayout>
      <Seo
        title="Create your account — XIMA"
        description="Join XIMA and build your XIMAtar — a behavioral identity across five pillars that connects you with the right mentors and employers."
        path="/register"
      />
      <div className="container max-w-md mx-auto pt-8 pb-16 px-4">
        <Card>
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto mb-2">
              <Logo variant="full" className="h-12 mx-auto" alt="XIMA" />
            </div>
            <CardTitle className="text-[28px] font-bold">{t('register.title')}</CardTitle>
            <CardDescription>
              {t('register.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('register.full_name')}</Label>
                <Input
                  id="name" name="name"
                  placeholder={t('register.name_placeholder')}
                  value={formData.name} onChange={handleChange}
                  className={`min-h-[48px] ${errors.name ? "ring-2 ring-destructive" : ""}`}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('register.email')}</Label>
                <Input
                  id="email" name="email" type="email"
                  placeholder={t('register.email_placeholder')}
                  value={formData.email} onChange={handleChange}
                  className={`min-h-[48px] ${errors.email ? "ring-2 ring-destructive" : ""}`}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('register.password')}</Label>
                <Input
                  id="password" name="password" type="password"
                  placeholder={t('register.password_placeholder')}
                  value={formData.password} onChange={handleChange}
                  className={`min-h-[48px] ${errors.password ? "ring-2 ring-destructive" : ""}`}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('register.confirm_password')}</Label>
                <Input
                  id="confirmPassword" name="confirmPassword" type="password"
                  placeholder={t('register.confirm_placeholder')}
                  value={formData.confirmPassword} onChange={handleChange}
                  className={`min-h-[48px] ${errors.confirmPassword ? "ring-2 ring-destructive" : ""}`}
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <ConsentCheckboxes
                privacyAccepted={privacyAccepted} termsAccepted={termsAccepted}
                onPrivacyChange={setPrivacyAccepted} onTermsChange={setTermsAccepted}
                showError={showConsentError} className="pt-2"
              />
              
              <Button type="submit" className="w-full min-h-[48px]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('register.creating_account')}
                  </>
                ) : (
                  t('register.create_account')
                )}
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[rgba(60,60,67,0.12)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('auth.or', 'or')}</span>
              </div>
            </div>
            
            <GoogleAuthButton mode="register" />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center w-full">
              {t('register.have_account')}{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/login')}>
                {t('register.log_in')}
              </Button>
            </p>
            <p className="text-center text-sm text-muted-foreground font-medium">
              Matching Quality in Jobs
            </p>
          </CardFooter>
        </Card>
      </div>
    </LandingLayout>
  );
};

export default Register;
