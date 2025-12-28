import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '../context/UserContext';

export const useAdminRole = () => {
  const { user, isAuthenticated } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!isAuthenticated || !user?.id) {
        console.log('Role check: Not authenticated or no user ID', { isAuthenticated, userId: user?.id });
        setIsAdmin(false);
        setIsOperator(false);
        setLoading(false);
        return;
      }

      try {
        console.log('Role check: Checking roles for user:', user.id);
        
        // Query user_roles table to check all roles for this user
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking roles:', error);
          setIsAdmin(false);
          setIsOperator(false);
        } else {
          const roles = data?.map(r => r.role) || [];
          console.log('Role check result:', { roles });
          setIsAdmin(roles.includes('admin'));
          setIsOperator(roles.includes('operator') || roles.includes('admin'));
        }
      } catch (error) {
        console.error('Error checking roles:', error);
        setIsAdmin(false);
        setIsOperator(false);
      } finally {
        setLoading(false);
      }
    };

    checkRoles();
  }, [isAuthenticated, user?.id]);

  return { isAdmin, isOperator, loading };
};
