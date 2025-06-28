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

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUser, isAuthenticated } = useUser();
  const { t } = useTranslation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll create a mock user
      setUser({
        id: '1',
        name: 'Demo User',
        email: email,
        profileComplete: true,
        pillars: {
          computational: 5,
          communication: 6,
          knowledge: 7,
          creativity: 8,
          drive: 9
        },
        avatar: {
          animal: 'Fox',
          image: '/placeholder.svg',
          features: [
            { name: 'Adaptability', description: 'Quick to learn and adjust to new environments', strength: 8 },
            { name: 'Focus', description: 'Maintains concentration on tasks', strength: 6 },
            { name: 'Creativity', description: 'Finds unique solutions to problems', strength: 7 }
          ]
        }
      });
      
      toast({
        title: t('login.login_success'),
        description: t('login.welcome_back')
      });
      
      navigate('/profile');
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
      <div className="container max-w-md mx-auto pt-8">
        <Card className="border-0 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-800">{t('login.title')}</CardTitle>
            <CardDescription className="text-center">
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
                  className="border-gray-200 focus:border-[#4171d6] focus:ring-[#4171d6]"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-[#4171d6] hover:text-[#2950a3]"
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
                  className="border-gray-200 focus:border-[#4171d6] focus:ring-[#4171d6]"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#4171d6] hover:bg-[#2950a3]"
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
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              {t('login.no_account')}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-[#4171d6] hover:text-[#2950a3]"
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
