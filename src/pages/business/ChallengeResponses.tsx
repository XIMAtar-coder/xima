import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, Clock, CheckCircle, AlertTriangle, FileText, Loader2, BarChart3, ArrowUpDown, Sparkles } from 'lucide-react';
import { getChallengeTimeInfo } from '@/utils/challengeTimeUtils';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { computeSignals, SignalsPayload } from '@/lib/signals/computeSignals';
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
  signalsPayload: SignalsPayload | null;
  signalsVersion: string | null;
}

type SortField = 'overall' | 'framing' | 'decision_quality' | 'execution_bias' | 'impact_thinking' | 'candidateName';
type SortDir = 'asc' | 'desc';

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

  // Compare tab state
  const [showAllInvited, setShowAllInvited] = useState(false);
  const [sortField, setSortField] = useState<SortField>('overall');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [generatingSignals, setGeneratingSignals] = useState<string | null>(null);

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

        // Load invitations
        const { data: invitationsData, error: invError } = await supabase
          .from('challenge_invitations')
          .select('id, candidate_profile_id, status, created_at')
          .eq('challenge_id', challengeId)
          .eq('business_id', user.id);

        if (invError) console.error('Error loading invitations:', invError);

        // Get profile info
        const candidateProfileIds = (invitationsData || []).map(inv => inv.candidate_profile_id);
        const { data: profilesData } = candidateProfileIds.length > 0 
          ? await supabase
              .from('profiles')
              .select('id, full_name, name')
              .in('id', candidateProfileIds)
          : { data: [] };

        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        // Load submissions using invitation_ids as the primary key (more reliable than challenge_id)
        const invitationIds = (invitationsData || []).map(inv => inv.id);
        const { data: submissionsData, error: subError } = invitationIds.length > 0
          ? await supabase
              .from('challenge_submissions')
              .select('*')
              .in('invitation_id', invitationIds)
          : { data: [] };

        if (subError) console.error('Error loading submissions:', subError);

        const submissionsByInvitation = new Map((submissionsData || []).map(s => [s.invitation_id, s]));

        // Map invitations with their submissions
        const mapped: InvitationWithSubmission[] = (invitationsData || []).map(inv => {
          const profile = profilesMap.get(inv.candidate_profile_id);
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
            signalsPayload: (submission?.signals_payload as unknown as SignalsPayload) || null,
            signalsVersion: submission?.signals_version || null,
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

  // Generate signals for older submissions
  const generateSignalsFor = async (inv: InvitationWithSubmission) => {
    if (!inv.submissionId || !inv.submittedPayload) return;
    
    setGeneratingSignals(inv.invitationId);
    try {
      const signals = computeSignals(inv.submittedPayload);
      
      await supabase
        .from('challenge_submissions')
        .update({
          signals_payload: signals as any,
          signals_version: 'v1',
        })
        .eq('id', inv.submissionId);

      // Update local state
      setInvitations(prev => prev.map(i => 
        i.invitationId === inv.invitationId 
          ? { ...i, signalsPayload: signals, signalsVersion: 'v1' }
          : i
      ));

      toast({ title: t('business.compare.signals_generated') });
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setGeneratingSignals(null);
    }
  };

  // Compare tab data
  const compareData = useMemo(() => {
    let data = showAllInvited 
      ? invitations 
      : invitations.filter(i => i.submissionStatus === 'submitted');

    // Sort
    data = [...data].sort((a, b) => {
      if (sortField === 'candidateName') {
        return sortDir === 'asc' 
          ? a.candidateName.localeCompare(b.candidateName)
          : b.candidateName.localeCompare(a.candidateName);
      }
      
      const aVal = a.signalsPayload?.[sortField] ?? -1;
      const bVal = b.signalsPayload?.[sortField] ?? -1;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return data;
  }, [invitations, showAllInvited, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
    </TableHead>
  );

  const ScoreCell = ({ score }: { score: number | undefined }) => {
    if (score === undefined) return <span className="text-muted-foreground">—</span>;
    const color = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
    return <span className={`font-medium ${color}`}>{score}</span>;
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

        {/* Tabs: Responses / Compare */}
        <Tabs defaultValue="responses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="responses" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('business.responses.tab_responses')}
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('business.responses.tab_compare')}
            </TabsTrigger>
          </TabsList>

          {/* Responses Tab */}
          <TabsContent value="responses">
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
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {t('business.compare.title')}
                    </CardTitle>
                    <CardDescription>{t('business.compare.description')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="show-all" 
                      checked={showAllInvited} 
                      onCheckedChange={setShowAllInvited} 
                    />
                    <Label htmlFor="show-all" className="text-sm">
                      {t('business.compare.show_all')}
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {compareData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('business.compare.no_submissions')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortHeader field="candidateName" label={t('business.responses.col_candidate')} />
                          <SortHeader field="framing" label={t('business.compare.framing')} />
                          <SortHeader field="decision_quality" label={t('business.compare.decision')} />
                          <SortHeader field="execution_bias" label={t('business.compare.execution')} />
                          <SortHeader field="impact_thinking" label={t('business.compare.impact')} />
                          <TableHead>{t('business.compare.confidence')}</TableHead>
                          <SortHeader field="overall" label={t('business.compare.overall')} />
                          <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compareData.map((inv) => (
                          <TableRow key={inv.invitationId}>
                            <TableCell className="font-medium">{inv.candidateName}</TableCell>
                            {inv.signalsPayload ? (
                              <>
                                <TableCell><ScoreCell score={inv.signalsPayload.framing} /></TableCell>
                                <TableCell><ScoreCell score={inv.signalsPayload.decision_quality} /></TableCell>
                                <TableCell><ScoreCell score={inv.signalsPayload.execution_bias} /></TableCell>
                                <TableCell><ScoreCell score={inv.signalsPayload.impact_thinking} /></TableCell>
                                <TableCell>
                                  <Badge variant={
                                    inv.signalsPayload.confidence === 'high' ? 'default' :
                                    inv.signalsPayload.confidence === 'medium' ? 'secondary' : 'outline'
                                  }>
                                    {inv.signalsPayload.confidence}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">{inv.signalsPayload.overall}</span>
                                    <Progress value={inv.signalsPayload.overall} className="w-16 h-2" />
                                  </div>
                                </TableCell>
                              </>
                            ) : inv.submissionStatus === 'submitted' ? (
                              <TableCell colSpan={6} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-muted-foreground text-sm">{t('business.compare.not_scored')}</span>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={generatingSignals === inv.invitationId}
                                    onClick={() => generateSignalsFor(inv)}
                                  >
                                    {generatingSignals === inv.invitationId ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <Sparkles className="h-3 w-3 mr-1" />
                                    )}
                                    {t('business.compare.generate')}
                                  </Button>
                                </div>
                              </TableCell>
                            ) : (
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                {getStatusBadge(inv)}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              {(inv.submissionStatus === 'submitted' || inv.submissionStatus === 'draft') && (
                                <Button variant="ghost" size="sm" onClick={() => openDetail(inv)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
  const signals = submission.signalsPayload;

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
      {/* XIMA Signals Card */}
      {signals && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('business.compare.xima_signals')}
          </h4>
          
          {/* Scores grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-2 bg-background rounded">
              <div className="text-lg font-bold">{signals.framing}</div>
              <div className="text-xs text-muted-foreground">{t('business.compare.framing')}</div>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <div className="text-lg font-bold">{signals.decision_quality}</div>
              <div className="text-xs text-muted-foreground">{t('business.compare.decision')}</div>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <div className="text-lg font-bold">{signals.execution_bias}</div>
              <div className="text-xs text-muted-foreground">{t('business.compare.execution')}</div>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <div className="text-lg font-bold">{signals.impact_thinking}</div>
              <div className="text-xs text-muted-foreground">{t('business.compare.impact')}</div>
            </div>
          </div>

          {/* Overall + Confidence */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('business.compare.overall')}:</span>
              <span className="text-xl font-bold text-primary">{signals.overall}</span>
              <Progress value={signals.overall} className="w-24 h-2" />
            </div>
            <Badge variant={signals.confidence === 'high' ? 'default' : signals.confidence === 'medium' ? 'secondary' : 'outline'}>
              {t('business.compare.confidence')}: {signals.confidence}
            </Badge>
          </div>

          {/* Summary */}
          <p className="text-sm text-muted-foreground italic">{signals.summary}</p>

          {/* Flags */}
          {signals.flags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {signals.flags.map((flag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* XIMA signals from payload */}
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
