import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { syncGuestAssessmentToProfile } from '@/utils/assessmentSync';
import { getPostLoginRedirectPath } from '@/hooks/usePostLoginRedirect';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleAuthCallback = async () => {
      console.log('AuthCallback: Starting OAuth callback handling');
      console.log('AuthCallback: Current URL:', window.location.href);

      // Check for error in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const errorParam = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

      if (errorParam) {
        console.error('OAuth error from provider:', errorParam, errorDescription);
        if (isMounted) {
          navigate('/login', { replace: true });
        }
        return;
      }

      // For PKCE flow, Supabase automatically handles the code exchange
      // We just need to listen for the session to be established
      // Set up a listener for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('AuthCallback: Auth state changed:', event, session?.user?.id);
          
          if (!isMounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
            console.log('AuthCallback: User signed in via OAuth:', session.user.email);
            
            // Sync any guest assessment data to the new user's profile
            // This also assigns the pre-selected mentor from localStorage claim
            try {
              const synced = await syncGuestAssessmentToProfile(session.user.id);
              if (synced) {
                console.log('✅ Guest assessment data synced successfully');
              }
            } catch (syncError) {
              console.warn('Assessment sync warning (non-blocking):', syncError);
            }

            // Determine redirect based on user role
            if (isMounted) {
              setIsProcessing(false);
              const redirectPath = await getPostLoginRedirectPath(session.user.id);
              navigate(redirectPath, { replace: true });
            }
          }
        }
      );

      // Also check if session already exists (in case the auth event already fired)
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthCallback: Error getting session:', error);
        }

        if (session?.user && isMounted) {
          console.log('AuthCallback: Existing session found for:', session.user.email);
          
          // Sync any guest assessment data
          try {
            const synced = await syncGuestAssessmentToProfile(session.user.id);
            if (synced) {
              console.log('✅ Guest assessment data synced successfully');
            }
          } catch (syncError) {
            console.warn('Assessment sync warning (non-blocking):', syncError);
          }

          setIsProcessing(false);
          const redirectPath = await getPostLoginRedirectPath(session.user.id);
          navigate(redirectPath, { replace: true });
          return;
        }
      } catch (err) {
        console.error('AuthCallback: Exception checking session:', err);
      }

      // Set a timeout to redirect to login if nothing happens after 10 seconds
      timeoutId = setTimeout(() => {
        if (isMounted && isProcessing) {
          console.log('AuthCallback: Timeout - no session established');
          navigate('/login', { replace: true });
        }
      }, 10000);

      // Cleanup subscription when done
      return () => {
        subscription.unsubscribe();
      };
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate, isProcessing]);

  return <LoadingScreen isLoading={true} />;
};

export default AuthCallback;
