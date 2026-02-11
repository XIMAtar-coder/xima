import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { Mail, RefreshCw, LogOut, CheckCircle } from 'lucide-react';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const { session, signOut } = useUser();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!session?.user?.email) return;
    setResending(true);
    setError(null);
    setResent(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-[fade-in_0.4s_ease-out]">
        <Card className="border border-[#A3ABB5]/20 bg-[#0A0F1C]/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto mb-2">
              <Logo variant="full" className="h-12 mx-auto" alt="XIMA" />
            </div>
            <div className="mx-auto w-16 h-16 rounded-full bg-[#3A9FFF]/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#3A9FFF]" />
            </div>
            <CardTitle className="text-2xl font-bold text-white font-heading">
              {t('verify_email.title', 'Check your inbox')}
            </CardTitle>
            <CardDescription className="text-[#A3ABB5] text-base">
              {t('verify_email.description', 'We sent a verification link to your email address. Please click the link to activate your account.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session?.user?.email && (
              <div className="text-center">
                <p className="text-sm text-[#A3ABB5]">
                  {t('verify_email.sent_to', 'Sent to:')}
                </p>
                <p className="text-white font-medium">{session.user.email}</p>
              </div>
            )}

            <div className="bg-[#1A1F2E] rounded-lg p-4 space-y-2">
              <p className="text-sm text-[#A3ABB5]">
                {t('verify_email.instructions', 'You have 24 hours to verify your email. If you don\'t verify in time, your account will be suspended.')}
              </p>
              <p className="text-sm text-[#A3ABB5]">
                {t('verify_email.check_spam', 'Can\'t find the email? Check your spam folder.')}
              </p>
            </div>

            {resent && (
              <div className="flex items-center gap-2 text-green-400 text-sm justify-center">
                <CheckCircle className="w-4 h-4" />
                {t('verify_email.resent_success', 'Verification email resent!')}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <Button
              onClick={handleResend}
              disabled={resending}
              className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/80 text-white"
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('verify_email.resending', 'Resending...')}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('verify_email.resend_button', 'Resend verification email')}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-[#A3ABB5] hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('verify_email.logout', 'Sign out')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
