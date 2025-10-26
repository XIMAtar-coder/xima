import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { KPICard } from '@/components/developer/KPICard';
import { UsersTable } from '@/components/developer/UsersTable';
import { UserProfileModal } from '@/components/developer/UserProfileModal';
import { Users, Activity, Target, TrendingUp, Award, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Developer = () => {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAdmin) return;

      try {
        setLoading(true);

        // Fetch stats using security definer function
        const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
        if (statsError) throw statsError;
        setStats(statsData);

        // Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, ximatar, created_at, profile_complete')
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin, toast]);

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'XIMAtar', 'Registration Date', 'Status'],
      ...users.map(u => [
        u.full_name || 'N/A',
        u.email || 'N/A',
        u.ximatar || 'Not assigned',
        new Date(u.created_at).toLocaleDateString(),
        u.profile_complete ? 'Complete' : 'Incomplete'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xima-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Users data has been exported to CSV'
    });
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null; // Will be redirected by useAdminAuth hook
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Welcome back, Pietro 👋</h1>
            <p className="text-muted-foreground mt-2">Here's what's happening with XIMA today</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={Users}
          />
          <KPICard
            title="Active This Week"
            value={stats?.active_users_week || 0}
            icon={Activity}
            description="New registrations"
          />
          <KPICard
            title="Assessments"
            value={stats?.total_assessments || 0}
            icon={Target}
            description="Completed"
          />
          <KPICard
            title="Avg XIMA Score"
            value={stats?.avg_score || 'N/A'}
            icon={TrendingUp}
          />
          <KPICard
            title="Top XIMAtar"
            value={stats?.most_common_ximatar || 'N/A'}
            icon={Award}
            description="Most common"
          />
        </div>

        {/* Users Table */}
        <UsersTable users={users} onViewUser={handleViewUser} />

        {/* Analytics Section */}
        <Card className="p-6">
          <h3 className="text-2xl font-bold mb-4">Analytics</h3>
          <div className="text-center py-12 text-muted-foreground">
            <p>Advanced analytics charts coming soon</p>
            <p className="text-sm mt-2">XIMAtar distribution, mentor analytics, and growth charts</p>
          </div>
        </Card>

        {/* User Profile Modal */}
        <UserProfileModal
          user={selectedUser}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedUser(null);
          }}
        />
      </div>
    </MainLayout>
  );
};

export default Developer;
