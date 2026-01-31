import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Mail, Lock } from 'lucide-react';
import { useUser } from '@/context/UserContext';

const MentorLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAuthenticated } = useUser();
  const [loading, setLoading] = useState(false);
  const [checkingMentor, setCheckingMentor] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Check if already authenticated mentor
  useEffect(() => {
    const checkMentorStatus = async () => {
      if (isAuthenticated) {
        setCheckingMentor(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: mentorData } = await supabase
              .from('mentors')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (mentorData) {
              navigate('/mentor');
            }
          }
        } catch (error) {
          console.error('Error checking mentor status:', error);
        } finally {
          setCheckingMentor(false);
        }
      }
    };
    checkMentorStatus();
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      // Check if user is a mentor
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!mentorData) {
        // Not a mentor - sign out and show error
        await supabase.auth.signOut();
        toast({
          title: t('mentor.login_not_mentor_title', 'Access Denied'),
          description: t('mentor.login_not_mentor_desc', 'This account is not registered as a mentor.'),
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: t('mentor.login_success_title', 'Welcome back!'),
        description: t('mentor.login_success_desc', 'Successfully logged in to the Mentor Portal'),
      });

      navigate('/mentor');
    } catch (error: any) {
      console.error('Mentor login error:', error);
      toast({
        title: t('login.login_failed', 'Login Failed'),
        description: error.message || t('login.invalid_credentials', 'Invalid email or password'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: t('mentor.forgot_password_email_required_title', 'Email Required'),
        description: t('mentor.forgot_password_email_required_desc', 'Please enter your email address first'),
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/callback`
      });

      if (error) throw error;

      toast({
        title: t('mentor.forgot_password_sent_title', 'Reset Email Sent'),
        description: t('mentor.forgot_password_sent_desc', 'Check your email for the password reset link'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (checkingMentor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <GraduationCap className="text-primary" size={32} />
          </div>
          <CardTitle className="text-3xl font-bold">
            {t('mentor.login_title', 'Mentor Login')}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {t('mentor.login_description', 'Welcome to the XIMA Mentor Portal. Access your profile, manage your availability, and connect with candidates seeking guidance on their professional journey.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email', 'Email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('mentor.email_placeholder', 'mentor@example.com')}
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('login.password', 'Password')}</Label>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-xs text-primary hover:text-primary/80"
                  onClick={handleForgotPassword}
                >
                  {t('login.forgot_password', 'Forgot password?')}
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('login.logging_in', 'Signing in...') : t('login.login_button', 'Sign In')}
            </Button>
          </form>

          <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              {t('mentor.login_help_text', "If you are a mentor and don't have access yet, please contact support.")}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center text-sm">
          <div>
            <span className="text-muted-foreground">{t('mentor.not_a_mentor', 'Not a mentor?')} </span>
            <Link to="/login" className="text-primary hover:underline">
              {t('mentor.go_to_candidate_login', 'Go to Candidate login')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MentorLogin;
