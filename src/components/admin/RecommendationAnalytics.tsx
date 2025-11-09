import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecommendationAnalytics } from '@/hooks/useRecommendationAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, MousePointerClick, Send, Target } from 'lucide-react';

const RecommendationAnalytics = () => {
  const { metrics, loading } = useRecommendationAnalytics();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const conversionData = [
    { name: 'Recommended', value: metrics.totalRecommendations, color: 'hsl(var(--primary))' },
    { name: 'Viewed', value: metrics.totalViewed, color: 'hsl(var(--primary) / 0.8)' },
    { name: 'Saved', value: metrics.totalSaved, color: 'hsl(var(--primary) / 0.6)' },
    { name: 'Applied', value: metrics.totalApplied, color: 'hsl(var(--primary) / 0.4)' },
  ];

  const matchScoreData = metrics.matchScoreBuckets;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Performance</CardTitle>
          <CardDescription>Track how users interact with recommended jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Target className="text-primary" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Total Recommended</p>
                <p className="text-2xl font-bold">{metrics.totalRecommendations}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <MousePointerClick className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Click-Through Rate</p>
                <p className="text-2xl font-bold">{metrics.clickThroughRate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Send className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Application Rate</p>
                <p className="text-2xl font-bold">{metrics.applicationRate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <TrendingUp className="text-purple-600" size={24} />
              <div>
                <p className="text-sm text-muted-foreground">Total Applied</p>
                <p className="text-2xl font-bold">{metrics.totalApplied}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {conversionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Application Rate by Match Score</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={matchScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecommendationAnalytics;
