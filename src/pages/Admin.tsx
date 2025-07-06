import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '../context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, Calendar, BarChart3, Settings, Shield } from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAssessments: 0,
    totalAppointments: 0,
    activeMentors: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is admin (you can register with admin@xima.com to get access)
    if (user?.email?.toLowerCase() !== 'admin@xima.com') {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges. Please register with admin@xima.com',
        variant: 'destructive'
      });
      navigate('/profile');
      return;
    }

    loadStats();
  }, [isAuthenticated, user, navigate, toast]);

  const loadStats = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total assessments count
      const { count: assessmentsCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });

      // Get total appointments count
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // Get active mentors count
      const { count: mentorsCount } = await supabase
        .from('mentors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        totalUsers: usersCount || 0,
        totalAssessments: assessmentsCount || 0,
        totalAppointments: appointmentsCount || 0,
        activeMentors: mentorsCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4171d6]"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <Users size={24} />,
      color: 'text-blue-600'
    },
    {
      title: 'Assessments Completed',
      value: stats.totalAssessments,
      icon: <FileText size={24} />,
      color: 'text-green-600'
    },
    {
      title: 'Appointments Scheduled',
      value: stats.totalAppointments,
      icon: <Calendar size={24} />,
      color: 'text-purple-600'
    },
    {
      title: 'Active Mentors',
      value: stats.activeMentors,
      icon: <BarChart3 size={24} />,
      color: 'text-orange-600'
    }
  ];

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-[#4171d6]" size={32} />
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Welcome, {user?.name}! Manage your XIMA platform from here.
          </p>
          <Badge className="mt-2 bg-[#4171d6]">Administrator Access</Badge>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage user accounts and profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Button 
                className="w-full bg-[#4171d6] hover:bg-[#2950a3]"
                onClick={() => toast({ title: 'Feature Coming Soon', description: 'User management interface will be available soon' })}
              >
                Manage Users
              </Button>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Assessment Analytics
              </CardTitle>
              <CardDescription>
                View assessment results and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Button 
                className="w-full bg-[#4171d6] hover:bg-[#2950a3]"
                onClick={() => toast({ title: 'Feature Coming Soon', description: 'Assessment analytics will be available soon' })}
              >
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} />
                Platform Settings
              </CardTitle>
              <CardDescription>
                Configure platform settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Button 
                className="w-full bg-[#4171d6] hover:bg-[#2950a3]"
                onClick={() => toast({ title: 'Feature Coming Soon', description: 'Platform settings will be available soon' })}
              >
                Configure Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="mt-8 p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health and status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium">All Systems Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Admin;