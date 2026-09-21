import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Chip } from '@/components/business/XsBits';
import { Button } from '@/components/ui/button';
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
import { buildChallengePayload } from '@/features/challenge-builder/saveChallenge';
import { labelForCcnl } from '@/lib/business/ccnl';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';

interface HiringGoal {
  id: string;
  role_title: string | null;
  task_description: string | null;
  experience_level: string | null;
  function_area: string | null;
  work_model: string | null;
  country: string | null;
  city_region?: string | null;
  required_skills: Json | null;
  nice_to_have_skills: Json | null;
  ral_min?: number | null;
  ral_max?: number | null;
  ccnl?: string | null;
  salary_currency?: string | null;
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
  is_fallback?: boolean;
  used_fallback?: boolean;
  mindset?: Record<string, unknown> | null;
}

const INDUSTRY_LABELS: Record<string, string> = {
  real_estate: 'Edilizia / Immobiliare',
  construction: 'Edilizia',
  technology: 'Tecnologia',
  tech: 'Tecnologia',
  software: 'Software / IT',
  automotive: 'Automotive',
  healthcare: 'Sanità',
  health: 'Sanità',
  finance: 'Finanza',
  financial_services: 'Servizi Finanziari',
  consulting: 'Consulenza',
  manufacturing: 'Manifatturiero',
  energy: 'Energia',
  retail: 'Commercio',
  education: 'Istruzione',
  logistics: 'Logistica / Trasporti',
  food: 'Alimentare',
  pharma: 'Farmaceutico',
  pharmaceutical: 'Farmaceutico',
  media: 'Media',
  hospitality: 'Hospitality / Turismo',
  legal: 'Legale',
  agriculture: 'Agricoltura',
  telecom: 'Telecomunicazioni',
  insurance: 'Assicurazioni',
  nonprofit: 'No Profit',
};

const WORK_MODEL_KEYS: Record<string, string> = { onsite: 'hiring_goal.onsite', remote: 'hiring_goal.remote', hybrid: 'hiring_goal.hybrid' };

const QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const PILLAR_IDS = ['drive', 'comp_power', 'communication', 'creativity', 'knowledge'] as const;
const SIGNAL_IDS = [1, 2, 3, 4, 5] as const;
const JOURNEY_STEPS = [1, 2, 3, 4] as const;

const normalizeLocale = (language?: string) => {
  const locale = language?.split('-')[0];
  return locale && ['en', 'it', 'es'].includes(locale) ? locale : 'it';
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
  // The introduction the candidate reads; starts from the standard text and can be adjusted.
  const [candidateIntro, setCandidateIntro] = useState<string>(() => t('challenge.xima_core.candidate_intro'));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isFallbackScenario, setIsFallbackScenario] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [generatedMindset, setGeneratedMindset] = useState<Record<string, unknown> | null>(null);

  const showNoContextWarning = noContextFlag && !goalId && !jobPostId;
  const rawIndustry = businessProfile?.manual_industry || businessProfile?.snapshot_industry || '';
  const industryKey = String(rawIndustry).toLowerCase();
  const industry = INDUSTRY_LABELS[industryKey] || rawIndustry || t('challenge.xima_core.context_fallback_industry');
  const roleTitle = hiringGoal?.role_title || listingTitle || t('challenge.xima_core.context_fallback_role');
  const displayContextTag = contextTag || t('challenge.xima_core.context_tag', { role: roleTitle, industry });
  const hasValidScenario = !!scenario.trim() && !generationError && !isFallbackScenario;
  const effectiveCandidateIntro = candidateIntro.trim() || t('challenge.xima_core.candidate_intro');
  const themes = asTextList(expectedTensions);
  const workModelLabel = hiringGoal?.work_model && WORK_MODEL_KEYS[hiringGoal.work_model] ? t(WORK_MODEL_KEYS[hiringGoal.work_model]) : hiringGoal?.work_model;
  const roleLine = [roleTitle, hiringGoal?.city_region, workModelLabel].filter(Boolean).join(' · ');
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
    let syntheticGoal: HiringGoal | null = null;
    let resolvedListingTitle: string | null = null;

    // 1) If arriving via from_listing, fetch the job_post and resolve a linked hiring goal if present.
    if (!effectiveGoalId && fromListingParam) {
      const { data: jobPost } = await supabase
        .from('job_posts')
        .select('id, title, responsibilities, requirements_must, requirements_nice, seniority, department, description, linked_hiring_goal_id')
        .eq('id', fromListingParam)
        .eq('business_id', user?.id ?? '')
        .maybeSingle();

      if (jobPost) {
        resolvedListingTitle = jobPost.title || null;
        setListingTitle(resolvedListingTitle);
        if (jobPost.linked_hiring_goal_id) {
          effectiveGoalId = jobPost.linked_hiring_goal_id;
          setGoalId(effectiveGoalId);
        } else {
          // Synthesize a HiringGoal-like object from job_post fields so generateScenario has rich context.
          syntheticGoal = {
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
          setHiringGoal(syntheticGoal);
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
        .eq('business_id', user?.id ?? '')
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
        navigate(returnTo === 'shortlist' ? `/business/hiring-goals/${effectiveGoalId}/shortlist` : `/business/candidates?fromGoal=${effectiveGoalId}`);
        return;
      }

      const { data: goalData, error: goalError } = await supabase
        .from('hiring_goal_drafts')
        .select('id, role_title, task_description, experience_level, function_area, work_model, country, city_region, required_skills, nice_to_have_skills, ral_min, ral_max, ccnl, salary_currency')
        .eq('id', effectiveGoalId)
        .eq('business_id', user?.id ?? '')
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
        .eq('user_id', user?.id ?? '')
        .maybeSingle(),
      supabase
        .from('company_profiles')
        .select('summary, summary_override, operating_style, operating_style_override, communication_style, values, values_override, pillar_vector, company_culture')
        .eq('company_id', user?.id ?? '')
        .maybeSingle(),
    ]);

    if (businessData) setBusinessProfile(businessData);
    if (companyData) setCompanyProfile(companyData);

    setLoading(false);
    generateScenario(loadedGoal || syntheticGoal, companyData, businessData, resolvedListingTitle);
  };

  const generateScenario = async (
    goalData?: HiringGoal | null,
    companyData?: CompanyProfile | null,
    businessData?: BusinessProfile | null,
    listingTitleOverride?: string | null,
  ) => {
    if (isActivated) return;

    const goal = goalData !== undefined ? goalData : hiringGoal;
    const business = businessData !== undefined ? businessData : businessProfile;
    const company = companyData !== undefined ? companyData : companyProfile;
    const effectiveListingTitle = listingTitleOverride !== undefined ? listingTitleOverride : listingTitle;

    setGenerating(true);
    setGenerationError(false);
    setIsFallbackScenario(false);
    setScenario('');
    try {
      const { data, error } = await supabase.functions.invoke<GeneratedChallengeContext>('generate-challenge', {
        body: {
          mode: 'xima_core',
          locale: normalizeLocale(i18n.language),
          business_id: user?.id ?? '',
          // Only pass a real hiring_goal_id (not a synthetic id derived from job_posts).
          hiring_goal_id: goalId || undefined,
          job_post_id: jobPostId || undefined,
          context: {
            companyIndustry: business?.manual_industry || business?.snapshot_industry || undefined,
            companySize: business?.company_size || undefined,
            decisionStyle: company?.operating_style_override || company?.operating_style || undefined,
            roleTitle: goal?.role_title || effectiveListingTitle || undefined,
            functionArea: goal?.function_area || undefined,
            experienceLevel: goal?.experience_level || undefined,
            taskDescription: goal?.task_description || undefined,
            jobPostId: jobPostId || undefined,
          },
        },
      });

      if (error) throw error;

      if (data?.scenario && !(data.is_fallback || data.used_fallback)) {
        setScenario(data.scenario);
        setBusinessType(data.business_type || '');
        setContextTag(data.context_tag || '');
        setContextSnapshot(data.context_snapshot || null);
        setEvaluationLens(data.evaluation_lens || null);
        setExpectedTensions(data.expected_tensions || null);
        setGeneratedTimeEstimate(data.estimated_time_minutes || XIMA_CORE_CHALLENGE.timeEstimateMinutes);
        setIsFallbackScenario(false);
        setGeneratedMindset(
          data.mindset && typeof data.mindset === 'object' ? (data.mindset as Record<string, unknown>) : null
        );
      } else {
        throw new Error('Scenario generation returned no valid scenario');
      }
    } catch (err) {
      log.error('Failed to generate scenario:', err);
      setScenario(t('challenge.xima_core.scenario_generation_failed'));
      setGenerationError(true);
      setIsFallbackScenario(false);
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
      effectiveCandidateIntro,
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
    if (!hasValidScenario) {
      toast({ title: t('common.error'), description: t('challenge.xima_core.generate_error'), variant: 'destructive' });
      return;
    }

    if (!startAt || !endAt) {
      toast({ title: t('common.error'), description: t('challenge_builder.dates_required'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (goalId) {
        // Type-scoped: only archive OTHER active XIMA Core rows on the same
        // goal. Custom L1 AI rows are NOT touched (XCore and Custom-AI can
        // coexist — max 1 active each per goal).
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', user?.id ?? '')
          .eq('hiring_goal_id', goalId)
          .eq('status', 'active')
          .contains('rubric', { isXimaCore: true });
      }

      const payload = buildChallengePayload({
        type: 'xima-core',
        businessId: user!.id,
        goalId: goalId || null,
        jobPostId: jobPostId || null,
        startAt,
        endAt,
        ximaCoreTitle: XIMA_CORE_CHALLENGE.title,
        description: buildChallengeDescription(),
        successCriteria: localizedQuestions.map((q) => q.title),
        timeEstimateMinutes: XIMA_CORE_CHALLENGE.timeEstimateMinutes,
        canonicalRubricCriteria: XIMA_CORE_CHALLENGE.rubric.criteria as unknown as Json,
        scenario,
        contextTag: displayContextTag,
        candidateIntro: effectiveCandidateIntro,
        questions: localizedQuestions,
        generatedTimeEstimate,
        generatedMindset,
        contextSnapshot,
        evaluationLens,
        expectedTensions,
        fallbackContext: { roleTitle, industry },
      });

      const { error } = await supabase.from('business_challenges').insert([payload as any]);

      if (error) throw error;

      setIsActivated(true);
      toast({ title: t('challenge.xima_core.activated_title'), description: t('challenge.xima_core.activated_desc') });

      if (goalId) {
        navigate(returnTo === 'shortlist' ? `/business/hiring-goals/${goalId}/shortlist?challengeCreated=1` : `/business/candidates?fromGoal=${goalId}`);
      } else {
        navigate('/business/challenges');
      }
    } catch (err: any) {
      log.error('Save error:', err);
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const backPath = goalId && returnTo === 'shortlist'
    ? `/business/hiring-goals/${goalId}/shortlist`
    : goalId ? `/business/candidates?fromGoal=${goalId}` : '/business/challenges';

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BusinessLayout>
    );
  }

  const hasPayData = !!(hiringGoal?.ral_min || hiringGoal?.ral_max || hiringGoal?.ccnl);
  const ralText = `${hiringGoal?.ral_min ? `€${hiringGoal.ral_min.toLocaleString('it-IT')}` : '—'} – ${hiringGoal?.ral_max ? `€${hiringGoal.ral_max.toLocaleString('it-IT')}` : '—'}`;

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="-ml-2 w-fit gap-2 text-muted-foreground">
          <ArrowLeft size={16} aria-hidden="true" />
          {t('common.back')}
        </Button>

        <PageHeader
          className="mb-0"
          eyebrow={t('challenge.xima_core.page_eyebrow', 'Selection tools / XIMA Core')}
          title={t('challenge.xima_core.page_title', 'Create the XIMA Core challenge')}
          subtitle={t('challenge.xima_core.page_subtitle', { role: roleTitle, defaultValue: 'Prepare the challenge for your next {{role}}.' })}
          actions={
            <>
              <Chip tone="blue">{isActivated ? t('businessPortal.challenge_status_active') : t('challenge.xima_core.status_to_activate', 'To activate')}</Chip>
              <Chip>{t('challenge.xima_core.level_1')} · {t('challenge.xima_core.standardized')}</Chip>
            </>
          }
        />

        {showNoContextWarning && (
          <div className="border-l-[3px] border-primary bg-primary/5 px-4 py-3 text-sm text-foreground">
            {t('business.challenges.context_selector.no_context.warning')}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(315px,1fr)]">
          <div className="min-w-0 space-y-6">
            {/* 01 — the context of the challenge */}
            <Panel accent id="scenario-section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Eyebrow className="!text-primary">{t('challenge.xima_core.scenario_eyebrow', '01 / The context of the challenge')}</Eyebrow>
                  <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.4px] text-foreground">{t('challenge.xima_core.scenario_heading', 'One scenario, many possibilities')}</h2>
                </div>
                <Chip>{displayContextTag}</Chip>
              </div>

              {!generating && (generationError || isFallbackScenario) && (
                <div className="mt-4 border-l-[3px] border-amber-500 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
                  {generationError ? t('challenge.xima_core.scenario_generation_failed') : t('challenge.xima_core.fallback_warning')}
                </div>
              )}

              <div className="mt-5">
                {generating || !scenario ? (
                  <div className="flex min-h-40 items-center justify-center gap-3 text-muted-foreground" aria-busy="true">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>{t('challenge.xima_core.generating')}</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[17px] leading-[1.8] text-foreground sm:text-lg">{scenario}</p>
                )}
              </div>

              {themes.length > 0 && !generating && (
                <div className="mt-5 flex flex-wrap gap-2" aria-label={t('challenge.xima_core.themes_aria', 'Themes of the scenario')}>
                  {themes.map((theme) => (
                    <span key={theme} className="rounded bg-primary/10 px-2.5 py-1 text-[13px] text-foreground">{theme}</span>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-4">
                <p className="text-[13px] text-muted-foreground">
                  {t('challenge.xima_core.scenario_subtitle', { company: businessProfile?.company_name || 'XIMA', role: roleTitle })}
                </p>
                {!isActivated && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant={!hasValidScenario ? 'default' : 'outline'} className="gap-2" disabled={generating}>
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <span aria-hidden="true">↻</span>}
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
            </Panel>

            {/* What is XIMA Core */}
            <Collapsible open={whatIsOpen} onOpenChange={setWhatIsOpen}>
              <Panel>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between gap-4 text-left">
                    <span className="text-base font-semibold text-foreground">{t('challenge.xima_core.what_is_title')}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', whatIsOpen && 'rotate-180')} aria-hidden="true" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{t('challenge.xima_core.what_is_description')}</p>
                  <div className="mt-5 flex flex-col gap-4 text-sm sm:flex-row">
                    {[1, 2, 3].map((item) => (
                      <span key={item} className="flex-1 border-l-2 border-primary/40 pl-3 text-foreground">
                        {t(`challenge.xima_core.feature_${item}`)}
                      </span>
                    ))}
                  </div>
                </CollapsibleContent>
              </Panel>
            </Collapsible>

            {/* The candidate's experience */}
            <Panel>
              <Eyebrow className="!text-primary">{t('challenge.xima_core.journey_eyebrow', 'The journey')}</Eyebrow>
              <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.4px] text-foreground">{t('challenge.xima_core.journey_title', "The candidate's experience")}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{t('challenge.xima_core.journey_subtitle', 'One common structure for a fair comparison.')}</p>
              <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {JOURNEY_STEPS.map((n) => (
                  <li key={n} className="border-t-2 border-[hsl(var(--xs-line))] pt-3.5">
                    <span className="font-mono text-[13px] text-primary">{String(n).padStart(2, '0')}</span>
                    <b className="mt-2 block text-sm text-foreground">{t(`challenge.xima_core.journey_step${n}_title`)}</b>
                    <p className="mt-1 text-[13px] text-muted-foreground">{t(`challenge.xima_core.journey_step${n}_desc`)}</p>
                  </li>
                ))}
              </ol>
            </Panel>

            {/* The observation method */}
            <Panel>
              <Eyebrow className="!text-primary">{t('challenge.xima_core.measure_eyebrow', 'The observation method')}</Eyebrow>
              <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.4px] text-foreground">{t('challenge.xima_core.measure_title', 'What it measures')}</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="border-b border-[hsl(var(--xs-line))] pb-3 text-base font-semibold text-foreground">{t('challenge.xima_core.measure_pillars_title', '5 pillars')}</h3>
                  <p className="mt-3 text-[13px] text-muted-foreground">{t('challenge.xima_core.measure_pillars_subtitle', 'Traits of professional identity.')}</p>
                  <dl className="mt-3">
                    {PILLAR_IDS.map((p) => (
                      <React.Fragment key={p}>
                        <dt className="text-sm font-semibold text-foreground">{t(`shortlist.pillar.${p}`)}</dt>
                        <dd className="mb-3 text-[13px] text-muted-foreground">{t(`challenge.xima_core.pillar_desc_${p}`)}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
                <div>
                  <h3 className="border-b border-[hsl(var(--xs-line))] pb-3 text-base font-semibold text-foreground">{t('challenge.xima_core.measure_signals_title', '5 decision signals')}</h3>
                  <p className="mt-3 text-[13px] text-muted-foreground">{t('challenge.xima_core.measure_signals_subtitle', 'Qualitative lenses, no scores shown to the candidate.')}</p>
                  <dl className="mt-3">
                    {SIGNAL_IDS.map((n) => (
                      <React.Fragment key={n}>
                        <dt className="text-sm font-semibold text-foreground">{t(`challenge.xima_core.signal_${n}_title`)}</dt>
                        <dd className="mb-3 text-[13px] text-muted-foreground">{t(`challenge.xima_core.signal_${n}_desc`)}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              </div>
            </Panel>

            <div className="border-l-[3px] border-primary bg-primary/5 px-4 py-3.5 text-sm">
              <strong className="text-foreground">{t('challenge.xima_core.blind_title', 'Blind evaluation')}</strong>
              <p className="mt-1 text-muted-foreground">{t('challenge.xima_core.blind_desc')}</p>
            </div>
          </div>

          {/* 02 — configuration */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Panel id="config-section">
              <Eyebrow className="!text-primary">{t('challenge.xima_core.config_eyebrow', '02 / Configuration')}</Eyebrow>
              <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.4px] text-foreground">{t('challenge.xima_core.config_heading', 'Timing and introduction')}</h2>

              <div className="mt-5 flex gap-6 border-b border-[hsl(var(--xs-line))] pb-4">
                <div>
                  <strong className="block text-[26px] font-semibold leading-tight text-foreground">
                    {generatedTimeEstimate || XIMA_CORE_CHALLENGE.timeEstimateMinutes} <small className="text-sm font-normal">min</small>
                  </strong>
                  <span className="text-[13px] text-muted-foreground">{t('challenge.xima_core.time_estimate')}</span>
                </div>
                <div>
                  <strong className="block text-[26px] font-semibold leading-tight text-foreground">{t('challenge.xima_core.level_1')}</strong>
                  <span className="text-[13px] text-muted-foreground">{t('challenge.xima_core.standardized_structure', 'Standardised structure')}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="xima-core-start">{t('challenge.xima_core.start_date')}</Label>
                  <Input id="xima-core-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} disabled={isActivated} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xima-core-end">{t('challenge.xima_core.end_date')}</Label>
                  <Input id="xima-core-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} disabled={isActivated} />
                </div>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">{t('challenge.xima_core.duration_note', 'The estimated duration is not the availability window.')}</p>

              <div className="mt-5 space-y-2">
                <Label htmlFor="xima-core-intro">{t('challenge.xima_core.candidate_intro_title')}</Label>
                <Textarea
                  id="xima-core-intro"
                  value={candidateIntro}
                  onChange={(e) => setCandidateIntro(e.target.value)}
                  disabled={isActivated}
                  rows={5}
                  className="min-h-[120px] resize-y text-sm leading-6"
                />
              </div>

              <div className="mt-5 border-l-[3px] border-primary bg-primary/5 px-4 py-3.5 text-sm">
                <strong className="text-foreground">{t('businessPortal.hiring_goal.pay_transparency.title', 'Pay transparency')}</strong>
                {hasPayData ? (
                  <p className="mt-1 text-foreground">
                    {t('businessPortal.hiring_goal.gross_salary.ral_label', 'RAL')}: <b>{ralText}</b>
                    <br />
                    {t('businessPortal.hiring_goal.pay_transparency.ccnl_label', 'CCNL')}: {labelForCcnl(hiringGoal?.ccnl)}
                  </p>
                ) : (
                  <p className="mt-1 text-amber-700 dark:text-amber-400">
                    {t('challenge.xima_core.pay_missing', 'RAL or CCNL is missing on the hiring goal.')}{' '}
                    {goalId && (
                      <button
                        type="button"
                        onClick={() => navigate(`/business/hiring-goals/${goalId}/settings`)}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {t('challenge.xima_core.pay_edit_goal', 'Edit the goal')}
                      </button>
                    )}
                  </p>
                )}
              </div>

              <p className="mt-4 text-[13px] text-muted-foreground">{roleLine}</p>
            </Panel>
          </aside>
        </div>

        {/* Action bar: the one glass surface of the page */}
        <div className="xs-glass sticky bottom-4 z-10 flex flex-col gap-3 !px-5 !py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[430px] text-[13px] text-muted-foreground">{t('challenge.xima_core.scenario_locked_note')}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setPreviewOpen(true)}
              disabled={generating || !hasValidScenario}
            >
              {t('challenge.xima_core.preview_button')}
            </Button>
            <Button onClick={handleActivate} disabled={saving || generating || !hasValidScenario || !startAt || !endAt || isActivated} className="flex-1 gap-2 sm:flex-none">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t('challenge.xima_core.activate_button')}
            </Button>
          </div>
        </div>
      </div>

      {/* Candidate preview modal — read-only view of what the candidate will see */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <Eyebrow>{t('challenge.xima_core.preview_title')}</Eyebrow>
            <DialogTitle className="text-2xl">{roleTitle}</DialogTitle>
            <DialogDescription>
              {industry} · {t('challenge.xima_core.level_1')} · {t('challenge.xima_core.time_estimate_value', { minutes: generatedTimeEstimate || XIMA_CORE_CHALLENGE.timeEstimateMinutes })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <p className="text-xs text-muted-foreground">{t('challenge.xima_core.preview_badge')}</p>
            <p className="leading-6 text-foreground">{effectiveCandidateIntro}</p>

            <div className="rounded-md bg-[hsl(var(--xs-page))] p-3 italic leading-6 text-foreground">
              {(generatedMindset as any)?.guide?.intro || t('challenge.xima_core.preview_aria_default', "Hi, I'm Aria. There are no right answers — follow your instinct and I'll be with you.")}
            </div>

            <ol className="grid grid-cols-2 gap-2 border-t border-[hsl(var(--xs-line))] pt-4 sm:grid-cols-4">
              {JOURNEY_STEPS.map((n) => (
                <li key={n} className="border-t-2 border-[hsl(var(--xs-line))] pt-2">
                  <span className="font-mono text-xs text-primary">{String(n).padStart(2, '0')}</span>
                  <p className="text-sm font-semibold text-foreground">{t(`challenge.xima_core.journey_step${n}_title`)}</p>
                  <p className="text-[11px] text-muted-foreground">{t(`challenge.xima_core.journey_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            {Array.isArray((generatedMindset as any)?.instinct_cards) && (generatedMindset as any).instinct_cards.length > 0 && (
              <div className="space-y-3 border-t border-[hsl(var(--xs-line))] pt-4">
                <Eyebrow>{t('challenge.xima_core.preview_example_card', 'Example · first instinct card')}</Eyebrow>
                <div className="space-y-2 rounded-lg border border-[hsl(var(--xs-line))] p-4">
                  <p className="text-foreground">{(generatedMindset as any).instinct_cards[0]?.prompt}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-[hsl(var(--xs-page))] p-2">A · {(generatedMindset as any).instinct_cards[0]?.a?.label}</div>
                    <div className="rounded-md bg-[hsl(var(--xs-page))] p-2">B · {(generatedMindset as any).instinct_cards[0]?.b?.label}</div>
                  </div>
                </div>
              </div>
            )}

            {hasPayData && (
              <p className="text-xs text-muted-foreground">
                {t('businessPortal.hiring_goal.gross_salary.ral_label', 'RAL')} {ralText} · {labelForCcnl(hiringGoal?.ccnl)}
              </p>
            )}

            <div className="border-l-[3px] border-primary bg-primary/5 px-4 py-3 text-foreground">
              {t('challenge.xima_core.feature_3')}
            </div>

            <Button disabled className="w-full">
              {t('challenge.xima_core.preview_submit_disabled')}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {t('challenge.xima_core.preview_close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessLayout>
  );
};

export default CreateXimaCoreChallenge;
