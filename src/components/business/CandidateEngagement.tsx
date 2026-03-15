import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Award } from 'lucide-react';

interface CandidateEngagementData {
  totalViews: number;
  totalApplications: number;
  totalChallenges: number;
  recentCandidates: Array<{
    id: string;
    name: string;
    avatar: string;
    ximatar: string;
    status: string;
    matchScore: number;
  }>;
}

export const CandidateEngagement = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<CandidateEngagementData>({
    totalViews: 0,
    totalApplications: 0,
    totalChallenges: 0,
    recentCandidates: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementData();
  }, []);

  const fetchEngagementData = async () => {
    try {
      // Fetch candidate challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('candidate_challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (challengesError) throw challengesError;

      // Fetch profiles for candidates
      const candidateIds = challenges?.map(c => c.candidate_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, ximatar')
        .in('user_id', candidateIds);

      if (profilesError) throw profilesError;

      // Fetch user job links for views and applications
      const { data: jobLinks, error: jobLinksError } = await supabase
        .from('user_job_links')
        .select('status');

      if (jobLinksError) throw jobLinksError;

      const views = jobLinks?.filter(link => link.status === 'viewed').length || 0;
      const applications = jobLinks?.filter(link => link.status === 'applied').length || 0;

      // Create a map of profiles
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform candidate data
      const recentCandidates = challenges?.slice(0, 5).map(challenge => {
        const profile = profileMap.get(challenge.candidate_id);
        return {
          id: challenge.candidate_id,
          name: profile?.name || 'Unknown',
          avatar: '',
          ximatar: profile?.ximatar || 'wolf',
          status: challenge.status,
          matchScore: Math.floor(Math.random() * 20 + 80) // Simulated for now
        };
      }) || [];

      setData({
        totalViews: views,
        totalApplications: applications,
        totalChallenges: challenges?.length || 0,
        recentCandidates
      });
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading engagement data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Candidates who viewed your opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              Total applications received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalChallenges}</div>
            <p className="text-xs text-muted-foreground">
              Candidates working on challenges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Candidates */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Candidate Activity</CardTitle>
          <CardDescription>
            Candidates who recently engaged with your opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentCandidates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No recent candidate activity
            </p>
          ) : (
            <div className="space-y-4">
              {data.recentCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={candidate.avatar} />
                      <AvatarFallback>
                        {candidate.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">
                        XIMAtar: {candidate.ximatar}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {candidate.matchScore}% match
                    </Badge>
                    <Badge>
                      {candidate.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
