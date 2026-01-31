import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { getPostLoginRedirectPath } from '@/hooks/usePostLoginRedirect';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, isAuthenticated } = useUser();
  const { t } = useTranslation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  React.useEffect(() => {
    const handleAuthRedirect = async () => {
      if (isAuthenticated) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const redirectPath = await getPostLoginRedirectPath(user.id);
          navigate(redirectPath);
        } else {
          navigate('/profile');
        }
      }
    };
    handleAuthRedirect();
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t('login.invalid_credentials'),
        description: t('login.enter_both'),
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: t('login.login_failed'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('login.login_success'),
          description: t('login.welcome_back')
        });
        
        // Get user and determine redirect based on role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const redirectPath = await getPostLoginRedirectPath(user.id);
          navigate(redirectPath);
        } else {
          navigate('/profile');
        }
      }
    } catch (error) {
      toast({
        title: t('login.login_failed'),
        description: t('login.invalid_credentials'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="container max-w-md mx-auto pt-8 pb-16">
        <Card className="border-0 shadow-2xl bg-[#0A0F1C] text-white">
          <CardHeader className="space-y-6 text-center">
            <div className="flex justify-center">
              <img 
                src="/src/assets/logo_full.png" 
                alt="XIMA Logo" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold font-heading">{t('login.title')}</CardTitle>
            <CardDescription className="text-[#A3ABB5]">
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#A3ABB5]">{t('login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#1A1F2E] border-[#2A2F3E] text-white focus:border-[#3A9FFF] focus:ring-[#3A9FFF]"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#A3ABB5]">{t('login.password')}</Label>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-[#3A9FFF] hover:text-[#5AB4FF]"
                  >
                    {t('login.forgot_password')}
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#1A1F2E] border-[#2A2F3E] text-white focus:border-[#3A9FFF] focus:ring-[#3A9FFF]"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#3A9FFF] hover:bg-[#2A8FEF] text-white font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('login.logging_in')}
                  </>
                ) : (
                  t('login.login_button')
                )}
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#2A2F3E]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0A0F1C] px-2 text-[#A3ABB5]">{t('auth.or', 'or')}</span>
              </div>
            </div>
            
            <GoogleAuthButton mode="login" />
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-[#A3ABB5]">
              {t('login.no_account')}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-[#3A9FFF] hover:text-[#5AB4FF] hover:shadow-[0_0_15px_rgba(58,159,255,0.5)] transition-all duration-300"
                onClick={() => navigate('/register')}
              >
                {t('login.sign_up')}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Login;