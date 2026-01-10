import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login');
          return;
        }

        if (data.session) {
          // Successfully authenticated
          // Check for redirectTo in query params first, then sessionStorage fallback
          const redirectTo = searchParams.get('redirectTo');
          const sessionRedirect = sessionStorage.getItem('xima.postAuthRedirect');
          
          // Clear the sessionStorage redirect after reading
          if (sessionRedirect) {
            sessionStorage.removeItem('xima.postAuthRedirect');
          }
          
          // Determine final redirect destination
          const finalRedirect = redirectTo || sessionRedirect || '/profile';
          
          console.log('[AuthCallback] Redirecting to:', finalRedirect);
          navigate(finalRedirect);
        } else {
          // No session, redirect to login
          navigate('/login');
        }
      } catch (err) {
        console.error('Auth callback exception:', err);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return <LoadingScreen isLoading={true} />;
};

export default AuthCallback;
