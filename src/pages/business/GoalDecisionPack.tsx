/**
 * XIMA Premium: Decision Pack Page
 * Provides a printable/exportable summary of all candidates for a hiring goal
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHiringGoals } from '@/hooks/useHiringGoals';
import { useBusinessPremium } from '@/hooks/useBusinessPremium';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Printer, Download, Crown, Lock,
  User, CheckCircle2, Clock, XCircle, MessageSquare,
  ArrowRight, TrendingUp, AlertTriangle
} from 'lucide-react';

interface CandidatePackItem {
  candidateProfileId: string;
  candidateName: string;
  ximatarLabel: string;
  stage: 'invited' | 'in_progress' | 'submitted' | 'reviewed' | 'advanced' | 'passed';
  decision?: 'shortlist' | 'followup' | 'pass' | 'proceed_level2';
  signalsSummary?: {
    overall: number;
    confidence: string;
    topStrength: string;
  };
  submittedAt?: string;
}

const GoalDecisionPack: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { goals, loading: goalsLoading } = useHiringGoals();
  const { isPremium, loading: premiumLoading } = useBusinessPremium();
  
  const [candidates, setCandidates] = useState<CandidatePackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentGoal = goals.find(g => g.id === goalId) || null;

  useEffect(() => {
    if (!goalId) return;
    loadCandidates();
  }, [goalId]);

  const loadCandidates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !goalId) return;

      // Fetch all invitations for this goal with submissions and reviews
      const { data: invitations } = await supabase
        .from('challenge_invitations')
        .select(`
          id,
          candidate_profile_id,
          status,
          created_at,
          challenge_submissions (
            id,
            status,
            submitted_at,
            signals_payload
          ),
          challenge_reviews (
            decision
          )
        `)
        .eq('hiring_goal_id', goalId)
        .eq('business_id', user.id);

      if (!invitations) {
        setCandidates([]);
        return;
      }

      // Get candidate profiles
      const profileIds = [...new Set(invitations.map(i => i.candidate_profile_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, full_name, ximatar')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build candidate pack items
      const items: CandidatePackItem[] = invitations.map(inv => {
        const profile = profileMap.get(inv.candidate_profile_id);
        const submission = Array.isArray(inv.challenge_submissions) 
          ? inv.challenge_submissions[0] 
          : inv.challenge_submissions;
        const review = Array.isArray(inv.challenge_reviews)
          ? inv.challenge_reviews[0]
          : inv.challenge_reviews;

        // Determine stage
        let stage: CandidatePackItem['stage'] = 'invited';
        if (review?.decision === 'proceed_level2') {
          stage = 'advanced';
        } else if (review?.decision === 'pass') {
          stage = 'passed';
        } else if (review?.decision) {
          stage = 'reviewed';
        } else if (submission?.status === 'submitted') {
          stage = 'submitted';
        } else if (submission?.status === 'in_progress') {
          stage = 'in_progress';
        }

        // Extract signals summary
        let signalsSummary: CandidatePackItem['signalsSummary'] | undefined;
        if (submission?.signals_payload) {
          const signals = submission.signals_payload as any;
          signalsSummary = {
            overall: signals.overall || 0,
            confidence: signals.confidence || 'unknown',
            topStrength: signals.impact_thinking >= signals.framing 
              ? t('business.compare.impact')
              : t('business.compare.framing'),
          };
        }

        return {
          candidateProfileId: inv.candidate_profile_id,
          candidateName: profile?.name || profile?.full_name || t('common.unknown'),
          ximatarLabel: profile?.ximatar || 'fox',
          stage,
          decision: review?.decision,
          signalsSummary,
          submittedAt: submission?.submitted_at,
        };
      });

      // Remove duplicates (keep latest per candidate)
      const uniqueItems = Array.from(
        new Map(items.map(item => [item.candidateProfileId, item])).values()
      );

      setCandidates(uniqueItems);
    } catch (error) {
      console.error('Error loading candidates for decision pack:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalSwitch = (newGoalId: string) => {
    navigate(`/business/goals/${newGoalId}/decision-pack`);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStageBadge = (stage: CandidatePackItem['stage']) => {
    const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
      invited: {
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
        label: t('premium.pack.stage_invited'),
      },
      in_progress: {
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
        label: t('premium.pack.stage_in_progress'),
      },
      submitted: {
        icon: <CheckCircle2 className="h-3 w-3" />,
        className: 'bg-green-500/10 text-green-600 border-green-500/30',
        label: t('premium.pack.stage_submitted'),
      },
      reviewed: {
        icon: <MessageSquare className="h-3 w-3" />,
        className: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
        label: t('premium.pack.stage_reviewed'),
      },
      advanced: {
        icon: <ArrowRight className="h-3 w-3" />,
        className: 'bg-primary/10 text-primary border-primary/30',
        label: t('premium.pack.stage_advanced'),
      },
      passed: {
        icon: <XCircle className="h-3 w-3" />,
        className: 'bg-muted text-muted-foreground border-border',
        label: t('premium.pack.stage_passed'),
      },
    };

    const { icon, className, label } = config[stage] || config.invited;

    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {label}
      </Badge>
    );
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-500/10 text-green-600',
      medium: 'bg-amber-500/10 text-amber-600',
      low: 'bg-red-500/10 text-red-600',
    };

    return (
      <Badge variant="outline" className={`text-[10px] ${colors[confidence] || colors.low}`}>
        {t(`signals.confidence_${confidence}`)}
      </Badge>
    );
  };

  if (goalsLoading || premiumLoading || loading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </BusinessLayout>
    );
  }

  // Non-premium locked state
  if (!isPremium) {
    return (
      <BusinessLayout>
        <div className="space-y-6">
          <GoalContextHeader
            currentGoal={currentGoal}
            allGoals={goals}
            onGoalSwitch={handleGoalSwitch}
          />

          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="py-12 text-center">
              <Lock className="h-16 w-16 text-amber-500/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('premium.pack.locked_title')}</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t('premium.pack.locked_description')}
              </p>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Crown className="h-4 w-4 mr-2" />
                {t('signals.premium.unlock_cta')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </BusinessLayout>
    );
  }

  // Stats summary
  const stats = {
    total: candidates.length,
    submitted: candidates.filter(c => ['submitted', 'reviewed', 'advanced'].includes(c.stage)).length,
    advanced: candidates.filter(c => c.stage === 'advanced').length,
    needsDecision: candidates.filter(c => c.stage === 'submitted').length,
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 print:space-y-4">
        {/* Header - hidden on print */}
        <div className="print:hidden">
          <GoalContextHeader
            currentGoal={currentGoal}
            allGoals={goals}
            onGoalSwitch={handleGoalSwitch}
          />
        </div>

        {/* Title + Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {t('premium.pack.title')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {currentGoal?.role_title} • {t('premium.pack.subtitle', { count: candidates.length })}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t('premium.pack.print')}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">{t('premium.pack.total_candidates')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
              <div className="text-xs text-muted-foreground">{t('premium.pack.submitted')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.advanced}</div>
              <div className="text-xs text-muted-foreground">{t('premium.pack.advanced')}</div>
            </CardContent>
          </Card>
          <Card className={stats.needsDecision > 0 ? 'border-amber-500/50' : ''}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.needsDecision}</div>
              <div className="text-xs text-muted-foreground">{t('premium.pack.needs_decision')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Candidate List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('premium.pack.candidates_list')}</CardTitle>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('premium.pack.no_candidates')}
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.candidateProfileId}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{candidate.candidateName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {candidate.ximatarLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Signals Summary */}
                      {candidate.signalsSummary && (
                        <div className="text-right hidden md:block">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{candidate.signalsSummary.topStrength}</span>
                            {getConfidenceBadge(candidate.signalsSummary.confidence)}
                          </div>
                        </div>
                      )}

                      {/* Stage Badge */}
                      {getStageBadge(candidate.stage)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Print Footer */}
        <div className="hidden print:block text-center text-xs text-muted-foreground pt-4 border-t">
          {t('premium.pack.print_footer')} • {new Date().toLocaleDateString()}
        </div>
      </div>
    </BusinessLayout>
  );
};

export default GoalDecisionPack;
