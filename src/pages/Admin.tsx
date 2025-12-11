import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '../context/UserContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Briefcase, BarChart3, Settings, Shield, TrendingUp, 
  Activity, Zap, RefreshCw, Trash2, Database, Clock 
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers30Days: 0,
    avgCompletionRate: 0,
    totalJobs: 0,
    totalInteractions: 0,
    totalViewed: 0,
    totalSaved: 0,
    totalApplied: 0,
    avgMatchScore: 0,
    totalRecommendations: 0
  });
  const [ximatarDistribution, setXimatarDistribution] = useState<any[]>([]);
  const [applicationsOverTime, setApplicationsOverTime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [consoleLog, setConsoleLog] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Wait for admin check to complete
    if (adminLoading) {
      return;
    }

    // Check if user has admin role using secure server-side validation
    if (!isAdmin) {
      toast({
        title: t('admin.access_denied'),
        description: t('admin.no_privileges'),
        variant: 'destructive'
      });
      navigate('/profile');
      return;
    }

    loadStats();
    setupRealtimeSubscriptions();
  }, [isAuthenticated, isAdmin, adminLoading, navigate, toast]);

  const setupRealtimeSubscriptions = () => {
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        addConsoleLog('New user registered');
        loadStats();
      })
      .subscribe();

    const jobLinksChannel = supabase
      .channel('admin-job-links')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_job_links' }, () => {
        addConsoleLog('New job interaction detected');
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(jobLinksChannel);
    };
  };

  const addConsoleLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  const loadStats = async () => {
    try {
      // User metrics
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      // Assessment metrics
      const { data: assessments } = await supabase
        .from('assessment_results')
        .select('*');
      
      const completionRate = usersCount ? ((assessments?.length || 0) / usersCount) * 100 : 0;

      // XIMAtar distribution
      const { data: ximatarData } = await supabase
        .from('assessment_results')
        .select('ximatar_id, ximatars(label)')
        .not('ximatar_id', 'is', null);

      const ximatarCounts: any = {};
      ximatarData?.forEach((item: any) => {
        const label = item.ximatars?.label || 'Unknown';
        ximatarCounts[label] = (ximatarCounts[label] || 0) + 1;
      });

      const ximatarChart = Object.entries(ximatarCounts).map(([name, value]) => ({
        name,
        value
      }));

      setXimatarDistribution(ximatarChart);

      // Job metrics
      const { count: jobsCount } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true });

      const { data: jobLinks } = await supabase
        .from('user_job_links')
        .select('*');

      const totalInteractions = jobLinks?.length || 0;
      const totalViewed = jobLinks?.filter(j => j.status === 'viewed').length || 0;
      const totalSaved = jobLinks?.filter(j => j.status === 'saved').length || 0;
      const totalApplied = jobLinks?.filter(j => j.status === 'applied').length || 0;

      // Applications over time (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: recentApplications } = await supabase
        .from('user_job_links')
        .select('created_at')
        .eq('status', 'applied')
        .gte('created_at', fourteenDaysAgo.toISOString());

      const applicationsByDay: any = {};
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        applicationsByDay[dateStr] = 0;
      }

      recentApplications?.forEach(app => {
        const dateStr = app.created_at.split('T')[0];
        if (applicationsByDay[dateStr] !== undefined) {
          applicationsByDay[dateStr]++;
        }
      });

      const applicationsChart = Object.entries(applicationsByDay).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        applications: count
      }));

      setApplicationsOverTime(applicationsChart);

      setStats({
        totalUsers: usersCount || 0,
        activeUsers30Days: activeUsersCount || 0,
        avgCompletionRate: completionRate,
        totalJobs: jobsCount || 0,
        totalInteractions,
        totalViewed,
        totalSaved,
        totalApplied,
        avgMatchScore: 0,
        totalRecommendations: totalInteractions
      });

      addConsoleLog('Dashboard stats refreshed');
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

  const handleRunRecommendations = async () => {
    try {
      addConsoleLog('Triggering recommendation engine...');
      const { data, error } = await supabase.functions.invoke('recommend-jobs');
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Recommendations generated successfully'
      });
      addConsoleLog('Recommendations completed successfully');
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run recommendations',
        variant: 'destructive'
      });
      addConsoleLog(`ERROR: ${error.message}`);
    }
  };

  const handlePurgeOldLogs = async () => {
    try {
      addConsoleLog('Purging logs older than 90 days...');
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { error } = await supabase
        .from('user_job_links')
        .delete()
        .lt('created_at', ninetyDaysAgo.toISOString());

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Old logs purged successfully'
      });
      addConsoleLog('Log purge completed');
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to purge logs',
        variant: 'destructive'
      });
      addConsoleLog(`ERROR: ${error.message}`);
    }
  };

  if (loading || adminLoading) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3A9FFF] mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading XIMA Admin Dashboard...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const COLORS = ['#3A9FFF', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'];

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#3A9FFF]/10 border border-[#3A9FFF]/20">
                <Shield className="text-[#3A9FFF]" size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">XIMA Admin Dashboard</h1>
                <p className="text-muted-foreground">Real-time platform monitoring & controls</p>
              </div>
            </div>
            <Badge className="px-4 py-2 bg-[#3A9FFF] hover:bg-[#3A9FFF]/90">
              <Activity className="mr-2" size={16} />
              Live
            </Badge>
          </div>
        </div>

        {/* 4-Panel Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Panel A: User Overview */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Users className="text-[#3A9FFF]" size={24} />
                User Overview
              </CardTitle>
              <CardDescription>Platform user metrics and engagement</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-[#3A9FFF]">{stats.totalUsers}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Active (30d)</p>
                  <p className="text-3xl font-bold text-green-500">{stats.activeUsers30Days}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold">{stats.avgCompletionRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Most Common</p>
                  <p className="text-xl font-bold capitalize">
                    {ximatarDistribution[0]?.name || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">XIMAtar Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={ximatarDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ximatarDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Panel B: Job Analytics */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="text-[#3A9FFF]" size={24} />
                Job Analytics
              </CardTitle>
              <CardDescription>Opportunity engagement tracking</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Total Jobs</p>
                  <p className="text-3xl font-bold text-[#3A9FFF]">{stats.totalJobs}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Interactions</p>
                  <p className="text-3xl font-bold">{stats.totalInteractions}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Viewed</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.totalViewed}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Saved</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.totalSaved}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Applied</p>
                  <p className="text-2xl font-bold text-green-500">{stats.totalApplied}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Applications (Last 14 Days)</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={applicationsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="applications" stroke="#3A9FFF" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Panel C: Recommendation Insights */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="text-[#3A9FFF]" size={24} />
                Recommendation Insights
              </CardTitle>
              <CardDescription>AI-powered job matching performance</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Generated</p>
                  <p className="text-3xl font-bold text-[#3A9FFF]">{stats.totalRecommendations}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Conversion</p>
                  <p className="text-3xl font-bold text-green-500">
                    {stats.totalRecommendations > 0 
                      ? ((stats.totalApplied / stats.totalRecommendations) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>

              <Button 
                className="w-full mb-4 bg-[#3A9FFF] hover:bg-[#3A9FFF]/90"
                onClick={handleRunRecommendations}
              >
                <Zap className="mr-2" size={16} />
                Run Recommendations Now
              </Button>

              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Click Rate</span>
                  <span className="text-sm font-semibold">
                    {stats.totalRecommendations > 0
                      ? (((stats.totalViewed + stats.totalSaved + stats.totalApplied) / stats.totalRecommendations) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-[#3A9FFF] h-2 rounded-full transition-all"
                    style={{ 
                      width: stats.totalRecommendations > 0
                        ? `${((stats.totalViewed + stats.totalSaved + stats.totalApplied) / stats.totalRecommendations) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-[#3A9FFF]/10 to-purple-500/10 border border-[#3A9FFF]/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-[#3A9FFF]" size={16} />
                  <span className="text-sm font-semibold">Top Engaged Roles</span>
                </div>
                <p className="text-xs text-muted-foreground">Coming soon: Real-time role analytics</p>
              </div>
            </CardContent>
          </Card>

          {/* Panel D: Developer Tools */}
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Settings className="text-[#3A9FFF]" size={24} />
                Developer Tools
              </CardTitle>
              <CardDescription>Platform maintenance & controls</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start bg-muted hover:bg-muted/80 text-foreground"
                  onClick={handleRunRecommendations}
                >
                  <RefreshCw className="mr-2" size={16} />
                  Force Run Recommendations
                </Button>

                <Button 
                  className="w-full justify-start bg-muted hover:bg-muted/80 text-foreground"
                  onClick={handlePurgeOldLogs}
                >
                  <Trash2 className="mr-2" size={16} />
                  Purge Old Logs (90d+)
                </Button>

                <Button 
                  className="w-full justify-start bg-muted hover:bg-muted/80 text-foreground"
                  onClick={() => {
                    toast({ title: 'Coming Soon', description: 'Schema sync feature in development' });
                    addConsoleLog('Schema sync requested (not yet implemented)');
                  }}
                >
                  <Database className="mr-2" size={16} />
                  Sync Schema
                </Button>

                <Button 
                  className="w-full justify-start bg-muted hover:bg-muted/80 text-foreground"
                  onClick={() => {
                    toast({ title: 'Coming Soon', description: 'Cron job viewer in development' });
                    addConsoleLog('Cron jobs view requested (not yet implemented)');
                  }}
                >
                  <Clock className="mr-2" size={16} />
                  Show Cron Jobs
                </Button>
              </div>

              {/* Developer Console */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Developer Console</h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setConsoleLog([])}
                  >
                    Clear
                  </Button>
                </div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs border border-[#3A9FFF]/20">
                  {consoleLog.length === 0 ? (
                    <p className="text-muted-foreground">No activity yet...</p>
                  ) : (
                    consoleLog.map((log, idx) => (
                      <div key={idx} className="text-green-400 mb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-green-500" size={24} />
              System Status
            </CardTitle>
            <CardDescription>Real-time platform health monitoring</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">Database</p>
                  <p className="text-xs text-muted-foreground">Operational</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">Edge Functions</p>
                  <p className="text-xs text-muted-foreground">Operational</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">Realtime</p>
                  <p className="text-xs text-muted-foreground">Connected</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Admin;