import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LandingLayout from '@/components/landing/LandingLayout';
import Seo from '@/components/Seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { log } from '@/lib/log';

// Matches Register.tsx (and Supabase's default) so the two screens agree.
const MIN_PASSWORD_LENGTH = 6;

/**
 * Landing page for the password-recovery link.
 *
 * Supabase returns the user here with a recovery session already established
 * (PKCE code exchange happens in the client on load). We wait for either the
 * PASSWORD_RECOVERY event or an existing session, then let them set a new
 * password with auth.updateUser. No session after a short wait means the link
 * is expired or was already used.
 */
const ResetPassword = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || settled) return;
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))) {
        settled = true;
        setReady('ok');
      }
    });

    // The event may have fired before this effect subscribed.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || settled) return;
      if (session) { settled = true; setReady('ok'); }
    });

    // Give the code exchange a moment; then treat "still no session" as an
    // invalid or expired link rather than leaving a spinner forever.
    const timer = window.setTimeout(() => {
      if (mounted && !settled) { settled = true; setReady('invalid'); }
    }, 6000);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: t('resetPassword.too_short', { n: MIN_PASSWORD_LENGTH }), variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: t('resetPassword.mismatch'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t('resetPassword.success') });
      navigate('/profile', { replace: true });
    } catch (err) {
      log.error('[ResetPassword] updateUser failed', err);
      toast({ title: t('resetPassword.failed'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LandingLayout>
      <Seo title={t('resetPassword.title')} description={t('resetPassword.subtitle')} path="/reset-password" noindex />
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4"><Logo /></div>
            <CardTitle>{t('resetPassword.title')}</CardTitle>
            <CardDescription>
              {ready === 'invalid' ? t('resetPassword.invalid_link') : t('resetPassword.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready === 'checking' && (
              <p className="text-sm text-muted-foreground text-center" role="status">{t('common.loading')}</p>
            )}
            {ready === 'invalid' && (
              <Button className="w-full" onClick={() => navigate('/login')}>
                {t('resetPassword.back_to_login')}
              </Button>
            )}
            {ready === 'ok' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('resetPassword.new_password')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('resetPassword.confirm_password')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t('resetPassword.saving') : t('resetPassword.submit')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </LandingLayout>
  );
};

export default ResetPassword;
