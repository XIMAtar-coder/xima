import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { XIMA_CORE_CHALLENGE } from '@/lib/challenges/ximaCoreChallenge';
import {
  ArrowLeft,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Loader2,
  Lock,
  Rocket,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';

interface HiringGoal {
  id: string;
  role_title: string | null;
  task_description: string | null;
  experience_level: string | null;
  function_area: string | null;
  work_model: string | null;
  country: string | null;
  required_skills: Json | null;
  nice_to_have_skills: Json | null;
}

interface CompanyProfile {
  summary: string | null;
  summary_override: string | null;
  operating_style: string | null;
  operating_style_override: string | null;
  communication_style: string | null;
  values: string[] | null;
  values_override: Json | null;
  pillar_vector: Json | null;
  company_culture: string | null;
}

interface BusinessProfile {
  company_name: string;
  manual_industry: string | null;
  snapshot_industry: string | null;
  company_size: string | null;
  team_culture: string | null;
  hiring_approach: string | null;
}

interface GeneratedChallengeContext {
  scenario: string;
  business_type?: string;
  context_tag?: string;
  context_snapshot?: Json;
  evaluation_lens?: Json;
  expected_tensions?: Json;
  estimated_time_minutes?: number;
}

const QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

const normalizeLocale = (language?: string) => {
  const locale = language?.split('-')[0];
  return locale && ['en', 'it', 'es'].includes(locale) ? locale : 'en';
};

const asTextList = (value: Json | string[] | null | undefined): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
};

const CreateXimaCoreChallenge = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goalIdParam = searchParams.get('goal');
  const fromListingParam = searchParams.get('from_listing');
  const noContextFlag = searchParams.get('no_context') === '1';
  const returnTo = searchParams.get('returnTo');
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  // Effective goalId may resolve from job_posts.linked_hiring_goal_id when arriving via from_listing.
  const [goalId, setGoalId] = useState<string | null>(goalIdParam);
  const [jobPostId, setJobPostId] = useState<string | null>(fromListingParam);
  const [listingTitle, setListingTitle] = useState<string | null>(null);

  const [hiringGoal, setHiringGoal] = useState<HiringGoal | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [whatIsOpen, setWhatIsOpen] = useState(true);

  const [scenario, setScenario] = useState<string>('');
  const [businessType, setBusinessType] = useState('');
  const [contextTag, setContextTag] = useState('');
  const [contextSnapshot, setContextSnapshot] = useState<Json | null>(null);
  const [evaluationLens, setEvaluationLens] = useState<Json | null>(null);
  const [expectedTensions, setExpectedTensions] = useState<Json | null>(null);
  const [generatedTimeEstimate, setGeneratedTimeEstimate] = useState<number>(XIMA_CORE_CHALLENGE.timeEstimateMinutes);
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const showNoContextWarning = noContextFlag && !goalId && !jobPostId;
  const industry = businessProfile?.manual_industry || businessProfile?.snapshot_industry || t('challenge.xima_core.context_fallback_industry');
  const roleTitle = hiringGoal?.role_title || listingTitle || t('challenge.xima_core.context_fallback_role');
  const displayContextTag = contextTag || t('challenge.xima_core.context_tag', { role: roleTitle, industry });
  const localizedQuestions = useMemo(
    () => QUESTION_IDS.map((id) => ({
      id,
      title: t(`challenge.xima_core.questions.${id}_title`),
      text: t(`challenge.xima_core.questions.${id}_text`),
    })),
    [t, i18n.language]
  );

  useEffect(() => {
    if (!startAt) {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setStartAt(now.toISOString().slice(0, 16));
      setEndAt(weekFromNow.toISOString().slice(0, 16));
    }
  }, [startAt]);

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading && user?.id) {
      loadData();
    }
  }, [goalIdParam, fromListingParam, user?.id, isAuthenticated, isBusiness, businessLoading, navigate]);

  const loadData = async () => {
    let effectiveGoalId: string | null = goalIdParam;

    // 1) If arriving via from_listing, fetch the job_post and resolve a linked hiring goal if present.
    if (!effectiveGoalId && fromListingParam) {
      const { data: jobPost } = await supabase
        .from('job_posts')
        .select('id, title, responsibilities, requirements_must, requirements_nice, seniority, department, description, linked_hiring_goal_id')
        .eq('id', fromListingParam)
        .eq('business_id', user?.id)
        .maybeSingle();

      if (jobPost) {
        setListingTitle(jobPost.title || null);
        if (jobPost.linked_hiring_goal_id) {
          effectiveGoalId = jobPost.linked_hiring_goal_id;
          setGoalId(effectiveGoalId);
        } else {
          // Synthesize a HiringGoal-like object from job_post fields so generateScenario has rich context.
          const synthetic: HiringGoal = {
            id: jobPost.id,
            role_title: jobPost.title || null,
            task_description: jobPost.responsibilities || jobPost.description || null,
            experience_level: jobPost.seniority || null,
            function_area: jobPost.department || null,
            work_model: null,
            country: null,
            required_skills: jobPost.requirements_must as Json,
            nice_to_have_skills: jobPost.requirements_nice as Json,
          };
          setHiringGoal(synthetic);
        }
        setJobPostId(jobPost.id);
      }
    }

    // 2) If we have an effective hiring goal, check for existing XIMA Core and load it.
    let loadedGoal: HiringGoal | null = null;
    if (effectiveGoalId) {
      const { data: existingCore } = await supabase
        .from('business_challenges')
        .select('id')
        .eq('business_id', user?.id)
        .eq('hiring_goal_id', effectiveGoalId)
        .eq('status', 'active')
        .contains('rubric', { isXimaCore: true })
        .maybeSingle();

      if (existingCore) {
        toast({
          title: t('challenge.xima_core.already_active_title'),
          description: t('challenge.xima_core.already_active_desc'),
          variant: 'destructive',
        });
        navigate(returnTo === 'shortlist' ? `/business/goals/${effectiveGoalId}/shortlist` : `/business/candidates?fromGoal=${effectiveGoalId}`);
        return;
      }

      const { data: goalData, error: goalError } = await supabase
        .from('hiring_goal_drafts')
        .select('id, role_title, task_description, experience_level, function_area, work_model, country, required_skills, nice_to_have_skills')
        .eq('id', effectiveGoalId)
        .eq('business_id', user?.id)
        .single();

      if (goalError || !goalData) {
        // If we came from a listing and the linked goal lookup failed, fall through using the synthetic profile.
        if (!fromListingParam) {
          toast({ title: t('common.error'), description: t('challenge.xima_core.goal_not_found'), variant: 'destructive' });
          navigate('/business/dashboard');
          return;
        }
      } else {
        loadedGoal = goalData;
        setHiringGoal(goalData);
      }
    }

    const [{ data: businessData }, { data: companyData }] = await Promise.all([
      supabase
        .from('business_profiles')
        .select('company_name, manual_industry, snapshot_industry, company_size, team_culture, hiring_approach')
        .eq('user_id', user?.id)
        .maybeSingle(),
      supabase
        .from('company_profiles')
        .select('summary, summary_override, operating_style, operating_style_override, communication_style, values, values_override, pillar_vector, company_culture')
        .eq('company_id', user?.id)
        .maybeSingle(),
    ]);

    if (businessData) setBusinessProfile(businessData);
    if (companyData) setCompanyProfile(companyData);

    setLoading(false);
    generateScenario(loadedGoal || (effectiveGoalId ? null : hiringGoal), companyData, businessData);
  };

  const generateScenario = async (
    goalData?: HiringGoal | null,
    companyData?: CompanyProfile | null,
    businessData?: BusinessProfile | null,
  ) => {
    if (isActivated) return;

    const goal = goalData !== undefined ? goalData : hiringGoal;
    const business = businessData !== undefined ? businessData : businessProfile;
    const company = companyData !== undefined ? companyData : companyProfile;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke<GeneratedChallengeContext>('generate-challenge', {
        body: {
          mode: 'xima_core',
          locale: normalizeLocale(i18n.language),
          business_id: user?.id,
          // Only pass a real hiring_goal_id (not a synthetic id derived from job_posts).
          hiring_goal_id: goalId || undefined,
          job_post_id: jobPostId || undefined,
          context: {
            companyIndustry: business?.manual_industry || business?.snapshot_industry || undefined,
            companySize: business?.company_size || undefined,
            decisionStyle: company?.operating_style_override || company?.operating_style || undefined,
            roleTitle: goal?.role_title || listingTitle || undefined,
            functionArea: goal?.function_area || undefined,
            experienceLevel: goal?.experience_level || undefined,
            taskDescription: goal?.task_description || undefined,
            jobPostId: jobPostId || undefined,
          },
        },
      });

      if (error) throw error;

      if (data?.scenario) {
        setScenario(data.scenario);
        setBusinessType(data.business_type || '');
        setContextTag(data.context_tag || '');
        setContextSnapshot(data.context_snapshot || null);
        setEvaluationLens(data.evaluation_lens || null);
        setExpectedTensions(data.expected_tensions || null);
        setGeneratedTimeEstimate(data.estimated_time_minutes || XIMA_CORE_CHALLENGE.timeEstimateMinutes);
      }
    } catch (err) {
      console.error('Failed to generate scenario:', err);
      toast({
        title: t('common.error'),
        description: t('challenge.xima_core.generate_error'),
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const buildChallengeDescription = (): string => {
    const parts = [
      t('challenge.xima_core.candidate_intro'),
      '',
      '---',
      '',
      `**${t('challenge.xima_core.scenario_label')}:**`,
      scenario,
      '',
      '---',
      '',
      `**${t('challenge.xima_core.questions_title')}:**`,
      '',
      ...localizedQuestions.map((q, idx) => `${idx + 1}. **${q.title}**\n${q.text}`),
    ];
    return parts.join('\n');
  };

  const handleActivate = async () => {
    if (!startAt || !endAt) {
      toast({ title: t('common.error'), description: t('challenge_builder.dates_required'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (goalId) {
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId)
          .eq('status', 'active');
      }

      const { error } = await supabase.from('business_challenges').insert([{
        title: XIMA_CORE_CHALLENGE.title,
        description: buildChallengeDescription(),
        success_criteria: localizedQuestions.map((q) => q.title),
        time_estimate_minutes: XIMA_CORE_CHALLENGE.timeEstimateMinutes,
        rubric: {
          criteria: XIMA_CORE_CHALLENGE.rubric.criteria,
          scenario,
          level: 1,
          isXimaCore: true,
          context_tag: displayContextTag,
          candidate_intro: t('challenge.xima_core.candidate_intro'),
        },
        config_json: {
          xima_core: true,
          questions: localizedQuestions,
          candidate_intro: t('challenge.xima_core.candidate_intro'),
          generated_time_estimate: generatedTimeEstimate,
          context_tag: displayContextTag,
        },
        context_snapshot: (contextSnapshot || {
          role_title: roleTitle,
          industry,
          context_tag: displayContextTag,
          generated_at: new Date().toISOString(),
        }) as Json,
        evaluation_lens: evaluationLens,
        expected_tensions: expectedTensions,
        status: 'active',
        business_id: user?.id,
        hiring_goal_id: goalId || null,
        job_post_id: jobPostId || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        difficulty: 1,
        level: 1,
      }]);

      if (error) throw error;

      setIsActivated(true);
      toast({ title: t('challenge.xima_core.activated_title'), description: t('challenge.xima_core.activated_desc') });

      if (goalId) {
        navigate(returnTo === 'shortlist' ? `/business/goals/${goalId}/shortlist?challengeCreated=1` : `/business/candidates?fromGoal=${goalId}`);
      } else {
        navigate('/business/challenges');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <main className="mx-auto flex max-w-4xl flex-col gap-6 pb-32">
        <Button
          variant="ghost"
          onClick={() => navigate(goalId && returnTo === 'shortlist' ? `/business/goals/${goalId}/shortlist` : goalId ? `/business/candidates?fromGoal=${goalId}` : '/business/challenges')}
          className="w-fit gap-2 -ml-2"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </Button>

        <header className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-normal text-foreground">{t('challenge.xima_core.title')}</h1>
                <Badge variant="secondary">{t('challenge.xima_core.level_1')}</Badge>
                <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />{t('challenge.xima_core.standardized')}</Badge>
                <Badge variant="outline">{displayContextTag}</Badge>
              </div>
              <p className="max-w-2xl text-base text-muted-foreground">{t('challenge.xima_core.subtitle')}</p>
              {hiringGoal?.role_title && <Badge className="rounded-full px-3 py-1">{hiringGoal.role_title}</Badge>}
            </div>
          </div>
        </header>

        {showNoContextWarning && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-foreground">
                {t('business.challenges.context_selector.no_context.warning')}
              </p>
            </CardContent>
          </Card>
        )}

        <Collapsible open={whatIsOpen} onOpenChange={setWhatIsOpen}>
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer pb-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5 text-primary" />
                    {t('challenge.xima_core.what_is_title')}
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${whatIsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-5 pt-0">
                <p className="text-sm leading-6 text-muted-foreground">{t('challenge.xima_core.what_is_description')}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 p-3 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{t(`challenge.xima_core.feature_${item}`)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <section className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('challenge.xima_core.scenario_title')}
              </h2>
              <Badge variant="outline">{displayContextTag}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('challenge.xima_core.scenario_subtitle', { company: businessProfile?.company_name || 'XIMA', role: roleTitle })}
            </p>
          </div>

          <Card className="border-l-4 border-l-primary bg-card shadow-sm">
            <CardContent className="p-6">
              {generating || !scenario ? (
                <div className="flex min-h-40 items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('challenge.xima_core.generating')}</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-[17px] leading-8 text-foreground">{scenario}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('challenge.xima_core.scenario_locked_note')}</p>
            {!isActivated && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {t('challenge.xima_core.scenario_regenerate')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('challenge.xima_core.scenario_regenerate')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('challenge.xima_core.scenario_regenerate_confirm')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => generateScenario()}>{t('common.confirm')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                {t('challenge.xima_core.questions_title')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('challenge.xima_core.questions_subtitle')}</p>
            </div>
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />{t('challenge.xima_core.questions_fixed_badge')}</Badge>
          </div>

          <div className="space-y-3">
            {localizedQuestions.map((question, idx) => (
              <Card key={question.id} className="border-l-2 border-l-primary/70 bg-card/80 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{question.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{question.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">{t('challenge.xima_core.config_title')}</h2>
          <Card className="bg-card/80 shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('challenge.xima_core.time_estimate')}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {t('challenge.xima_core.time_estimate_value', { minutes: XIMA_CORE_CHALLENGE.timeEstimateMinutes })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {t('challenge.xima_core.time_window')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="xima-core-start">{t('challenge.xima_core.start_date')}</Label>
                    <Input id="xima-core-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xima-core-end">{t('challenge.xima_core.end_date')}</Label>
                    <Input id="xima-core-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">{t('challenge.xima_core.candidate_intro_title')}</h3>
                <div className="rounded-lg border border-border/70 bg-secondary/30 p-4">
                  <p className="text-sm italic leading-6 text-foreground">{t('challenge.xima_core.candidate_intro')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('challenge.xima_core.scenario_locked_note')}</p>
          <Button onClick={handleActivate} disabled={saving || generating || !scenario.trim() || !startAt || !endAt} className="gap-2" size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {t('challenge.xima_core.activate_button')}
          </Button>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default CreateXimaCoreChallenge;
