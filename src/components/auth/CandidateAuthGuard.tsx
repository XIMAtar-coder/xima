import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { LoadingScreen } from '@/components/LoadingScreen';

interface CandidateAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Auth guard for candidate-protected routes.
 * Checks:
 * 1. User is authenticated
 * 2. Email is verified (email_confirmed_at or confirmed_at)
 * 
 * If not authenticated -> redirect to /login
 * If not verified -> redirect to /candidate/verify-email
 */
export const CandidateAuthGuard = ({ children }: CandidateAuthGuardProps) => {
  const { session, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // Not authenticated at all
      if (!isAuthenticated || !session?.user) {
        // Store intended destination for post-login redirect
        sessionStorage.setItem('auth_redirect', location.pathname + location.search);
        navigate('/login', { replace: true });
        return;
      }

      // Check email verification
      const user = session.user;
      const isVerified = user.email_confirmed_at || user.confirmed_at;

      if (!isVerified) {
        // Store intended destination for post-verification redirect
        sessionStorage.setItem('auth_redirect', location.pathname + location.search);
        navigate('/candidate/verify-email', { replace: true });
        return;
      }

      // User is authenticated and verified
      setIsChecking(false);
    };

    // Small delay to ensure session is loaded
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, session, navigate, location]);

  if (isChecking) {
    return <LoadingScreen isLoading={true} />;
  }

  return <>{children}</>;
};
