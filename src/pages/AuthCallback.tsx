import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { syncGuestAssessmentToProfile } from '@/utils/assessmentSync';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'syncing' | 'error'>('loading');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get hash params from URL (OAuth providers return tokens in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        // Also check for code-based OAuth flow (used by some providers)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Handle OAuth error
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          navigate('/login', { replace: true });
          return;
        }

        let session = null;

        // If we have tokens in hash, set the session
        if (accessToken && refreshToken) {
          console.log('Setting session from OAuth tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            navigate('/login', { replace: true });
            return;
          }
          session = data.session;
        } 
        // If we have a code, exchange it for a session
        else if (code) {
          console.log('Exchanging OAuth code for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            navigate('/login', { replace: true });
            return;
          }
          session = data.session;
        }
        // Otherwise, try to get existing session
        else {
          console.log('Getting existing session');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
            navigate('/login', { replace: true });
            return;
          }
          session = data.session;
        }

        if (session?.user) {
          console.log('Session established for user:', session.user.id);
          setStatus('syncing');
          
          // Sync any guest assessment data to the new user's profile
          try {
            const synced = await syncGuestAssessmentToProfile(session.user.id);
            if (synced) {
              console.log('✅ Guest assessment data synced successfully');
            }
          } catch (syncError) {
            console.warn('Assessment sync warning (non-blocking):', syncError);
          }

          // Navigate to profile/dashboard
          navigate('/profile', { replace: true });
        } else {
          console.log('No session found after OAuth callback');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback exception:', err);
        setStatus('error');
        // Wait a moment before redirecting on error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <LoadingScreen 
      isLoading={true} 
    />
  );
};

export default AuthCallback;
