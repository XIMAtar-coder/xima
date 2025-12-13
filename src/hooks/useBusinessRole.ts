import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '../context/UserContext';

export const useBusinessRole = () => {
  const { user, isAuthenticated } = useUser();
  const [isBusiness, setIsBusiness] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkBusinessRole = async () => {
      // If authenticated but user.id not yet available, keep loading
      if (isAuthenticated && !user?.id) {
        console.log('Business check: Authenticated but waiting for user.id');
        // Don't set loading to false, wait for user.id
        return;
      }

      // Not authenticated at all
      if (!isAuthenticated) {
        console.log('Business check: Not authenticated');
        setIsBusiness(false);
        setLoading(false);
        hasChecked.current = true;
        return;
      }

      // Have user.id, proceed with check
      if (user?.id && !hasChecked.current) {
        hasChecked.current = true;
        try {
          console.log('Business check: Checking role for user:', user.id);
          
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
      }
    };

    checkBusinessRole();
  }, [isAuthenticated, user?.id]);

  // Reset check flag when user changes
  useEffect(() => {
    hasChecked.current = false;
    setLoading(true);
  }, [user?.id]);

  return { isBusiness, loading };
};
