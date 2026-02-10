import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';

/** Routes that unverified users can still access */
const ALLOWED_ROUTES = [
  '/verify-email',
  '/settings',
  '/privacy',
  '/terms',
  '/imprint',
  '/auth/callback',
];

interface VerificationGateProps {
  children: React.ReactNode;
}

export const VerificationGate: React.FC<VerificationGateProps> = ({ children }) => {
  const { session } = useUser();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'verified' | 'unverified'>('loading');

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (!session?.user) {
        if (mounted) setStatus('verified'); // not logged in, let normal routing handle it
        return;
      }

      // First check auth.users email_confirmed_at via getUser
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email_confirmed_at) {
        if (mounted) setStatus('unverified');
        return;
      }

      // Email is confirmed — make sure profile is updated
      try {
        await supabase.rpc('confirm_email_verification');
      } catch {
        // non-critical
      }

      // Check profile account_status
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.account_status === 'suspended') {
        if (mounted) setStatus('unverified');
        return;
      }

      if (mounted) setStatus('verified');
    };

    check();
    return () => { mounted = false; };
  }, [session]);

  if (status === 'loading') return null;

  if (status === 'unverified') {
    const isAllowed = ALLOWED_ROUTES.some(r => location.pathname.startsWith(r));
    if (!isAllowed) {
      return <Navigate to="/verify-email" replace />;
    }
  }

  return <>{children}</>;
};
