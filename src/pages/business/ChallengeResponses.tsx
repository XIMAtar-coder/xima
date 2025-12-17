import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, Clock, CheckCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { getChallengeTimeInfo } from '@/utils/challengeTimeUtils';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import type { HiringGoal } from '@/hooks/useHiringGoals';

interface ChallengeInfo {
  id: string;
  title: string;
  description: string | null;
  successCriteria: string[];
  startAt: string | null;
  endAt: string | null;
  status: string;
}

interface InvitationWithSubmission {
  invitationId: string;
  candidateProfileId: string;
  candidateName: string;
  invitationStatus: string;
  invitedAt: string;
  submissionId: string | null;
  submissionStatus: 'draft' | 'submitted' | null;
  submittedAt: string | null;
  draftPayload: any;
  submittedPayload: any;
}

export default function ChallengeResponses() {
  const { goalId, challengeId } = useParams<{ goalId: string; challengeId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [invitations, setInvitations] = useState<InvitationWithSubmission[]>([]);
  const [allGoals, setAllGoals] = useState<HiringGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<HiringGoal | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<InvitationWithSubmission | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!challengeId || !goalId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/business/login');
          return;
        }

        // Load challenge
        const { data: challengeData, error: challengeError } = await supabase
          .from('business_challenges')
          .select('id, title, description, success_criteria, start_at, end_at, status')
          .eq('id', challengeId)
          .eq('business_id', user.id)
          .single();

        if (challengeError || !challengeData) {
          toast({ title: t('common.error'), description: 'Challenge not found', variant: 'destructive' });
          navigate(`/business/goals/${goalId}/challenges`);
          return;
        }

        setChallenge({
          id: challengeData.id,
          title: challengeData.title,
          description: challengeData.description,
          successCriteria: challengeData.success_criteria || [],
          startAt: challengeData.start_at,
          endAt: challengeData.end_at,
          status: challengeData.status,
        });

        // Load hiring goals
        const { data: goalsData } = await supabase
          .from('hiring_goal_drafts')
          .select('*')
          .eq('business_id', user.id)
          .eq('status', 'active');

        setAllGoals((goalsData || []) as HiringGoal[]);
        const goal = goalsData?.find(g => g.id === goalId);
        setCurrentGoal((goal || null) as HiringGoal | null);

        // Load invitations with submissions
        const { data: invitationsData } = await supabase
          .from('challenge_invitations')
          .select(`
            id,
            candidate_profile_id,
            status,
            created_at,
            profiles!challenge_invitations_candidate_profile_id_fkey (
              id,
              full_name,
              name
            )
          `)
          .eq('challenge_id', challengeId)
          .eq('business_id', user.id);

        // Load submissions
        const { data: submissionsData } = await supabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', challengeId)
          .eq('business_id', user.id);

        const submissionsByInvitation = new Map(
          submissionsData?.map(s => [s.invitation_id, s]) || []
        );

        const mapped: InvitationWithSubmission[] = (invitationsData || []).map(inv => {
          const profile = inv.profiles as any;
          const submission = submissionsByInvitation.get(inv.id);
          return {
            invitationId: inv.id,
            candidateProfileId: inv.candidate_profile_id,
            candidateName: profile?.full_name || profile?.name || 'Unknown',
            invitationStatus: inv.status,
            invitedAt: inv.created_at,
            submissionId: submission?.id || null,
            submissionStatus: (submission?.status as 'draft' | 'submitted') || null,
            submittedAt: submission?.submitted_at || null,
            draftPayload: submission?.draft_payload || null,
            submittedPayload: submission?.submitted_payload || null,
          };
        });

        setInvitations(mapped);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: t('common.error'), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [challengeId, goalId, navigate, t]);

  const timeInfo = challenge ? getChallengeTimeInfo(challenge.startAt, challenge.endAt, challenge.status) : null;

  const stats = {
    invited: invitations.length,
    submitted: invitations.filter(i => i.submissionStatus === 'submitted').length,
    draft: invitations.filter(i => i.submissionStatus === 'draft').length,
    pending: invitations.filter(i => !i.submissionId).length,
  };

  const getStatusBadge = (inv: InvitationWithSubmission) => {
    if (inv.submissionStatus === 'submitted') {
      return <Badge className="bg-green-500">{t('business.responses.submitted')}</Badge>;
    }
    if (inv.submissionStatus === 'draft') {
      return <Badge variant="secondary">{t('business.responses.draft')}</Badge>;
    }
    if (inv.invitationStatus === 'accepted') {
      return <Badge variant="outline">{t('business.responses.in_progress')}</Badge>;
    }
    return <Badge variant="outline">{t('business.responses.invited')}</Badge>;
  };

  const openDetail = (inv: InvitationWithSubmission) => {
    setSelectedSubmission(inv);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <GoalContextHeader
          currentGoal={currentGoal}
          allGoals={allGoals}
          onGoalSwitch={(id) => navigate(`/business/goals/${id}/challenges`)}
        />

        {/* Challenge Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/business/goals/${goalId}/challenges`)}
                  className="mb-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {t('common.back')}
                </Button>
                <CardTitle>{challenge?.title}</CardTitle>
                <CardDescription>{t('business.responses.subtitle')}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={timeInfo?.timeStatus === 'expired' ? 'destructive' : 'default'}>
                  {timeInfo?.timeStatus === 'expired' ? t('challenge.status.expired') : 
                   timeInfo?.timeStatus === 'upcoming' ? t('challenge.status.upcoming') : 
                   t('challenge.status.active')}
                </Badge>
                {timeInfo?.remainingText && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {timeInfo.remainingText}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{stats.invited}</div>
              <div className="text-sm text-muted-foreground">{t('business.responses.stat_invited')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
              <div className="text-sm text-muted-foreground">{t('business.responses.stat_submitted')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
              <div className="text-sm text-muted-foreground">{t('business.responses.stat_draft')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">{t('business.responses.stat_pending')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('business.responses.table_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('business.responses.no_invitations')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('business.responses.col_candidate')}</TableHead>
                    <TableHead>{t('business.responses.col_status')}</TableHead>
                    <TableHead>{t('business.responses.col_invited_at')}</TableHead>
                    <TableHead>{t('business.responses.col_submitted_at')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.invitationId}>
                      <TableCell className="font-medium">{inv.candidateName}</TableCell>
                      <TableCell>{getStatusBadge(inv)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(inv.invitedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.submittedAt ? new Date(inv.submittedAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {(inv.submissionStatus === 'submitted' || inv.submissionStatus === 'draft') && (
                          <Button variant="ghost" size="sm" onClick={() => openDetail(inv)}>
                            <Eye className="h-4 w-4 mr-1" />
                            {t('business.responses.view')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedSubmission?.candidateName} - {t('business.responses.submission')}
                {selectedSubmission?.submissionStatus === 'draft' && (
                  <Badge variant="secondary" className="ml-2">{t('business.responses.draft')}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <SubmissionDetail 
                submission={selectedSubmission}
                challenge={challenge}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </BusinessLayout>
  );
}

function SubmissionDetail({ submission, challenge }: { submission: InvitationWithSubmission; challenge: ChallengeInfo | null }) {
  const { t } = useTranslation();
  const payload = submission.submissionStatus === 'submitted' 
    ? submission.submittedPayload 
    : submission.draftPayload;

  if (!payload) {
    return <p className="text-muted-foreground">{t('business.responses.no_content')}</p>;
  }

  const tradeoffLabels: Record<string, string> = {
    speed: t('challenge.tradeoff_speed'),
    quality: t('challenge.tradeoff_quality'),
    alignment: t('challenge.tradeoff_alignment'),
    data: t('challenge.tradeoff_data'),
    cost: t('challenge.tradeoff_cost'),
  };

  const confidenceLabels: Record<string, string> = {
    low: t('challenge.confidence_low'),
    medium: t('challenge.confidence_medium'),
    high: t('challenge.confidence_high'),
  };

  return (
    <div className="space-y-6">
      {/* Challenge context */}
      {challenge && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">{challenge.title}</h4>
          {challenge.successCriteria.length > 0 && (
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {challenge.successCriteria.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* XIMA signals */}
      <div className="flex flex-wrap gap-2">
        {payload.tradeoff_priority && (
          <Badge variant="outline" className="text-sm">
            {t('challenge.tradeoff_label')}: {tradeoffLabels[payload.tradeoff_priority] || payload.tradeoff_priority}
          </Badge>
        )}
        {payload.confidence && (
          <Badge variant="outline" className="text-sm">
            {t('challenge.confidence_label')}: {confidenceLabels[payload.confidence] || payload.confidence}
          </Badge>
        )}
      </div>

      {/* Approach */}
      {payload.approach && (
        <div>
          <h4 className="font-medium mb-1">{t('challenge.approach_label')}</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{payload.approach}</p>
        </div>
      )}

      {/* Assumptions */}
      {payload.assumptions && (
        <div>
          <h4 className="font-medium mb-1">{t('challenge.assumptions_label')}</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{payload.assumptions}</p>
        </div>
      )}

      {/* First actions */}
      {payload.first_actions?.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">{t('challenge.first_actions_label')}</h4>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1">
            {payload.first_actions.filter((a: string) => a?.trim()).map((action: string, i: number) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Metadata */}
      {submission.submittedAt && (
        <div className="text-sm text-muted-foreground pt-4 border-t">
          {t('challenge.submitted_at')}: {new Date(submission.submittedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
