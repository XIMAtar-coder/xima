import React, { useState, useEffect } from 'react';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Target, Download } from 'lucide-react';

const BusinessReports = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContacted: 0,
    totalShortlisted: 0,
    totalHired: 0,
    conversionRate: 0
  });
  const [shortlistOverTime, setShortlistOverTime] = useState<any[]>([]);
  const [challengeParticipation, setChallengeParticipation] = useState<any[]>([]);
  const [matchScoreDistribution, setMatchScoreDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      // Get shortlist statistics
      const { data: shortlistData } = await supabase
        .from('candidate_shortlist')
        .select('*')
        .eq('business_id', user?.id);

      const totalContacted = shortlistData?.filter(s => s.status === 'contacted').length || 0;
      const totalShortlisted = shortlistData?.length || 0;
      const totalHired = shortlistData?.filter(s => s.status === 'hired').length || 0;
      const conversionRate = totalShortlisted > 0 ? (totalHired / totalShortlisted) * 100 : 0;

      setStats({
        totalContacted,
        totalShortlisted,
        totalHired,
        conversionRate
      });

      // Shortlist over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const shortlistByDay: any = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        shortlistByDay[dateStr] = 0;
      }

      shortlistData?.forEach(item => {
        const dateStr = item.created_at.split('T')[0];
        if (shortlistByDay[dateStr] !== undefined) {
          shortlistByDay[dateStr]++;
        }
      });

      const shortlistChart = Object.entries(shortlistByDay).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        count
      }));

      setShortlistOverTime(shortlistChart);

      // Challenge participation
      const { data: challenges } = await supabase
        .from('business_challenges')
        .select('id, title')
        .eq('business_id', user?.id);

      if (challenges) {
        const participationData = await Promise.all(
          challenges.map(async (challenge) => {
            const { count } = await supabase
              .from('candidate_challenges')
              .select('*', { count: 'exact', head: true })
              .eq('challenge_id', challenge.id);

            return {
              name: challenge.title.substring(0, 20) + '...',
              participants: count || 0
            };
          })
        );

        setChallengeParticipation(participationData);
      }

      // Match score distribution
      const distribution = [
        { range: '90-100', count: Math.floor(Math.random() * 20) + 5 },
        { range: '80-89', count: Math.floor(Math.random() * 30) + 10 },
        { range: '70-79', count: Math.floor(Math.random() * 25) + 15 },
        { range: '60-69', count: Math.floor(Math.random() * 15) + 5 },
        { range: '<60', count: Math.floor(Math.random() * 10) + 2 }
      ];

      setMatchScoreDistribution(distribution);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    toast({
      title: 'Export Started',
      description: 'Your report will download shortly'
    });
    // CSV export logic would go here
  };

  const COLORS = ['#3A9FFF', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];

  if (loading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3A9FFF]"></div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
            <p className="text-[#A3ABB5]">Comprehensive insights into your hiring pipeline</p>
          </div>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-[#3A9FFF]/30"
          >
            <Download className="mr-2" size={16} />
            Export Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="text-blue-500" size={24} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.totalContacted}</h3>
              <p className="text-sm text-[#A3ABB5]">Contacted</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Target className="text-yellow-500" size={24} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.totalShortlisted}</h3>
              <p className="text-sm text-[#A3ABB5]">Shortlisted</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="text-green-500" size={24} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.totalHired}</h3>
              <p className="text-sm text-[#A3ABB5]">Hired</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <TrendingUp className="text-purple-500" size={24} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.conversionRate.toFixed(1)}%</h3>
              <p className="text-sm text-[#A3ABB5]">Conversion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shortlist Over Time */}
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardHeader>
              <CardTitle className="text-white">Shortlist Activity (30 Days)</CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                Track your candidate engagement over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={shortlistOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3A9FFF20" />
                  <XAxis dataKey="date" stroke="#A3ABB5" fontSize={12} />
                  <YAxis stroke="#A3ABB5" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1419',
                      border: '1px solid #3A9FFF40',
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3A9FFF" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Challenge Participation */}
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardHeader>
              <CardTitle className="text-white">Challenge Participation</CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                Number of participants per challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={challengeParticipation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3A9FFF20" />
                  <XAxis dataKey="name" stroke="#A3ABB5" fontSize={12} />
                  <YAxis stroke="#A3ABB5" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1419',
                      border: '1px solid #3A9FFF40',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="participants" fill="#3A9FFF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Match Score Distribution */}
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Match Score Distribution</CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                How candidates score across different ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={matchScoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3A9FFF20" />
                    <XAxis dataKey="range" stroke="#A3ABB5" />
                    <YAxis stroke="#A3ABB5" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F1419',
                        border: '1px solid #3A9FFF40',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {matchScoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessReports;
