import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  reward: string;
  companyName: string;
  deadline: string;
  matchScore: number;
}

interface PersonalizedChallengeProps {
  userId: string;
  ximatarType?: string;
  pillarScores?: Array<{ pillar: string; score: number }>;
}

export const PersonalizedChallenge: React.FC<PersonalizedChallengeProps> = ({
  userId,
  ximatarType,
  pillarScores,
}) => {
  const { t, i18n } = useTranslation();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('fetch-user-challenges', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          throw error;
        }

        if (data?.success && data?.challenges) {
          setChallenges(data.challenges);
        } else {
          setChallenges([]);
        }
      } catch (error: any) {
        console.error('Error fetching challenges:', error);
        setError(error.message || 'Failed to load challenges');
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchChallenges();
    }
  }, [userId]);

  const handleNextChallenge = () => {
    if (challenges.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % challenges.length);
    }
  };

  const handlePrevChallenge = () => {
    if (challenges.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + challenges.length) % challenges.length);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('profile.challenge_for_you', 'Challenge for You')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentChallenge = challenges[currentIndex];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('profile.challenge_for_you', 'Sfida per Te')}
          <Badge variant="secondary" className="ml-auto">
            {t('profile.this_week', 'Questa Settimana')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-muted-foreground text-center py-4">{error}</p>
        ) : challenges.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {t('profile.no_challenges', 'Nessuna sfida disponibile questa settimana. Controlla più tardi!')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-lg leading-tight">{currentChallenge.title}</h4>
                <Badge variant="outline" className="shrink-0">
                  {currentChallenge.matchScore}% Match
                </Badge>
              </div>
              
              <p className="text-muted-foreground leading-relaxed">
                {currentChallenge.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>{currentChallenge.companyName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Difficulty: {currentChallenge.difficulty}/5
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {currentChallenge.reward}
                  </Badge>
                </div>
              </div>
            </div>

            {challenges.length > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevChallenge}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {challenges.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextChallenge}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};