import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '../context/UserContext';

export const useAdminRole = () => {
  const { user, isAuthenticated } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!isAuthenticated || !user?.id) {
        console.log('Admin check: Not authenticated or no user ID', { isAuthenticated, userId: user?.id });
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('Admin check: Checking role for user:', user.id);
        
        // Query user_roles table to check if user has admin role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          console.log('Admin check result:', { data, isAdmin: !!data });
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [isAuthenticated, user?.id]);

  return { isAdmin, loading };
};
