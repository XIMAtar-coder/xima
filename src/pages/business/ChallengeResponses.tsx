import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, Clock, FileText, Loader2, BarChart3, ArrowUpDown, Sparkles, Bug, Star, MessageSquare, XCircle, AlertCircle, Filter } from 'lucide-react';
import { getChallengeTimeInfo } from '@/utils/challengeTimeUtils';
import { GoalContextHeader } from '@/components/business/GoalContextHeader';
import { SubmissionDetailDrawer } from '@/components/business/SubmissionDetailDrawer';
import { computeSignals, SignalsPayload } from '@/lib/signals/computeSignals';
import type { HiringGoal } from '@/hooks/useHiringGoals';
import { useChallengeResponsesData, InvitationWithSubmission, ReviewDecision } from '@/hooks/useChallengeResponsesData';

interface ChallengeInfo {
  id: string;
  title: string;
  description: string | null;
  successCriteria: string[];
  startAt: string | null;
  endAt: string | null;
  status: string;
}

type SortField = 'overall' | 'framing' | 'decision_quality' | 'execution_bias' | 'impact_thinking' | 'candidateName';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'needs_decision' | 'shortlisted' | 'followup' | 'passed' | 'pending';

const isDev = import.meta.env.DEV;

// Priority order for sorting: submitted+no decision first, then shortlisted, followup, pending, passed last
const getDecisionPriority = (inv: InvitationWithSubmission): number => {
  if (inv.submissionStatus !== 'submitted') {
    // Pending/draft items
    return 4;
  }
  // Submitted items
  switch (inv.reviewDecision) {
    case null: return 0; // Needs decision - highest priority
    case 'shortlist': return 1;
    case 'followup': return 2;
    case 'pass': return 5; // Always last
    default: return 3;
  }
};

export default function ChallengeResponses() {
  const { goalId, challengeId } = useParams<{ goalId: string; challengeId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [allGoals, setAllGoals] = useState<HiringGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<HiringGoal | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<InvitationWithSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Compare tab state
  const [showAllInvited, setShowAllInvited] = useState(false);
  const [sortField, setSortField] = useState<SortField>('overall');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [generatingSignals, setGeneratingSignals] = useState<string | null>(null);

  // Use the shared hook for invitation-driven data
  const { rows: invitations, stats, loading: responsesLoading, refetch, updateRowDecision, debug } = useChallengeResponsesData(userId, challengeId);

  const loading = challengeLoading || responsesLoading;

  useEffect(() => {
    async function loadChallengeData() {
      if (!challengeId || !goalId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/business/login');
          return;
        }

        setUserId(user.id);

        // Load challenge info only (responses come from the hook)
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

      } catch (error) {
        console.error('Error loading challenge data:', error);
        toast({ title: t('common.error'), variant: 'destructive' });
      } finally {
        setChallengeLoading(false);
      }
    }

    loadChallengeData();
  }, [challengeId, goalId, navigate, t]);

  const timeInfo = challenge ? getChallengeTimeInfo(challenge.startAt, challenge.endAt, challenge.status) : null;

  // Filter and sort invitations for the Responses tab
  const filteredAndSortedInvitations = useMemo(() => {
    let data = [...invitations];

    // Apply filter
    switch (activeFilter) {
      case 'needs_decision':
        data = data.filter(inv => inv.submissionStatus === 'submitted' && inv.reviewDecision === null);
        break;
      case 'shortlisted':
        data = data.filter(inv => inv.reviewDecision === 'shortlist');
        break;
      case 'followup':
        data = data.filter(inv => inv.reviewDecision === 'followup');
        break;
      case 'passed':
        data = data.filter(inv => inv.reviewDecision === 'pass');
        break;
      case 'pending':
        data = data.filter(inv => inv.submissionStatus === null || inv.submissionStatus === 'draft');
        break;
    }

    // Default sort: decision priority (needs decision first, passed last)
    data.sort((a, b) => getDecisionPriority(a) - getDecisionPriority(b));

    return data;
  }, [invitations, activeFilter]);

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

  const getDecisionBadge = (inv: InvitationWithSubmission) => {
    if (inv.submissionStatus !== 'submitted') return null;
    
    switch (inv.reviewDecision) {
      case 'shortlist':
        return <Badge className="bg-green-600"><Star className="h-3 w-3 mr-1" />{t('business.review.shortlisted')}</Badge>;
      case 'followup':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><MessageSquare className="h-3 w-3 mr-1" />{t('business.review.followup_pending')}</Badge>;
      case 'pass':
        return <Badge variant="secondary" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />{t('business.review.passed')}</Badge>;
      default:
        return <Badge variant="outline" className="border-orange-400 text-orange-500"><AlertCircle className="h-3 w-3 mr-1" />{t('business.review.needs_decision')}</Badge>;
    }
  };

  const openDetail = (inv: InvitationWithSubmission) => {
    setSelectedSubmission(inv);
    setDrawerOpen(true);
  };

  // Callback when review is saved in drawer - optimistically update
  const handleReviewSaved = useCallback((decision: ReviewDecision, followupQuestion?: string | null) => {
    if (selectedSubmission) {
      updateRowDecision(selectedSubmission.invitationId, decision, followupQuestion);
      // Also update the selected submission locally
      setSelectedSubmission(prev => prev ? { ...prev, reviewDecision: decision, reviewFollowupQuestion: followupQuestion ?? prev.reviewFollowupQuestion } : prev);
    }
  }, [selectedSubmission, updateRowDecision]);

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

      // Refetch from shared hook to update local state
      await refetch();

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

  // Filter chip component
  const FilterChip = ({ filter, label, count }: { filter: FilterType; label: string; count?: number }) => (
    <Button
      variant={activeFilter === filter ? 'default' : 'outline'}
      size="sm"
      onClick={() => setActiveFilter(filter)}
      className="h-7 text-xs"
    >
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
    </Button>
  );

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
              <div className="text-2xl font-bold text-green-600">{stats.responses}</div>
              <div className="text-sm text-muted-foreground">{t('business.responses.stat_submitted')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.drafts}</div>
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

        {/* DEV Debug Panel */}
        {isDev && (
          <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-xs font-mono text-yellow-600">
                <Bug className="h-3 w-3" />
                <span>DEV: invitations={debug.invitationIds.length > 0 ? debug.invitationIds.slice(0, 3).join(', ') + '...' : 'none'}</span>
                <span>| submissions={debug.submissionInvitationIds.length > 0 ? debug.submissionInvitationIds.slice(0, 3).join(', ') + '...' : 'none'}</span>
                <span>| invited={stats.invited} responses={stats.responses}</span>
              </div>
            </CardContent>
          </Card>
        )}

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
                <div className="flex flex-col gap-4">
                  <CardTitle className="text-lg">{t('business.responses.table_title')}</CardTitle>
                  
                  {/* Filter Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <FilterChip filter="all" label={t('business.filter.all')} count={stats.invited} />
                    <FilterChip filter="needs_decision" label={t('business.filter.needs_decision')} count={stats.needsDecision} />
                    <FilterChip filter="shortlisted" label={t('business.filter.shortlisted')} count={stats.shortlisted} />
                    <FilterChip filter="followup" label={t('business.filter.followup')} count={stats.followup} />
                    <FilterChip filter="passed" label={t('business.filter.passed')} count={stats.passed} />
                    <FilterChip filter="pending" label={t('business.filter.pending')} count={stats.pending + stats.drafts} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAndSortedInvitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{activeFilter === 'all' ? t('business.responses.no_invitations') : t('business.filter.no_results')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('business.responses.col_candidate')}</TableHead>
                        <TableHead>{t('business.responses.col_status')}</TableHead>
                        <TableHead>{t('business.review.decision')}</TableHead>
                        <TableHead>{t('business.responses.col_submitted_at')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedInvitations.map((inv) => {
                        const isClickable = inv.submissionStatus === 'submitted' || inv.submissionStatus === 'draft';
                        return (
                          <TableRow 
                            key={inv.invitationId}
                            className={isClickable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
                            onClick={isClickable ? () => openDetail(inv) : undefined}
                          >
                            <TableCell className="font-medium">{inv.candidateName}</TableCell>
                            <TableCell>{getStatusBadge(inv)}</TableCell>
                            <TableCell>{getDecisionBadge(inv)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {inv.submittedAt ? new Date(inv.submittedAt).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              {inv.submissionStatus === 'submitted' ? (
                                <Button size="sm" onClick={() => openDetail(inv)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('business.responses.view_submission')}
                                </Button>
                              ) : inv.submissionStatus === 'draft' ? (
                                <Button variant="ghost" size="sm" onClick={() => openDetail(inv)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('business.responses.view')}
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

        {/* Submission Detail Drawer */}
        <SubmissionDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          submission={selectedSubmission}
          challenge={challenge}
          businessId={userId || ''}
          challengeId={challengeId || ''}
          onSignalsGenerated={refetch}
          onReviewSaved={handleReviewSaved}
        />
      </div>
    </BusinessLayout>
  );
}

