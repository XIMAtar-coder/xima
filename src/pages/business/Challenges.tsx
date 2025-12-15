import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Loader2, Pencil, Archive, CheckCircle, Copy, 
  Target, Calendar, Briefcase 
} from 'lucide-react';
import { format } from 'date-fns';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  status: string;
  hiring_goal_id: string | null;
  role_title: string | null;
  updated_at: string;
  created_at: string;
}

const BusinessChallenges = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading && user?.id) {
      loadChallenges();
    }
  }, [isAuthenticated, isBusiness, businessLoading, user?.id, navigate]);

  const loadChallenges = async () => {
    try {
      // Get challenges with hiring goal info
      const { data: challengesData, error } = await supabase
        .from('business_challenges')
        .select(`
          id,
          title,
          description,
          status,
          hiring_goal_id,
          updated_at,
          created_at
        `)
        .eq('business_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get hiring goals for role titles
      const goalIds = [...new Set(challengesData?.filter(c => c.hiring_goal_id).map(c => c.hiring_goal_id) || [])];
      let goalsMap: Record<string, string> = {};
      
      if (goalIds.length > 0) {
        const { data: goalsData } = await supabase
          .from('hiring_goal_drafts')
          .select('id, role_title')
          .in('id', goalIds);
        
        goalsData?.forEach(g => {
          goalsMap[g.id] = g.role_title || '';
        });
      }

      const enrichedChallenges = (challengesData || []).map(c => ({
        ...c,
        role_title: c.hiring_goal_id ? goalsMap[c.hiring_goal_id] || null : null
      }));

      setChallenges(enrichedChallenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.load_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (challengeId: string, hiringGoalId: string | null) => {
    setActionLoading(challengeId);
    try {
      // If there's a hiring goal, archive other active challenges for the same goal
      if (hiringGoalId) {
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', hiringGoalId)
          .eq('status', 'active')
          .neq('id', challengeId);
      }

      // Activate this challenge
      const { error } = await supabase
        .from('business_challenges')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: t('challenges.activated'),
        description: t('challenges.activated_desc')
      });
      
      loadChallenges();
    } catch (error) {
      console.error('Error activating challenge:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.activate_error'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (challengeId: string) => {
    setActionLoading(challengeId);
    try {
      const { error } = await supabase
        .from('business_challenges')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: t('challenges.archived'),
        description: t('challenges.archived_desc')
      });
      
      loadChallenges();
    } catch (error) {
      console.error('Error archiving challenge:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.archive_error'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (challenge: Challenge) => {
    setActionLoading(challenge.id);
    try {
      // Get full challenge data
      const { data: fullChallenge, error: fetchError } = await supabase
        .from('business_challenges')
        .select('*')
        .eq('id', challenge.id)
        .single();

      if (fetchError) throw fetchError;

      // Create a duplicate
      const { error } = await supabase
        .from('business_challenges')
        .insert({
          business_id: user?.id,
          hiring_goal_id: fullChallenge.hiring_goal_id,
          title: `${fullChallenge.title} (Copy)`,
          description: fullChallenge.description,
          success_criteria: fullChallenge.success_criteria,
          time_estimate_minutes: fullChallenge.time_estimate_minutes,
          rubric: fullChallenge.rubric,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: t('challenges.duplicated'),
        description: t('challenges.duplicated_desc')
      });
      
      loadChallenges();
    } catch (error) {
      console.error('Error duplicating challenge:', error);
      toast({
        title: t('common.error'),
        description: t('challenges.duplicate_error'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{t('challenges.status_active')}</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-muted-foreground">{t('challenges.status_draft')}</Badge>;
      case 'archived':
        return <Badge variant="secondary" className="text-muted-foreground">{t('challenges.status_archived')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {t('challenges.page_title')}
              </h1>
              <p className="text-muted-foreground">
                {t('challenges.page_subtitle')}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/business/challenges/new')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('challenges.new_challenge')}
          </Button>
        </div>

        {/* Challenges List */}
        {challenges.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('challenges.no_challenges')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('challenges.no_challenges_desc')}
              </p>
              <Button onClick={() => navigate('/business/challenges/new')}>
                <Plus className="h-4 w-4 mr-2" />
                {t('challenges.create_first')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {challenge.title}
                        </h3>
                        {getStatusBadge(challenge.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {challenge.role_title && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {challenge.role_title}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(challenge.updated_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/business/challenges/${challenge.id}/edit`)}
                        disabled={actionLoading === challenge.id}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {challenge.status !== 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivate(challenge.id, challenge.hiring_goal_id)}
                          disabled={actionLoading === challenge.id}
                          title={t('challenges.activate')}
                        >
                          {actionLoading === challenge.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      )}
                      {challenge.status !== 'archived' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(challenge.id)}
                          disabled={actionLoading === challenge.id}
                          title={t('challenges.archive')}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(challenge)}
                        disabled={actionLoading === challenge.id}
                        title={t('challenges.duplicate')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
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

export default BusinessChallenges;
