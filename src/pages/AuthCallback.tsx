import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';

const AuthCallback = () => {
  const navigate = useNavigate();

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
          // Successfully authenticated, redirect to profile
          navigate('/profile');
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
  }, [navigate]);

  return <LoadingScreen isLoading={true} />;
};

export default AuthCallback;
