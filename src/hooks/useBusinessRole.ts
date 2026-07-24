import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '../context/UserContext';
import { log } from '@/lib/log';

export const useBusinessRole = () => {
  const { user, isAuthenticated } = useUser();
  const [isBusiness, setIsBusiness] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkBusinessRole = async () => {
      // If authenticated but user.id not yet available, keep loading
      if (isAuthenticated && !user?.id) {
        log.debug('Business check: Authenticated but waiting for user.id');
        // Don't set loading to false, wait for user.id
        return;
      }

      // Not authenticated at all
      if (!isAuthenticated) {
        log.debug('Business check: Not authenticated');
        setIsBusiness(false);
        setLoading(false);
        hasChecked.current = true;
        return;
      }

      // Have user.id, proceed with check
      if (user?.id && !hasChecked.current) {
        hasChecked.current = true;
        try {
          log.debug('Business check: Checking role for user:', user.id);
          
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'business')
            .maybeSingle();

          if (error) {
            log.error('Error checking business role:', error);
            setIsBusiness(false);
          } else {
            log.debug('Business check result:', { data, isBusiness: !!data });
            setIsBusiness(!!data);
          }
        } catch (error) {
          log.error('Error checking business role:', error);
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
