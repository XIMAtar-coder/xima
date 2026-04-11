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
import { syncGuestAssessmentToProfile } from '@/utils/assessmentSync';
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
      if (newUserId) {
        const consentResult = await recordUserConsents(newUserId, i18n.language);
        if (!consentResult.success) {
          await supabase.auth.signOut();
          toast({ title: t('register.consent_error_title', 'Registration Error'), description: t('register.consent_error_desc', 'Failed to record your consent. Please try registering again.'), variant: "destructive" });
          return;
        }
        
        if (refCode) {
          try {
            await supabase.rpc('apply_referral_on_signup', { invite_code: refCode });
          } catch (refErr) { console.warn('[Register] Referral apply exception:', refErr); }
        }

        const syncSuccess = await syncGuestAssessmentToProfile(newUserId);
        
        // Auto-import CV from guest onboarding if available
        try {
          const pendingCvRaw = sessionStorage.getItem('xima_pending_cv');
          if (pendingCvRaw) {
            const pendingCv = JSON.parse(pendingCvRaw);
            // Convert base64 data URL back to File
            const res = await fetch(pendingCv.base64_data);
            const blob = await res.blob();
            const file = new File([blob], pendingCv.file_name, { type: pendingCv.file_type });
            
            const formData = new FormData();
            formData.append('file', file);

            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (accessToken) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              
              fetch(`${supabaseUrl}/functions/v1/analyze-cv`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': supabaseAnonKey,
                },
                body: formData,
              }).then(() => {
                console.log('✅ Pending CV auto-imported after registration');
              }).catch(e => {
                console.warn('[Register] CV auto-import failed (non-blocking):', e);
              });
            }
            sessionStorage.removeItem('xima_pending_cv');
          }
        } catch (e) {
          console.warn('[Register] CV auto-import error (non-blocking):', e);
        }

        toast({
          title: t('auth.register_success', 'Account created successfully'),
          description: syncSuccess ? t('register.assessment_synced', 'Your assessment data has been saved to your profile') : t('register.welcome_message'),
        });
      }

      navigate('/profile');
    } catch (error) {
      toast({ title: t('register.registration_failed'), description: t('register.try_again'), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #ffffff, #eeeef3 70%)' }}>
      <div className="w-full max-w-md animate-[fade-in_0.4s_ease-out]">
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
                  className={errors.name ? "ring-2 ring-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('register.email')}</Label>
                <Input
                  id="email" name="email" type="email"
                  placeholder={t('register.email_placeholder')}
                  value={formData.email} onChange={handleChange}
                  className={errors.email ? "ring-2 ring-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('register.password')}</Label>
                <Input
                  id="password" name="password" type="password"
                  placeholder={t('register.password_placeholder')}
                  value={formData.password} onChange={handleChange}
                  className={errors.password ? "ring-2 ring-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('register.confirm_password')}</Label>
                <Input
                  id="confirmPassword" name="confirmPassword" type="password"
                  placeholder={t('register.confirm_placeholder')}
                  value={formData.confirmPassword} onChange={handleChange}
                  className={errors.confirmPassword ? "ring-2 ring-destructive" : ""}
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <ConsentCheckboxes
                privacyAccepted={privacyAccepted} termsAccepted={termsAccepted}
                onPrivacyChange={setPrivacyAccepted} onTermsChange={setTermsAccepted}
                showError={showConsentError} className="pt-2"
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
    </div>
  );
};

export default Register;
