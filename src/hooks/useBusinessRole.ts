import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '../context/UserContext';

export const useBusinessRole = () => {
  const { user, isAuthenticated } = useUser();
  const [isBusiness, setIsBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBusinessRole = async () => {
      if (!isAuthenticated || !user?.id) {
        console.log('Business check: Not authenticated or no user ID', { isAuthenticated, userId: user?.id });
        setIsBusiness(false);
        setLoading(false);
        return;
      }

      try {
        console.log('Business check: Checking role for user:', user.id);
        
        // Query user_roles table to check if user has business role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'business')
          .maybeSingle();

        if (error) {
          console.error('Error checking business role:', error);
          setIsBusiness(false);
        } else {
          console.log('Business check result:', { data, isBusiness: !!data });
          setIsBusiness(!!data);
        }
      } catch (error) {
        console.error('Error checking business role:', error);
        setIsBusiness(false);
      } finally {
        setLoading(false);
      }
    };

    checkBusinessRole();
  }, [isAuthenticated, user?.id]);

  return { isBusiness, loading };
};
