import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target_skills: string[];
  deadline: string;
  difficulty: number;
  created_at: string;
  business_id: string;
}

export const RecommendedChallenges = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, [user?.id]);

  const fetchChallenges = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_challenges')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('candidate_challenges')
        .insert({
          candidate_id: user.id,
          challenge_id: challengeId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Challenge Joined!",
        description: "You've successfully joined this challenge.",
      });

      fetchChallenges();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join challenge",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading challenges...</div>;
  }

  if (challenges.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No challenges available at the moment
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {challenges.map((challenge) => (
        <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{challenge.title}</CardTitle>
                <CardDescription>
                  Company Challenge
                </CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Level {challenge.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {challenge.description}
            </p>

            {challenge.target_skills && challenge.target_skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {challenge.target_skills.slice(0, 3).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {challenge.target_skills.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{challenge.target_skills.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {challenge.deadline && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(challenge.deadline), { addSuffix: true })}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Posted {formatDistanceToNow(new Date(challenge.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={() => handleJoinChallenge(challenge.id)}
            >
              Join Challenge
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
