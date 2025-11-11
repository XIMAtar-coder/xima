import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Heart, Brain, Sparkles } from 'lucide-react';

interface RoleCompatibilityPanelProps {
  jobId: string;
  requiredSkills?: string[];
}

export const RoleCompatibilityPanel = ({ jobId, requiredSkills = [] }: RoleCompatibilityPanelProps) => {
  const { user } = useUser();
  const [compatibility, setCompatibility] = useState({
    overallScore: 0,
    pillarScores: [] as Array<{ pillar: string; score: number; weight: number }>,
    ximatarMatch: '',
    sentiment: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchCompatibility();
    }
  }, [user?.id, jobId]);

  const fetchCompatibility = async () => {
    try {
      // Fetch user's latest assessment
      const { data: assessment } = await supabase
        .from('assessment_results')
        .select(`
          *,
          ximatars(label),
          pillar_scores(pillar, score)
        `)
        .eq('user_id', user?.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .single();

      if (assessment) {
        const pillarScores = assessment.pillar_scores?.map((ps: any) => ({
          pillar: ps.pillar.replace('_', ' ').toUpperCase(),
          score: ps.score,
          weight: 0.2 // Equal weight for now
        })) || [];

        const overallScore = pillarScores.reduce((acc: number, ps: any) => 
          acc + (ps.score * ps.weight), 0
        ) / pillarScores.length * 10;

        setCompatibility({
          overallScore: Math.round(overallScore),
          pillarScores,
          ximatarMatch: assessment.ximatars?.label || 'Unknown',
          sentiment: assessment.sentiment || 0
        });
      }
    } catch (error) {
      console.error('Error fetching compatibility:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'bg-green-500';
    if (sentiment > -0.3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.3) return 'Highly Aligned';
    if (sentiment > -0.3) return 'Moderate Fit';
    return 'Consider Growth Areas';
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Role Compatibility Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Match Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Match</span>
            <Badge variant="default" className="text-lg px-4 py-1">
              {compatibility.overallScore}%
            </Badge>
          </div>
          <Progress value={compatibility.overallScore} className="h-3" />
        </div>

        {/* XIMAtar Synergy */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-semibold">Your XIMAtar: {compatibility.ximatarMatch}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Best fit for roles emphasizing innovation, adaptability, and strategic thinking
          </p>
        </div>

        {/* Pillar Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pillar Alignment
          </h4>
          {compatibility.pillarScores.map((ps, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{ps.pillar}</span>
                <span className="font-medium">{Math.round(ps.score)}/10</span>
              </div>
              <Progress value={ps.score * 10} className="h-2" />
            </div>
          ))}
        </div>

        {/* Sentiment Bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Engagement Sentiment</span>
          </div>
          <div className="flex gap-1 h-6 rounded-full overflow-hidden">
            <div className={`flex-1 ${getSentimentColor(compatibility.sentiment)} transition-all`}></div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {getSentimentLabel(compatibility.sentiment)}
          </p>
        </div>

        {/* Dynamic Badge */}
        {compatibility.overallScore >= 80 && (
          <Badge variant="default" className="w-full justify-center py-2">
            ⭐ Top Fit - Highly Recommended
          </Badge>
        )}
        {compatibility.overallScore >= 60 && compatibility.overallScore < 80 && (
          <Badge variant="secondary" className="w-full justify-center py-2">
            🚀 High Engagement Potential
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
