import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { ConsentCheckboxes } from '@/components/auth/ConsentCheckboxes';
import { recordUserConsents } from '@/hooks/useConsentRecording';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormData, string>>;

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated } = useUser();
  const { t, i18n } = useTranslation();
  const refCode = searchParams.get('ref') || '';

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCheckInbox, setShowCheckInbox] = useState(false);

  // Consent state
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && !showCheckInbox) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate, showCheckInbox]);

  const validateForm = () => {
    const newErrors: RegisterFormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('register.first_name_required', 'First name is required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('register.last_name_required', 'Last name is required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('register.email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('register.email_invalid');
    }

    if (!formData.password) {
      newErrors.password = t('register.password_required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('register.password_length');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('register.passwords_match');
    }

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
      // Sign up WITHOUT auto-signin — user must verify email first
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
          }
        }
      });

      if (error) {
        toast({
          title: t('register.registration_failed'),
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      const newUserId = data?.user?.id;

      if (newUserId) {
        // Record consent
        const consentResult = await recordUserConsents(newUserId, i18n.language);

        if (!consentResult.success) {
          console.error('[Register] Consent recording failed:', consentResult.error);
          toast({
            title: t('register.consent_error_title', 'Registration Error'),
            description: t('register.consent_error_desc', 'Failed to record your consent. Please try registering again.'),
            variant: "destructive"
          });
          return;
        }

        // Apply referral code if present
        if (refCode) {
          try {
            const { error: refError } = await supabase.rpc('apply_referral_on_signup', { invite_code: refCode });
            if (refError) console.warn('[Register] Referral apply failed:', refError);
          } catch (refErr) {
            console.warn('[Register] Referral apply exception:', refErr);
          }
        }
      }

      // Show "check your inbox" screen
      setShowCheckInbox(true);

    } catch (error) {
      toast({
        title: t('register.registration_failed'),
        description: t('register.try_again'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Check Inbox Screen ───
  if (showCheckInbox) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-[fade-in_0.4s_ease-out]">
          <Card className="border border-[#A3ABB5]/20 bg-[#0A0F1C]/80 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto mb-2">
                <Logo variant="full" className="h-12 mx-auto" alt="XIMA" />
              </div>
              <div className="mx-auto w-16 h-16 rounded-full bg-[#3A9FFF]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#3A9FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold text-white font-heading">
                {t('register.check_inbox_title', 'Check your inbox!')}
              </CardTitle>
              <CardDescription className="text-[#A3ABB5] text-base">
                {t('register.check_inbox_desc', 'We sent a verification link to')}
              </CardDescription>
              <p className="text-white font-medium">{formData.email}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#1A1F2E] rounded-lg p-4 space-y-2">
                <p className="text-sm text-[#A3ABB5]">
                  {t('register.check_inbox_instructions', 'Click the link in the email to activate your account. You have 24 hours to verify.')}
                </p>
                <p className="text-sm text-[#A3ABB5]">
                  {t('register.check_spam', 'Can\'t find the email? Check your spam folder.')}
                </p>
              </div>
              <Button
                className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/80 text-white"
                onClick={() => navigate('/login')}
              >
                {t('register.go_to_login', 'Go to Login')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Registration Form ───
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-[fade-in_0.4s_ease-out]">
        <Card className="border border-[#A3ABB5]/20 bg-[#0A0F1C]/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto mb-2">
              <Logo variant="full" className="h-12 mx-auto" alt="XIMA" />
            </div>
            <CardTitle className="text-2xl font-bold text-white font-heading">{t('register.title')}</CardTitle>
            <CardDescription className="text-[#A3ABB5]">
              {t('register.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-white">{t('register.first_name', 'First Name')}</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder={t('register.first_name_placeholder', 'John')}
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`bg-[#0A0F1C]/50 border-[#A3ABB5]/30 text-white placeholder:text-[#A3ABB5]/50 ${errors.firstName ? "border-red-500" : ""}`}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-white">{t('register.last_name', 'Last Name')}</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder={t('register.last_name_placeholder', 'Doe')}
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`bg-[#0A0F1C]/50 border-[#A3ABB5]/30 text-white placeholder:text-[#A3ABB5]/50 ${errors.lastName ? "border-red-500" : ""}`}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">{t('register.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('register.email_placeholder')}
                  value={formData.email}
                  onChange={handleChange}
                  className={`bg-[#0A0F1C]/50 border-[#A3ABB5]/30 text-white placeholder:text-[#A3ABB5]/50 ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">{t('register.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('register.password_placeholder')}
                  value={formData.password}
                  onChange={handleChange}
                  className={`bg-[#0A0F1C]/50 border-[#A3ABB5]/30 text-white placeholder:text-[#A3ABB5]/50 ${errors.password ? "border-red-500" : ""}`}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">{t('register.confirm_password')}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t('register.confirm_placeholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`bg-[#0A0F1C]/50 border-[#A3ABB5]/30 text-white placeholder:text-[#A3ABB5]/50 ${errors.confirmPassword ? "border-red-500" : ""}`}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Consent Checkboxes */}
              <ConsentCheckboxes
                privacyAccepted={privacyAccepted}
                termsAccepted={termsAccepted}
                onPrivacyChange={setPrivacyAccepted}
                onTermsChange={setTermsAccepted}
                showError={showConsentError}
                className="pt-2"
              />

              <Button
                type="submit"
                className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/80 hover:shadow-[0_0_20px_rgba(58,159,255,0.5)] transition-all duration-300 text-white font-medium"
                disabled={isSubmitting}
              >
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
                <span className="w-full border-t border-[#A3ABB5]/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0A0F1C] px-2 text-[#A3ABB5]">{t('auth.or', 'or')}</span>
              </div>
            </div>

            <GoogleAuthButton mode="register" />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-[#A3ABB5] text-center w-full">
              {t('register.have_account')}{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-[#3A9FFF] hover:text-[#3A9FFF]/80"
                onClick={() => navigate('/login')}
              >
                {t('register.log_in')}
              </Button>
            </p>
            <p className="text-center text-sm text-[#A3ABB5] font-medium">
              Matching Quality in Jobs
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
