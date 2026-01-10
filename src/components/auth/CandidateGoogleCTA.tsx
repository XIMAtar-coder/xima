import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';

interface CandidateGoogleCTAProps {
  redirectTo?: string;
  className?: string;
}

export const CandidateGoogleCTA = ({ redirectTo, className = '' }: CandidateGoogleCTAProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoogleAuth = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Store intended redirect in sessionStorage as fallback
      const targetRedirect = redirectTo || window.location.pathname;
      sessionStorage.setItem('xima.postAuthRedirect', targetRedirect);
      
      // Build the redirect URL with query param
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set('redirectTo', targetRedirect);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        toast({
          title: t('auth.auth_failed', 'Authentication Failed'),
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      }
      // Don't reset loading - we're redirecting
    } catch (err) {
      console.error('Google auth error:', err);
      toast({
        title: t('auth.auth_failed', 'Authentication Failed'),
        description: t('common.something_went_wrong', 'Something went wrong. Please try again.'),
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleEmailAuth = () => {
    // Store intended redirect for after registration
    const targetRedirect = redirectTo || window.location.pathname;
    sessionStorage.setItem('xima.postAuthRedirect', targetRedirect);
    navigate(`/register?redirectTo=${encodeURIComponent(targetRedirect)}`);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Explanation text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t('auth.save_results_message', 'Save your results to continue')}
        </p>
      </div>

      {/* Google CTA - Primary */}
      <Button
        type="button"
        size="lg"
        className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-medium flex items-center justify-center gap-3"
        onClick={handleGoogleAuth}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-800 border-t-transparent" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span>{t('auth.continue_with_google', 'Continue with Google')}</span>
      </Button>

      {/* Email alternative - Secondary */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={handleEmailAuth}
        disabled={isLoading}
      >
        <Mail className="h-4 w-4 mr-2" />
        <span>{t('auth.continue_with_email', 'Continue with email')}</span>
      </Button>
    </div>
  );
};
