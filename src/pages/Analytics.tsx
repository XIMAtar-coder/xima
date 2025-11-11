import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Users, Briefcase, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['#3A9FFF', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    activeChallenges: 0,
    totalJobs: 0,
    avgMatchScore: 0
  });
  const [activityData, setActivityData] = useState<any[]>([]);
  const [ximatarData, setXimatarData] = useState<any[]>([]);
  const [pillarData, setPillarData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch businesses
      const { count: businessCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'business');

      // Fetch active challenges
      const { count: challengesCount } = await supabase
        .from('business_challenges')
        .select('*', { count: 'exact', head: true })
        .gte('deadline', new Date().toISOString());

      // Fetch total jobs
      const { count: jobsCount } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true });

      // Fetch activity logs
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('action, created_at')
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Process activity data by day
      const activityByDay = activities?.reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, count: 0 };
        }
        acc[date].count++;
        return acc;
      }, {});

      setActivityData(Object.values(activityByDay || {}));

      // Fetch XIMAtar distribution
      const { data: ximatars } = await supabase
        .from('assessment_results')
        .select('ximatars(label)')
        .not('ximatar_id', 'is', null);

      const ximatarCounts = ximatars?.reduce((acc: any, curr: any) => {
        const label = curr.ximatars?.label || 'Unknown';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});

      setXimatarData(
        Object.entries(ximatarCounts || {}).map(([name, value]) => ({
          name,
          value
        }))
      );

      // Fetch pillar scores
      const { data: pillars } = await supabase
        .from('pillar_scores')
        .select('pillar, score');

      const pillarAvgs = pillars?.reduce((acc: any, curr: any) => {
        if (!acc[curr.pillar]) {
          acc[curr.pillar] = { total: 0, count: 0 };
        }
        acc[curr.pillar].total += curr.score;
        acc[curr.pillar].count++;
        return acc;
      }, {});

      setPillarData(
        Object.entries(pillarAvgs || {}).map(([pillar, data]: [string, any]) => ({
          pillar: pillar.replace('_', ' ').toUpperCase(),
          score: Math.round(data.total / data.count)
        }))
      );

      setStats({
        totalUsers: usersCount || 0,
        totalBusinesses: businessCount || 0,
        activeChallenges: challengesCount || 0,
        totalJobs: jobsCount || 0,
        avgMatchScore: 85 // Simulated for now
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Businesses', value: stats.totalBusinesses, icon: Briefcase, color: 'text-green-500' },
    { title: 'Active Challenges', value: stats.activeChallenges, icon: Target, color: 'text-purple-500' },
    { title: 'Job Opportunities', value: stats.totalJobs, icon: TrendingUp, color: 'text-orange-500' },
    { title: 'Avg Match Score', value: `${stats.avgMatchScore}%`, icon: Activity, color: 'text-pink-500' }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Real-time performance intelligence and insights
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Activity Trends</TabsTrigger>
            <TabsTrigger value="ximatars">XIMAtar Distribution</TabsTrigger>
            <TabsTrigger value="pillars">Pillar Strengths</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Over Time</CardTitle>
                <CardDescription>
                  Daily active users and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#3A9FFF" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ximatars" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>XIMAtar Distribution</CardTitle>
                <CardDescription>
                  Breakdown of candidate personality types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ximatarData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ximatarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pillars" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Average Pillar Scores</CardTitle>
                <CardDescription>
                  Candidate pool competency breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={pillarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="pillar" />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} />
                    <Radar name="Score" dataKey="score" stroke="#3A9FFF" fill="#3A9FFF" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
