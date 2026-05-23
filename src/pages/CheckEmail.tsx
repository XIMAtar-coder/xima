import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import LandingLayout from '@/components/landing/LandingLayout';
import { Mail, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const CheckEmail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const email = (location.state as { email?: string } | null)?.email || '';
  const [resending, setResending] = React.useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({
        title: t('check_email.resent_title', 'Email sent again'),
        description: t('check_email.resent_desc', 'Check your inbox in a few seconds.'),
      });
    } catch (e: any) {
      toast({
        title: t('check_email.resent_error', 'Could not resend'),
        description: e?.message || 'Try again later',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <LandingLayout>
      <div className="container max-w-xl mx-auto pt-10 pb-20 px-4">
        <Card className="overflow-hidden">
          <div
            className="px-6 py-8 text-center"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02))',
            }}
          >
            <div className="mx-auto mb-4">
              <Logo variant="full" className="h-12 mx-auto" alt="XIMA" />
            </div>
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-primary/10 mb-3">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-[26px] font-bold leading-tight text-foreground">
              {t('check_email.title', 'Confirm your email to enter XIMA')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                'check_email.philosophy',
                'XIMA is built on trust and authentic identity. Before you discover your potential, we need to verify it’s really you.',
              )}
            </p>
          </div>

          <CardContent className="pt-6 space-y-5">
            <div className="rounded-xl border border-border p-4 bg-muted/30">
              <p className="text-sm text-foreground">
                {t('check_email.sent_to', 'We sent a confirmation link to:')}
              </p>
              <p className="mt-1 font-semibold text-foreground break-all">{email || '—'}</p>
            </div>

            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  {t(
                    'check_email.point_secure',
                    'Click the link in the email to verify your account and unlock the dashboard.',
                  )}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  {t(
                    'check_email.point_window',
                    'The link is valid for 48 hours. After that, you’ll need to request a new one.',
                  )}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  {t(
                    'check_email.point_spam',
                    'Can’t find it? Check your spam or promotions folder.',
                  )}
                </span>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleResend}
                disabled={!email || resending}
              >
                {resending
                  ? t('check_email.resending', 'Resending…')
                  : t('check_email.resend', 'Resend email')}
              </Button>
              <Button className="flex-1" onClick={() => navigate('/login')}>
                {t('check_email.go_login', 'Go to login')}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              {t(
                'check_email.footer',
                'Matching Quality in Jobs — XIMA verifies every identity to protect candidates and companies.',
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </LandingLayout>
  );
};

export default CheckEmail;
