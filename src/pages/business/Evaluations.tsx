import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Evaluation {
  id: string;
  challenge_title: string;
  candidate_name: string;
  status: string;
  score?: number;
  completed_at?: string;
}

const BusinessEvaluations = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      // Get business challenges
      const { data: challenges } = await supabase
        .from('business_challenges')
        .select('id, title')
        .eq('business_id', user?.id);

      if (!challenges) {
        setLoading(false);
        return;
      }

      const challengeIds = challenges.map(c => c.id);

      // Get candidate challenges with candidate info
      const { data: candidateChallenges } = await supabase
        .from('candidate_challenges')
        .select(`
          id,
          challenge_id,
          candidate_id,
          status,
          score,
          completed_at
        `)
        .in('challenge_id', challengeIds);

      if (candidateChallenges) {
        // Get candidate profiles
        const candidateIds = candidateChallenges.map(cc => cc.candidate_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, full_name')
          .in('user_id', candidateIds);

        const evaluationData: Evaluation[] = candidateChallenges.map(cc => {
          const challenge = challenges.find(c => c.id === cc.challenge_id);
          const profile = profiles?.find(p => p.user_id === cc.candidate_id);

          return {
            id: cc.id,
            challenge_title: challenge?.title || 'Unknown Challenge',
            candidate_name: profile?.name || profile?.full_name || 'Anonymous',
            status: cc.status,
            score: cc.score,
            completed_at: cc.completed_at
          };
        });

        setEvaluations(evaluationData);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
      toast({
        title: t('business_portal.error'),
        description: t('business_portal.failed_load_profile'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'evaluated':
        return <FileText className="text-blue-500" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      default:
        return <AlertCircle className="text-muted-foreground" size={20} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      completed: 'bg-green-500/20 text-green-500',
      evaluated: 'bg-blue-500/20 text-blue-500'
    };

    return (
      <Badge className={colors[status] || 'bg-muted text-muted-foreground'}>
        {status}
      </Badge>
    );
  };

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
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.evaluations_page_title')}</h1>
          <p className="text-muted-foreground">
            {t('businessPortal.evaluations_page_subtitle')}
          </p>
        </div>

        {/* Evaluations List */}
        {evaluations.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto mb-4 text-[#A3ABB5]" size={48} />
              <p className="text-[#A3ABB5] text-lg mb-2">{t('business_portal.no_evaluations')}</p>
              <p className="text-[#A3ABB5] text-sm">
                {t('business_portal.create_challenges_invite')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <Card
                key={evaluation.id}
                className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20 hover:border-[#3A9FFF]/40 transition-all"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(evaluation.status)}
                      <div>
                        <CardTitle className="text-white text-lg">
                          {evaluation.challenge_title}
                        </CardTitle>
                        <CardDescription className="text-[#A3ABB5]">
                          {evaluation.candidate_name}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(evaluation.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6">
                      {evaluation.score !== null && evaluation.score !== undefined && (
                        <div>
                          <p className="text-xs text-[#A3ABB5] mb-1">{t('business_portal.score')}</p>
                          <p className="text-lg font-bold text-white">{evaluation.score.toFixed(1)}</p>
                        </div>
                      )}
                      {evaluation.completed_at && (
                        <div>
                          <p className="text-xs text-[#A3ABB5] mb-1">{t('business_portal.completed')}</p>
                          <p className="text-sm text-white">
                            {new Date(evaluation.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {evaluation.status === 'completed' && (
                      <Button
                        className="bg-[#3A9FFF] hover:bg-[#3A9FFF]/90"
                        onClick={() => {
                          toast({
                            title: t('admin.coming_soon'),
                            description: t('business_portal.coming_soon_evaluation')
                          });
                        }}
                      >
                        {t('business_portal.review_score')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BusinessLayout>
  );
};

export default BusinessEvaluations;