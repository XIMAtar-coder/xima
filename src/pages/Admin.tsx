import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import XimaManager from '@/components/admin/XimaManager';
import { useUser } from '@/context/UserContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useToast } from '@/hooks/use-toast';

export default function Admin() {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const { isAdmin, loading } = useAdminRole();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (loading) return;
    if (!isAdmin) {
      toast({ title: 'Accesso negato', description: 'Non hai i privilegi necessari.', variant: 'destructive' });
      navigate('/profile');
    }
  }, [isAuthenticated, isAdmin, loading, navigate, toast]);

  if (loading || !isAdmin) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <XimaManager />
    </MainLayout>
  );
}
