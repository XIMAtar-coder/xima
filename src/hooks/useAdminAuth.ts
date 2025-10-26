import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export const useAdminAuth = () => {
  const { user, session, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || !user) {
        navigate('/');
        return;
      }

      try {
        // Check if user has admin role using security definer function
        const authId = session?.user?.id || user?.id;
        if (!authId) {
          navigate('/');
          return;
        }

        const { data, error } = await supabase.rpc('has_role', {
          _user_id: authId,
          _role: 'admin'
        });

        if (error) throw error;

        if (!data) {
          // User is not admin, redirect to home
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, isAuthenticated, navigate]);

  return { isAdmin, loading };
};
