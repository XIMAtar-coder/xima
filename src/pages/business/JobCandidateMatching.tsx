import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Sparkles, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Candidate {
  user_id: string;
  ximatar_label: string;
  ximatar_image: string;
  evaluation_score: number;
  pillar_average: number;
  computational_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
}

interface JobOffer {
  id: string;
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  required_pillars?: Record<string, number>;
  ideal_ximatar?: string[];
}

interface CandidateMatch extends Candidate {
  matchScore: number;
  pillarAlignment: Record<string, { candidate: number; required: number; match: number }>;
  ximatarMatch: boolean;
  skillCoverage: number;
}

const JobCandidateMatching = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobOffer | null>(null);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);

  useEffect(() => {
    if (!businessLoading) {
      if (!isBusiness) {
        navigate('/business/login');
        return;
      }
      loadJobAndMatches();
    }
  }, [businessLoading, isBusiness, jobId]);

  const loadJobAndMatches = async () => {
    if (!jobId) return;

    try {
      // For now, using mock job data
      // In production, fetch from a job_offers table
      const mockJob: JobOffer = {
        id: jobId,
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        description: 'We are looking for an experienced software engineer...',
        required_skills: ['python', 'data', 'analysis', 'communication'],
        required_pillars: {
          computational_power: 8,
          communication: 7,
          knowledge: 7,
          creativity: 6,
          drive: 7
        },
        ideal_ximatar: ['owl', 'cat', 'bee']
      };
      setJob(mockJob);

      // Fetch all candidates
      const { data: candidates, error } = await supabase.rpc('get_candidate_visibility');

      if (error) throw error;

      // Calculate match scores
      const matchedCandidates: CandidateMatch[] = candidates.map((candidate: Candidate) => {
        const pillarAlignment: Record<string, { candidate: number; required: number; match: number }> = {};
        let totalMatch = 0;
        let pillarCount = 0;

        if (mockJob.required_pillars) {
          Object.entries(mockJob.required_pillars).forEach(([pillar, required]) => {
            const candidateScore = (candidate as any)[pillar] || 0;
            const match = Math.max(0, 100 - Math.abs(candidateScore - required) * 10);
            pillarAlignment[pillar] = {
              candidate: candidateScore,
              required,
              match
            };
            totalMatch += match;
            pillarCount++;
          });
        }

        const pillarMatchScore = pillarCount > 0 ? totalMatch / pillarCount : 0;
        const ximatarMatch = mockJob.ideal_ximatar?.includes(candidate.ximatar_label.toLowerCase()) || false;
        const ximatarBonus = ximatarMatch ? 15 : 0;

        // Skill coverage (simplified - would need actual skill matching)
        const skillCoverage = 75; // Mock value

        const matchScore = Math.min(100, Math.round(pillarMatchScore + ximatarBonus));

        return {
          ...candidate,
          matchScore,
          pillarAlignment,
          ximatarMatch,
          skillCoverage
        };
      });

      // Sort by match score
      matchedCandidates.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(matchedCandidates);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load candidate matches',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || businessLoading) {
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/business/jobs')}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">
              Candidate Matching
            </h1>
            <p className="text-[#A3ABB5]">
              {job?.title} • {matches.length} candidates analyzed
            </p>
          </div>
        </div>

        {/* Job Overview Card */}
        {job && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Job Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map(skill => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
              {job.ideal_ximatar && (
                <div>
                  <h3 className="font-semibold mb-2">Ideal XIMAtar Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.ideal_ximatar.map(ximatar => (
                      <Badge key={ximatar} className="bg-primary/10 text-primary capitalize">
                        {ximatar}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Matches */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            <TrendingUp className="inline mr-2 h-6 w-6" />
            Recommended Candidates
          </h2>
          <div className="grid gap-4">
            {matches.slice(0, 10).map((match) => (
              <Card key={match.user_id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    {/* XIMAtar Image */}
                    <img
                      src={match.ximatar_image}
                      alt={match.ximatar_label}
                      className="w-16 h-16 rounded-full object-cover"
                    />

                    {/* Candidate Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold capitalize">{match.ximatar_label}</h3>
                            {match.ximatarMatch && (
                              <Badge className="bg-primary/10 text-primary">
                                <Sparkles className="h-3 w-3 mr-1" />
                                XIMAtar Match
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Evaluation Score: {match.evaluation_score.toFixed(1)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">
                            {match.matchScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">Match Score</div>
                        </div>
                      </div>

                      {/* Pillar Alignment */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Pillar Alignment</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(match.pillarAlignment).map(([pillar, data]) => (
                            <div key={pillar} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="capitalize">{pillar.replace('_', ' ')}</span>
                                <span className="font-medium">{data.match.toFixed(0)}%</span>
                              </div>
                              <Progress value={data.match} className="h-1.5" />
                              <div className="text-xs text-muted-foreground">
                                Candidate: {data.candidate.toFixed(1)} / Required: {data.required}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/business/candidates`)}
                        >
                          View Profile
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: 'Invite Sent',
                              description: 'Candidate has been invited to apply'
                            });
                          }}
                        >
                          Invite to Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default JobCandidateMatching;
