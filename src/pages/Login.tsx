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
      <div className="container max-w-md mx-auto pt-8 pb-16 px-4">
        <Card>
          <CardHeader className="space-y-6 text-center">
            <div className="flex justify-center">
              <img 
                src="/src/assets/logo_full.png" 
                alt="XIMA Logo" 
                className="h-12 w-auto dark:brightness-200"
              />
            </div>
            <CardTitle className="text-[28px] font-bold">{t('login.title')}</CardTitle>
            <CardDescription>
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[48px]"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs"
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
                  className="min-h-[48px]"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
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
                <span className="w-full border-t border-[rgba(60,60,67,0.12)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('auth.or', 'or')}</span>
              </div>
            </div>
            
            <GoogleAuthButton mode="login" />
          </CardContent>
        <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {t('login.no_account')}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => navigate('/register')}
              >
                {t('login.sign_up')}
              </Button>
            </p>
            <p className="text-sm text-muted-foreground">
              {t('login.are_you_mentor', 'Are you a mentor?')}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => navigate('/mentor/login')}
              >
                {t('login.mentor_login_link', 'Login here')}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Login;
