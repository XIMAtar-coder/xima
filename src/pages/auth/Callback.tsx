import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Auth callback handler for:
 * - Email verification links
 * - OAuth provider redirects (Google, etc.)
 * 
 * After successful auth, redirects to stored destination or /profile
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (for OAuth) or let Supabase handle email verification
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setError(sessionError.message);
          return;
        }

        if (!session) {
          // Try to exchange code for session (for email verification)
          const code = searchParams.get('code');
          const type = searchParams.get('type');
          
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('[AuthCallback] Code exchange error:', exchangeError);
              setError(exchangeError.message);
              return;
            }
            
            // Show success message for email verification
            if (type === 'signup' || type === 'email') {
              toast({
                title: t('verify_email.verified_title'),
                description: t('verify_email.verified_description')
              });
            }
          }
        }

        // Wait a bit for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get redirect destination
        const redirectTo = sessionStorage.getItem('auth_redirect') || '/profile';
        sessionStorage.removeItem('auth_redirect');

        // Navigate to destination
        navigate(redirectTo, { replace: true });
        
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setError('An unexpected error occurred');
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast, t]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('common.error')}</h1>
          <p className="text-[#A3ABB5] mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-[#3A9FFF] text-white rounded-lg hover:bg-[#3A9FFF]/80 transition-colors"
          >
            {t('common.back')} {t('common.login')}
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen isLoading={true} />;
};

export default AuthCallback;
