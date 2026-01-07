import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Mail, RefreshCw, LogOut, Edit3 } from 'lucide-react';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session, signOut } = useUser();
  const navigate = useNavigate();
  
  const [isResending, setIsResending] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const currentEmail = session?.user?.email || '';

  const handleResendEmail = async () => {
    if (!currentEmail) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          title: t('verify_email.resend_failed'),
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('verify_email.resend_success'),
          description: t('verify_email.check_inbox')
        });
      }
    } catch (error) {
      toast({
        title: t('verify_email.resend_failed'),
        description: t('common.error'),
        variant: 'destructive'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({
        title: t('register.email_invalid'),
        variant: 'destructive'
      });
      return;
    }

    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        toast({
          title: t('verify_email.change_failed'),
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('verify_email.email_updated'),
          description: t('verify_email.verification_sent_new')
        });
        setShowChangeEmail(false);
        setNewEmail('');
      }
    } catch (error) {
      toast({
        title: t('verify_email.change_failed'),
        description: t('common.error'),
        variant: 'destructive'
      });
    } finally {
      setIsChangingEmail(false);
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
              {t('verify_email.title')}
            </CardTitle>
            <CardDescription className="text-[#A3ABB5]">
              {t('verify_email.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Current email display */}
            <div className="bg-[#1A1F2E] rounded-lg p-4 text-center">
              <p className="text-sm text-[#A3ABB5] mb-1">{t('verify_email.sent_to')}</p>
              <p className="text-white font-medium">{currentEmail}</p>
            </div>

            {/* Change email form */}
            {showChangeEmail ? (
              <div className="space-y-3">
                <Label htmlFor="newEmail" className="text-white">
                  {t('verify_email.new_email')}
                </Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('verify_email.new_email_placeholder')}
                  className="bg-[#0A0F1C]/50 border-[#A3ABB5]/30 text-white placeholder:text-[#A3ABB5]/50"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-[#A3ABB5]/30 text-[#A3ABB5] hover:bg-[#1A1F2E]"
                    onClick={() => {
                      setShowChangeEmail(false);
                      setNewEmail('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    className="flex-1 bg-[#3A9FFF] hover:bg-[#3A9FFF]/80 text-white"
                    onClick={handleChangeEmail}
                    disabled={isChangingEmail || !newEmail.trim()}
                  >
                    {isChangingEmail ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {t('verify_email.update_email')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Resend verification email */}
                <Button
                  className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/80 text-white"
                  onClick={handleResendEmail}
                  disabled={isResending}
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {t('verify_email.resend_button')}
                </Button>

                {/* Change email */}
                <Button
                  variant="outline"
                  className="w-full border-[#A3ABB5]/30 text-[#A3ABB5] hover:bg-[#1A1F2E] hover:text-white"
                  onClick={() => setShowChangeEmail(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {t('verify_email.change_email_button')}
                </Button>

                {/* Logout */}
                <Button
                  variant="ghost"
                  className="w-full text-[#A3ABB5] hover:text-white hover:bg-[#1A1F2E]"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('verify_email.logout_button')}
                </Button>
              </div>
            )}

            {/* Help text */}
            <p className="text-center text-sm text-[#A3ABB5]">
              {t('verify_email.help_text')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
