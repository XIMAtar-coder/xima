import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileDown, Info, ChevronDown, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import SuggestFieldButton from '@/components/business/SuggestFieldButton';
import { CCNL_OPTIONS, CCNL_HELPER_IT, defaultPayMonths } from '@/lib/business/ccnl';
import { log } from '@/lib/log';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import {
  clearGoalDraft,
  countryCodeFromProfile,
  deriveRal,
  loadGoalDraft,
  saveGoalDraft,
  type StoredGoalDraft,
} from '@/lib/business/hiringGoalDraft';


const TOTAL_STEPS = 5;

interface FormData {
  role_title: string;
  task_description: string;
  responsibilities: string[];
  required_skills: string[];
  nice_to_have_skills: string[];
  experience_level: string;
  work_model: string;
  country: string;
  city_region: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  salary_period: string;
  ral_min: number;
  ral_max: number;
  ccnl: string;
  /** Monthly payments per year chosen by the business; null = from the CCNL/country. */
  pay_months: number | null;
  years_experience_min: number | null;
  years_experience_max: number | null;
  education_level: string;
  languages: { language: string; level: string }[];
  original_seniority: string;
  imported_from_listing_id: string | null;
  ai_suggested_ximatar: string | null;
  xima_hr_requested: boolean;
}

const collapseToExperienceLevel = (seniority: string): string => {
  switch (seniority?.toLowerCase()) {
    case 'entry': case 'junior': case 'internship': return 'first_time';
    case 'mid': case 'mid-level': return 'independent';
    case 'senior': case 'lead': case 'principal': case 'staff': case 'executive': return 'led_others';
    default: return 'independent';
  }
};

const SENIORITY_DISPLAY: Record<string, string> = {
  first_time: 'Prima esperienza',
  independent: 'Autonomo',
  led_others: 'Ha guidato altri',
};

const HiringGoalCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { goalId } = useParams<{ goalId: string }>();
  const isEditMode = !!goalId;
  const fromListingId = searchParams.get('from_listing');
  
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [importedListing, setImportedListing] = useState<any>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [userId, setUserId] = useState('');
  const [editLoading, setEditLoading] = useState(isEditMode);

  const [formData, setFormData] = useState<FormData>({
    role_title: '',
    task_description: '',
    responsibilities: [],
    required_skills: [],
    nice_to_have_skills: [],
    experience_level: '',
    work_model: '',
    country: '',
    city_region: '',
    salary_min: 0,
    salary_max: 0,
    salary_currency: 'EUR',
    salary_period: 'yearly',
    ral_min: 0,
    ral_max: 0,
    ccnl: '',
    pay_months: null,
    years_experience_min: null,
    years_experience_max: null,
    education_level: '',
    languages: [],
    original_seniority: '',
    imported_from_listing_id: null,
    ai_suggested_ximatar: null,
    xima_hr_requested: false,
  });

  const updateField = (field: keyof FormData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  // Draft persistence only applies to a brand-new goal typed by hand: edit mode
  // saves to the DB, and an imported listing is its own source of truth.
  const draftEnabled = !isEditMode && !fromListingId;
  // null = not decided yet (no autosave until then, so an empty form never
  // overwrites a stored draft before the user chooses).
  const [draftDecided, setDraftDecided] = useState(!draftEnabled);
  const [pendingDraft, setPendingDraft] = useState<StoredGoalDraft<FormData> | null>(null);
  const { businessProfile } = useBusinessProfile();
  const locationPrefilled = useRef(false);

  // Load user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Offer to resume a stored draft.
  useEffect(() => {
    if (!draftEnabled || !userId || draftDecided) return;
    const stored = loadGoalDraft<FormData>(userId);
    if (stored && (stored.formData.role_title?.trim() || stored.step > 0)) {
      setPendingDraft(stored);
    } else {
      setDraftDecided(true);
    }
  }, [draftEnabled, userId, draftDecided]);

  const resumeDraft = () => {
    if (pendingDraft) {
      setFormData(prev => ({ ...prev, ...pendingDraft.formData }));
      setStep(Math.min(Math.max(pendingDraft.step, 0), TOTAL_STEPS - 1));
    }
    setPendingDraft(null);
    setDraftDecided(true);
  };

  const startOver = () => {
    clearGoalDraft(userId);
    setPendingDraft(null);
    setDraftDecided(true);
  };

  // Autosave (debounced) once the user has decided about any previous draft.
  useEffect(() => {
    if (!draftEnabled || !draftDecided || !userId) return;
    if (!formData.role_title.trim() && step === 0) return;
    const handle = window.setTimeout(() => saveGoalDraft(userId, step, formData), 400);
    return () => window.clearTimeout(handle);
  }, [draftEnabled, draftDecided, userId, step, formData]);

  // Prefill location from the company profile when the user has not set one.
  useEffect(() => {
    if (isEditMode || !draftDecided || !businessProfile || locationPrefilled.current) return;
    locationPrefilled.current = true;
    const profileCountry = countryCodeFromProfile(businessProfile.manual_hq_country || businessProfile.snapshot_hq_country);
    const profileCity = (businessProfile.manual_hq_city || businessProfile.snapshot_hq_city || '').trim();
    setFormData(prev => ({
      ...prev,
      country: prev.country || profileCountry,
      city_region: prev.city_region || profileCity,
    }));
  }, [isEditMode, draftDecided, businessProfile]);

  // Pre-fill from ?from_listing=<id> (only in "new" mode)
  useEffect(() => {
    if (isEditMode) return;
    if (!fromListingId) return;
    const load = async () => {
      const { data: jp, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', fromListingId)
        .single();
      if (error || !jp) { log.error('Failed to load listing:', error); return; }
      setImportedListing(jp);
      const raw = (jp as any).import_raw_data || {};
      const seniority = raw.seniority || jp.seniority || '';
      const taskParts: string[] = [];
      if (raw.role_summary) taskParts.push(raw.role_summary);

      setFormData(prev => ({
        ...prev,
        role_title: raw.title || jp.title || '',
        task_description: taskParts.join('\n'),
        responsibilities: raw.responsibilities || [],
        required_skills: raw.required_skills || [],
        nice_to_have_skills: raw.nice_to_have_skills || [],
        experience_level: collapseToExperienceLevel(seniority),
        work_model: raw.work_model || '',
        country: raw.location_country || '',
        city_region: raw.location_city || '',
        salary_min: raw.salary_min ? Math.round(raw.salary_min) : 0,
        salary_max: raw.salary_max ? Math.round(raw.salary_max) : 0,
        salary_currency: raw.salary_currency || 'EUR',
        salary_period: 'yearly',
        ral_min: raw.salary_min ? Math.round(raw.salary_min) : 0,
        ral_max: raw.salary_max ? Math.round(raw.salary_max) : 0,
        ccnl: raw.ccnl || '',
        pay_months: null,
        years_experience_min: raw.years_experience_min ?? null,
        years_experience_max: raw.years_experience_max ?? null,
        education_level: raw.education_level || '',
        languages: raw.languages || [],
        original_seniority: seniority,
        imported_from_listing_id: fromListingId,
        ai_suggested_ximatar: raw.suggested_ximatar || (jp as any).ai_suggested_ximatar || null,
        xima_hr_requested: false,
      }));
    };
    load();
  }, [fromListingId, isEditMode]);

  // Edit mode: load existing draft and prefill
  useEffect(() => {
    if (!isEditMode || !goalId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('hiring_goal_drafts')
        .select('*')
        .eq('id', goalId)
        .single();
      if (error || !data) {
        log.error('[HiringGoalCreate] Failed to load draft:', error);
        toast.error(t('hiring_goal.load_error', 'Impossibile caricare l\'obiettivo'));
        navigate('/business/hiring-goals');
        return;
      }
      if (data.status && data.status !== 'draft') {
        navigate(`/business/hiring-goals/${goalId}/settings`, { replace: true });
        return;
      }
      const d: any = data;
      setFormData({
        role_title: d.role_title || '',
        task_description: d.task_description || '',
        responsibilities: Array.isArray(d.responsibilities) ? d.responsibilities : [],
        required_skills: Array.isArray(d.required_skills) ? d.required_skills : [],
        nice_to_have_skills: Array.isArray(d.nice_to_have_skills) ? d.nice_to_have_skills : [],
        experience_level: d.experience_level || '',
        work_model: d.work_model || '',
        country: d.country || '',
        city_region: d.city_region || '',
        salary_min: d.salary_min || d.ral_min || 0,
        salary_max: d.salary_max || d.ral_max || 0,
        salary_currency: d.salary_currency || 'EUR',
        salary_period: d.salary_period || 'yearly',
        ral_min: d.ral_min || 0,
        ral_max: d.ral_max || 0,
        ccnl: d.ccnl || '',
        pay_months: null,
        years_experience_min: d.years_experience_min ?? null,
        years_experience_max: d.years_experience_max ?? null,
        education_level: d.education_level || '',
        languages: Array.isArray(d.languages) ? d.languages : [],
        original_seniority: d.original_seniority || '',
        imported_from_listing_id: d.imported_from_listing_id || null,
        ai_suggested_ximatar: d.ai_suggested_ximatar || null,
        xima_hr_requested: !!d.xima_hr_requested,
      });
      setEditLoading(false);
    };
    load();
  }, [isEditMode, goalId, navigate, t]);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const canProceed = () => {
    if (step === 0) return formData.role_title.trim().length > 3;
    if (step === 1) return formData.responsibilities.length >= 2;
    if (step === 2) return formData.experience_level && formData.work_model;
    if (step === 3) return formData.country;
    if (step === 4) return formData.salary_min > 0 && formData.salary_max >= formData.salary_min;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isXimaHr = formData.xima_hr_requested;
      // RAL is derived from the single salary range instead of being typed twice.
      const ral = deriveRal(formData.salary_min, formData.salary_max, formData.salary_period,
        formData.pay_months ?? defaultPayMonths(formData.country, formData.ccnl));

      const payload = {
        role_title: formData.role_title,
        task_description: formData.task_description,
        experience_level: formData.experience_level,
        work_model: formData.work_model,
        country: formData.country,
        city_region: formData.city_region,
        salary_min: formData.salary_min,
        salary_max: formData.salary_max,
        salary_currency: formData.salary_currency,
        salary_period: formData.salary_period,
        ral_min: ral.ral_min || null,
        ral_max: ral.ral_max || null,
        ccnl: formData.ccnl || null,
        required_skills: formData.required_skills as any,
        nice_to_have_skills: formData.nice_to_have_skills as any,
        years_experience_min: formData.years_experience_min,
        years_experience_max: formData.years_experience_max,
        education_level: formData.education_level || null,
        languages: formData.languages as any,
        original_seniority: formData.original_seniority || null,
        imported_from_listing_id: formData.imported_from_listing_id,
        ai_suggested_ximatar: formData.ai_suggested_ximatar,
        xima_hr_requested: isXimaHr,
      };

      let goal: any;
      if (isEditMode && goalId) {
        const { data, error } = await supabase
          .from('hiring_goal_drafts')
          .update({ ...payload, ...(isXimaHr ? { status: 'active' } : {}) } as any)
          .eq('id', goalId)
          .select()
          .single();
        if (error) throw error;
        goal = data;
      } else {
        const { data, error } = await supabase
          .from('hiring_goal_drafts')
          .insert({
            business_id: user.id,
            status: isXimaHr ? 'active' : 'draft',
            ...payload,
          } as any)
          .select()
          .single();
        if (error) throw error;
        goal = data;
      }

      if (draftEnabled) clearGoalDraft(user.id);

      if (isXimaHr) {
        // XIMA HR flow: call request-xima-hr, do NOT generate shortlist
        try {
          const { data: fnData, error: fnErr } = await supabase.functions.invoke('request-xima-hr', {
            body: { business_id: user.id, source: 'hiring_goal', source_id: goal.id },
          });
          if (fnErr) throw fnErr;
          if (fnData?.error) throw new Error(fnData.error);
        } catch (hrErr: any) {
          // Goal is saved even if XIMA HR call fails — user can retry later
          log.error('[HiringGoalCreate] XIMA HR request failed:', hrErr);
          toast.error(t('businessPortal.hiring_goal.xima_hr_checkbox.error', 'XIMA HR non è riuscito a ricevere la richiesta. L\'obiettivo è stato salvato — puoi riprovare.'));
          navigate('/business/dashboard');
          return;
        }
        toast.success(t('businessPortal.hiring_goal.xima_hr_checkbox.success', 'Obiettivo attivato — XIMA HR ti contatterà entro 24 ore'));
        navigate('/business/dashboard');
      } else {
        toast.success(t('hiring_goal.created', 'Obiettivo creato con successo'));
        navigate(`/business/hiring-goals/${goal.id}/shortlist`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };


  const stepProps = { formData, updateField, userId, importedListing };

  const stepNames = [
    t('hiring_goal.step_role'),
    t('hiring_goal.step_skills'),
    t('hiring_goal.step_mode'),
    t('hiring_goal.step_location'),
    t('hiring_goal.step_pay'),
  ];
  const stepMeta: { title: string; intro: string; hint: string }[] = [
    { title: t('hiring_goal.step0_title', 'Quale ruolo stai cercando?'), intro: t('hiring_goal.step0_subtitle'), hint: t('hiring_goal.step0_hint') },
    { title: t('hiring_goal.step1_title', 'Quali sono le responsabilità chiave?'), intro: t('hiring_goal.step1_subtitle'), hint: t('hiring_goal.step1_hint') },
    { title: t('hiring_goal.step2_title', 'Livello e modalità di lavoro'), intro: t('hiring_goal.step2_subtitle'), hint: t('hiring_goal.step2_hint') },
    { title: t('hiring_goal.step3_title', 'Dove si trova il ruolo?'), intro: t('hiring_goal.step3_subtitle'), hint: t('hiring_goal.step3_hint') },
    { title: t('businessPortal.hiring_goal.gross_salary.title'), intro: t('businessPortal.hiring_goal.gross_salary.subtitle'), hint: t('hiring_goal.step4_hint') },
  ];
  const pad = (n: number) => String(n).padStart(2, '0');

  const metaLine = isEditMode
    ? t('hiring_goal.meta_edit')
    : fromListingId
      ? t('hiring_goal.meta_import')
      : t('hiring_goal.meta_local_draft');

  if (isEditMode && editLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow={`${t('businessPortal.nav_hiring_goals')} / ${isEditMode ? t('hiring_goal.edit_title') : t('hiring_goal.wizard_eyebrow')}`}
        title={t('hiring_goal.wizard_title')}
        subtitle={isEditMode
          ? t('hiring_goal.edit_subtitle', 'Aggiorna il brief: XIMA rigenererà la shortlist al salvataggio.')
          : t('hiring_goal.create_subtitle', 'XIMA trasformerà questo brief in una shortlist intelligente di candidati per identità comportamentale.')}
        actions={(
          <Button variant="ghost" size="sm" onClick={() => navigate('/business/dashboard')} className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t('common.back_to_dashboard', 'Torna alla dashboard')}
          </Button>
        )}
        meta={<span role="status">{metaLine}</span>}
      />

      {/* Import banner */}
      {importedListing && (
        <ImportBanner
          listing={importedListing}
          onModify={() => setShowLeaveConfirm(true)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)_320px]">
        {/* Step index */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <nav aria-label={t('hiring_goal.steps_label')} className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
            {stepNames.map((name, i) => {
              const current = i === step;
              const done = i < step;
              return (
                <button
                  key={name}
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  disabled={!done && !current}
                  onClick={() => { if (done) setStep(i); }}
                  className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] transition-colors ${
                    current
                      ? 'bg-primary/10 font-semibold text-foreground'
                      : done
                        ? 'text-foreground hover:bg-muted/60'
                        : 'text-muted-foreground'
                  }`}
                >
                  <span className={`xs-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    current ? 'border-primary bg-primary text-white' : done ? 'border-primary text-primary' : 'border-[hsl(var(--xs-line))]'
                  }`}>
                    {i + 1}
                  </span>
                  {name}
                </button>
              );
            })}
          </nav>
          <p className="mt-6 hidden text-xs leading-relaxed text-muted-foreground lg:block">
            <span className="xs-eyebrow block">{t('hiring_goal.nav_note_title')}</span>
            <span className="mt-3 block">{t('hiring_goal.nav_note_body')}</span>
          </p>
        </div>

        {/* Step form */}
        <section className="xs-panel" aria-label={stepNames[step]}>
          <p className="xs-eyebrow">{t('hiring_goal.step_counter', { current: pad(step + 1), total: pad(TOTAL_STEPS) })}</p>
          <h2 className="mt-2 text-[23px] font-semibold leading-tight tracking-[-0.5px] text-foreground">{stepMeta[step].title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{stepMeta[step].intro}</p>

          <div className="mt-6 min-h-[320px]">
            {step === 0 && <Step0Role {...stepProps} />}
            {step === 1 && <Step1Responsibilities {...stepProps} />}
            {step === 2 && <Step2SeniorityWorkMode {...stepProps} />}
            {step === 3 && <Step3Location {...stepProps} />}
            {step === 4 && <Step4SalaryReview {...stepProps} />}
          </div>

          <p className="mt-6 flex gap-2 text-[13px] text-muted-foreground">
            <span aria-hidden="true">↳</span>
            <span>{stepMeta[step].hint}</span>
          </p>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-[hsl(var(--xs-line))] pt-5">
            <Button variant="ghost" onClick={prev} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('common.back', 'Indietro')}
            </Button>
            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={next} disabled={!canProceed()}>
                {t('hiring_goal.continue')}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
                {submitting
                  ? t('hiring_goal.creating', 'Creazione...')
                  : formData.xima_hr_requested
                    ? t('businessPortal.hiring_goal.xima_hr_checkbox.activate', 'Attiva con XIMA HR')
                    : t('hiring_goal.create_and_shortlist', 'Crea e Genera Shortlist')}
              </Button>
            )}
          </div>
        </section>

        {/* Live summary: the one translucent surface of this page. */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <GoalSummaryPanel formData={formData} />
          <CompanyContextNote profile={businessProfile} />
        </aside>
      </div>

      {/* Resume a locally saved draft */}
      <Dialog open={!!pendingDraft} onOpenChange={(open) => { if (!open) resumeDraft(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('businessPortal.hiring_goal.draft_found_title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('businessPortal.hiring_goal.draft_found_body', {
              role: pendingDraft?.formData.role_title?.trim() || t('businessPortal.hiring_goal.draft_untitled'),
              date: pendingDraft ? new Date(pendingDraft.savedAt).toLocaleString() : '',
            })}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={startOver}>{t('businessPortal.hiring_goal.draft_start_over')}</Button>
            <Button onClick={resumeDraft}>{t('businessPortal.hiring_goal.draft_resume')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave confirmation dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('businessPortal.hiring_goal.import_banner.leave_title', 'Tornare all\'importazione?')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('businessPortal.hiring_goal.import_banner.leave_body', 'Le modifiche non salvate andranno perse. Vuoi continuare?')}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>{t('common.cancel', 'Annulla')}</Button>
            <Button variant="destructive" onClick={() => navigate('/business/jobs/import')}>
              {t('businessPortal.hiring_goal.import_banner.leave_confirm', 'Sì, torna all\'importazione')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessLayout>
  );
};

// ── Live summary ("Il tuo obiettivo") ──
const GoalSummaryPanel = ({ formData }: { formData: FormData }) => {
  const { t } = useTranslation();
  const seniorityLabel: Record<string, string> = {
    first_time: t('hiring_goal.seniority_first_time', 'Prima esperienza'),
    independent: t('hiring_goal.seniority_independent', 'Autonomo'),
    led_others: t('hiring_goal.seniority_led_others', 'Ha guidato altri'),
  };
  const modeLabel: Record<string, string> = {
    remote: t('hiring_goal.remote', 'Remoto'),
    hybrid: t('hiring_goal.hybrid', 'Ibrido'),
    onsite: t('hiring_goal.onsite', 'In sede'),
  };
  const tbd = t('hiring_goal.summary_tbd');
  const payMonths = formData.pay_months ?? defaultPayMonths(formData.country, formData.ccnl);
  const ral = deriveRal(formData.salary_min, formData.salary_max, formData.salary_period, payMonths);
  const ralText = ral.ral_min > 0
    ? `${ral.ral_min.toLocaleString()}–${(ral.ral_max || ral.ral_min).toLocaleString()} ${formData.salary_currency}`
    : tbd;
  const rows: [string, React.ReactNode][] = [
    [t('hiring_goal.seniority', 'Seniority'), seniorityLabel[formData.experience_level] || tbd],
    [t('hiring_goal.review_mode', 'Modalità'), modeLabel[formData.work_model] || tbd],
    [t('hiring_goal.review_location', 'Località'), [formData.city_region, formData.country].filter(Boolean).join(', ') || tbd],
    [t('hiring_goal.review_responsibilities', 'Responsabilità'), formData.responsibilities.length],
    [t('businessPortal.hiring_goal.advanced.required_skills', 'Competenze richieste'), formData.required_skills.length],
    [t('businessPortal.hiring_goal.gross_salary.ral_label', 'RAL'), ralText],
  ];
  return (
    <div className="xs-glass" aria-live="polite">
      <p className="xs-eyebrow">{t('hiring_goal.summary_eyebrow')}</p>
      <p className="mt-3 text-[19px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
        {formData.role_title.trim() || t('hiring_goal.summary_role_placeholder')}
      </p>
      <dl className="mt-4 divide-y divide-[hsl(var(--xs-line))]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="xs-num text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t('hiring_goal.summary_updates')}</p>
    </div>
  );
};

// ── Company context note under the summary ──
const CompanyContextNote = ({ profile }: { profile: ReturnType<typeof useBusinessProfile>['businessProfile'] }) => {
  const { t } = useTranslation();
  if (!profile) return null;
  const industry = profile.manual_industry || profile.snapshot_industry;
  const city = profile.manual_hq_city || profile.snapshot_hq_city;
  const details = [industry, city].filter(Boolean).join(' · ');
  return (
    <div className="xs-panel !py-4 text-sm text-muted-foreground">
      <strong className="block text-foreground">{t('hiring_goal.company_context_title', { company: profile.company_name })}</strong>
      {details && <span className="mt-1 block">{details}</span>}
      <span className="mt-1 block">{t('hiring_goal.company_context_body')}</span>
    </div>
  );
};

// ── Import Banner ──
const ImportBanner = ({ listing, onModify }: { listing: any; onModify: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="xs-panel mb-6 flex items-start gap-3 !py-4">
      <FileDown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {t('businessPortal.hiring_goal.import_banner.title', 'Importato da')}: {listing.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('businessPortal.hiring_goal.import_banner.subtitle', 'I dati sono pre-popolati. Verifica ogni step prima di attivare l\'obiettivo.')}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="text-xs flex-shrink-0" onClick={onModify}>
        {t('businessPortal.hiring_goal.import_banner.modify', 'Modifica importazione')}
      </Button>
    </div>
  );
};

// ── Shared step props ──
interface StepProps {
  formData: FormData;
  updateField: (f: keyof FormData, v: any) => void;
  userId: string;
  importedListing: any;
}

const fieldLabel = 'text-sm font-medium text-foreground mb-1.5 block';
const inputClass = 'w-full rounded-lg border border-[hsl(var(--xs-line))] bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none';

// ── STEP 0 — Role title ──
const Step0Role = ({ formData, updateField, userId }: StepProps) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="goal-role-title" className={fieldLabel}>
          {t('hiring_goal.role_title', 'Titolo del ruolo')} <span className="text-destructive">*</span>
        </label>
        <input
          id="goal-role-title"
          type="text"
          value={formData.role_title}
          onChange={e => updateField('role_title', e.target.value)}
          placeholder={t('hiring_goal.role_title_placeholder', 'es. Senior Product Manager, Lead Engineer')}
          className={`${inputClass} px-4 py-3 text-base`}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="goal-role-summary" className="text-sm font-medium text-foreground">
            {t('hiring_goal.role_summary', 'Sintesi del ruolo (opzionale)')}
          </label>
          {userId && (
            <SuggestFieldButton
              fieldName="role_summary"
              mode="replace"
              roleTitle={formData.role_title}
              currentValues={formData.task_description}
              onApply={(v) => updateField('task_description', v as string)}
              businessId={userId}
            />
          )}
        </div>
        <textarea
          id="goal-role-summary"
          value={formData.task_description}
          onChange={e => updateField('task_description', e.target.value)}
          rows={3}
          placeholder={t('hiring_goal.role_summary_placeholder', 'In una frase, qual è la missione di questo ruolo?')}
          className={`${inputClass} px-4 py-3`}
        />
      </div>
    </div>
  );
};

// ── Chip Editor (inline) ──
const ChipEditor = ({
  items, onChange, placeholder, label, suggestFieldName, roleTitle, userId,
}: {
  items: string[]; onChange: (v: string[]) => void; placeholder: string; label: string;
  suggestFieldName?: 'responsibilities' | 'required_skills' | 'nice_to_have';
  roleTitle: string; userId: string;
}) => {
  const [input, setInput] = useState('');
  const add = (text: string) => {
    if (!text.trim() || items.includes(text)) return;
    onChange([...items, text]);
    setInput('');
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label} <span className="xs-num text-muted-foreground">({items.length})</span>
        </label>
        {suggestFieldName && userId && (
          <SuggestFieldButton
            fieldName={suggestFieldName}
            mode="additive"
            roleTitle={roleTitle}
            currentValues={items}
            onApply={(v) => onChange(v as string[])}
            businessId={userId}
          />
        )}
      </div>
      {items.length > 0 && (
        <ol className="divide-y divide-[hsl(var(--xs-line))] rounded-lg border border-[hsl(var(--xs-line))]">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm text-foreground">
              <span className="min-w-0">{item}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`${item} ×`}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
          placeholder={placeholder}
          className={`flex-1 ${inputClass} py-2`}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => add(input)} aria-label="+">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

// ── STEP 1 — Responsibilities + Skills ──
const Step1Responsibilities = ({ formData, updateField, userId }: StepProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <ChipEditor
        items={formData.responsibilities}
        onChange={v => updateField('responsibilities', v)}
        placeholder={t('hiring_goal.custom_placeholder', 'es. Negoziare contratti enterprise')}
        label={t('businessPortal.hiring_goal.advanced.responsibilities', 'Responsabilità chiave')}
        suggestFieldName="responsibilities"
        roleTitle={formData.role_title}
        userId={userId}
      />

      <ChipEditor
        items={formData.required_skills}
        onChange={v => updateField('required_skills', v)}
        placeholder={t('businessPortal.hiring_goal.advanced.required_skills_placeholder', 'es. React, Project Management')}
        label={t('businessPortal.hiring_goal.advanced.required_skills', 'Competenze richieste')}
        suggestFieldName="required_skills"
        roleTitle={formData.role_title}
        userId={userId}
      />

      <ChipEditor
        items={formData.nice_to_have_skills}
        onChange={v => updateField('nice_to_have_skills', v)}
        placeholder={t('businessPortal.hiring_goal.advanced.nice_to_have_placeholder', 'es. TypeScript, Scrum')}
        label={t('businessPortal.hiring_goal.advanced.nice_to_have_skills', 'Competenze gradite')}
        suggestFieldName="nice_to_have"
        roleTitle={formData.role_title}
        userId={userId}
      />
    </div>
  );
};

// ── STEP 2 — Seniority + Work mode + Advanced ──
const Step2SeniorityWorkMode = ({ formData, updateField }: StepProps) => {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(
    !!(formData.years_experience_min || formData.education_level || formData.languages.length)
  );

  const seniorities = [
    { value: 'first_time', label: t('hiring_goal.seniority_first_time', 'Prima esperienza'), desc: t('hiring_goal.seniority_first_time_desc', '0-2 anni, in apprendimento') },
    { value: 'independent', label: t('hiring_goal.seniority_independent', 'Autonomo'), desc: t('hiring_goal.seniority_independent_desc', '3-7 anni, lavora in autonomia') },
    { value: 'led_others', label: t('hiring_goal.seniority_led_others', 'Ha guidato altri'), desc: t('hiring_goal.seniority_led_others_desc', '7+ anni, esperienza di leadership') },
  ];

  const [newLang, setNewLang] = useState('');
  const [newLangLevel, setNewLangLevel] = useState('fluent');

  const addLanguage = () => {
    if (!newLang.trim()) return;
    updateField('languages', [...formData.languages, { language: newLang.trim(), level: newLangLevel }]);
    setNewLang('');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground mb-2">
          {t('hiring_goal.seniority', 'Seniority')} <span className="text-destructive">*</span>
        </p>
        <div className="space-y-2">
          {seniorities.map(s => (
            <label
              key={s.value}
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                formData.experience_level === s.value ? 'border-primary bg-primary/5' : 'border-[hsl(var(--xs-line))] bg-background hover:border-primary/50'
              }`}
            >
              <input type="radio" name="seniority" value={s.value} checked={formData.experience_level === s.value}
                onChange={e => updateField('experience_level', e.target.value)} className="mt-1" />
              <div>
                <p className="font-medium text-sm text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {/* Original seniority note */}
        {formData.original_seniority && (
          <p className="mt-2 flex items-start gap-2 border-l-2 border-primary pl-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {t('businessPortal.hiring_goal.original_seniority_note', 'Importato come "{{original}}" (mappato a "{{mapped}}")', {
              original: formData.original_seniority,
              mapped: SENIORITY_DISPLAY[formData.experience_level] || formData.experience_level,
            })}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-2">
          {t('hiring_goal.work_mode', 'Modalità di lavoro')} <span className="text-destructive">*</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'remote', label: t('hiring_goal.remote', 'Remoto') },
            { value: 'hybrid', label: t('hiring_goal.hybrid', 'Ibrido') },
            { value: 'onsite', label: t('hiring_goal.onsite', 'In sede') },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={formData.work_model === opt.value}
              onClick={() => updateField('work_model', opt.value)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                formData.work_model === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-[hsl(var(--xs-line))] bg-background text-foreground hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced details */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            {t('businessPortal.hiring_goal.advanced.title', 'Dettagli avanzati')}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Years experience */}
          <div>
            <p className={fieldLabel}>
              {t('businessPortal.hiring_goal.advanced.years_experience', 'Anni di esperienza')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                value={formData.years_experience_min ?? ''}
                onChange={e => updateField('years_experience_min', e.target.value ? Number(e.target.value) : null)}
                placeholder={t('businessPortal.hiring_goal.advanced.min', 'Min')}
                aria-label={t('businessPortal.hiring_goal.advanced.min', 'Min')}
              />
              <Input
                type="number"
                min={0}
                value={formData.years_experience_max ?? ''}
                onChange={e => updateField('years_experience_max', e.target.value ? Number(e.target.value) : null)}
                placeholder={t('businessPortal.hiring_goal.advanced.max', 'Max')}
                aria-label={t('businessPortal.hiring_goal.advanced.max', 'Max')}
              />
            </div>
          </div>

          {/* Education level */}
          <div>
            <p className={fieldLabel}>
              {t('businessPortal.hiring_goal.advanced.education_level', 'Livello di istruzione')}
            </p>
            <Select value={formData.education_level} onValueChange={v => updateField('education_level', v)}>
              <SelectTrigger><SelectValue placeholder={t('businessPortal.hiring_goal.advanced.select_education', 'Seleziona...')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none_required">{t('businessPortal.education_levels.none_required', 'Nessun requisito')}</SelectItem>
                <SelectItem value="high_school">{t('businessPortal.education_levels.high_school', 'Diploma')}</SelectItem>
                <SelectItem value="bachelor">{t('businessPortal.education_levels.bachelor', 'Laurea triennale')}</SelectItem>
                <SelectItem value="master">{t('businessPortal.education_levels.master', 'Laurea magistrale')}</SelectItem>
                <SelectItem value="phd">{t('businessPortal.education_levels.phd', 'Dottorato')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Languages */}
          <div>
            <p className={fieldLabel}>
              {t('businessPortal.hiring_goal.advanced.languages', 'Lingue')}
            </p>
            <div className="space-y-2">
              {formData.languages.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 py-1">
                    {l.language} ({t(`businessPortal.language_levels.${l.level}`, l.level)})
                    <button type="button" onClick={() => updateField('languages', formData.languages.filter((_, j) => j !== i))} className="hover:text-destructive" aria-label={`${l.language} ×`}>
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLang}
                  onChange={e => setNewLang(e.target.value)}
                  placeholder={t('businessPortal.hiring_goal.advanced.language_placeholder', 'es. Italiano')}
                  aria-label={t('businessPortal.hiring_goal.advanced.languages', 'Lingue')}
                  className={`flex-1 ${inputClass} py-2`}
                />
                <Select value={newLangLevel} onValueChange={setNewLangLevel}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{t('businessPortal.language_levels.basic', 'Base')}</SelectItem>
                    <SelectItem value="fluent">{t('businessPortal.language_levels.fluent', 'Fluente')}</SelectItem>
                    <SelectItem value="native">{t('businessPortal.language_levels.native', 'Madrelingua')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" variant="outline" onClick={addLanguage} aria-label="+">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// ── STEP 3 — Location ──
const Step3Location = ({ formData, updateField }: StepProps) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="goal-country" className={fieldLabel}>
          {t('hiring_goal.country', 'Paese')} <span className="text-destructive">*</span>
        </label>
        <select
          id="goal-country"
          value={formData.country}
          onChange={e => updateField('country', e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          <option value="IT">Italia</option>
          <option value="FR">Francia</option>
          <option value="DE">Germania</option>
          <option value="ES">Spagna</option>
          <option value="UK">Regno Unito</option>
          <option value="US">Stati Uniti</option>
        </select>
      </div>
      <div>
        <label htmlFor="goal-city" className={fieldLabel}>{t('hiring_goal.city', 'Città')}</label>
        <input
          id="goal-city"
          type="text"
          value={formData.city_region}
          onChange={e => updateField('city_region', e.target.value)}
          placeholder={t('hiring_goal.city_placeholder', 'es. Milano')}
          className={inputClass}
        />
      </div>
    </div>
  );
};

// ── STEP 4 — Salary + Review + XIMA HR ──
const Step4SalaryReview = ({ formData, updateField }: StepProps) => {
  const { t } = useTranslation();
  const isYearly = formData.salary_period === 'yearly';
  const salaryLabel = isYearly
    ? t('businessPortal.hiring_goal.gross_salary.ral_label', 'RAL')
    : t('businessPortal.hiring_goal.gross_salary.monthly_label', 'Mensile lordo');
  const contractMonths = defaultPayMonths(formData.country, formData.ccnl);
  const payMonths = formData.pay_months ?? contractMonths;
  const derivedRal = deriveRal(formData.salary_min, formData.salary_max, formData.salary_period, payMonths);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground mb-2">
          {t('hiring_goal.salary_range', 'Range')} <span className="text-destructive">*</span>
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
          <Input type="number" min={0} step={1000} value={formData.salary_min || ''}
            onChange={e => updateField('salary_min', Number(e.target.value))} placeholder={`${salaryLabel} Min`} aria-label={`${salaryLabel} Min`} />
          <span className="text-muted-foreground" aria-hidden="true">—</span>
          <Input type="number" min={0} step={1000} value={formData.salary_max || ''}
            onChange={e => updateField('salary_max', Number(e.target.value))} placeholder={`${salaryLabel} Max`} aria-label={`${salaryLabel} Max`} />
          <select value={formData.salary_currency} onChange={e => updateField('salary_currency', e.target.value)}
            aria-label="Currency"
            className="rounded-lg border border-[hsl(var(--xs-line))] bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none">
            <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
          </select>
        </div>
        {/* Period toggle — yearly default, monthly de-emphasized */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground">{t('businessPortal.hiring_goal.gross_salary.period', 'Periodo')}:</span>
          <button
            type="button"
            aria-pressed={isYearly}
            onClick={() => updateField('salary_period', 'yearly')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('hiring_goal.annual', 'Annuale')}
          </button>
          <button
            type="button"
            aria-pressed={!isYearly}
            onClick={() => updateField('salary_period', 'monthly')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${!isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('hiring_goal.monthly', 'Mensile')}
          </button>
        </div>
      </div>

      {/* Pay transparency (D.Lgs. 96/2026, in force since 7 June 2026). RAL is
          derived from the range above — asking for it a second time let the two
          disagree. */}
      <div className="pt-2">
        <p className="text-sm font-medium text-foreground mb-2">
          {t('businessPortal.hiring_goal.pay_transparency.title')}
        </p>
        <div className="rounded-lg border border-[hsl(var(--xs-line))] px-4 py-3 mb-3" aria-live="polite">
          <p className="xs-eyebrow">{t('businessPortal.hiring_goal.gross_salary.ral_label', 'RAL')}</p>
          <p className="xs-num mt-1 text-[22px] font-semibold leading-none text-foreground">
            {derivedRal.ral_min > 0
              ? `${derivedRal.ral_min.toLocaleString()}–${(derivedRal.ral_max || derivedRal.ral_min).toLocaleString()} ${formData.salary_currency}`
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {isYearly
              ? t('businessPortal.hiring_goal.pay_transparency.ral_from_yearly')
              : t('businessPortal.hiring_goal.pay_transparency.ral_from_monthly', { months: payMonths })}
          </p>
          {!isYearly && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label htmlFor="goal-pay-months" className="text-xs text-muted-foreground">
                {t('businessPortal.hiring_goal.pay_transparency.pay_months_label')}
              </label>
              <select
                id="goal-pay-months"
                value={payMonths}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateField('pay_months', v === contractMonths ? null : v);
                }}
                className="rounded-md border border-[hsl(var(--xs-line))] bg-background px-2 py-1 text-xs text-foreground"
              >
                {[12, 13, 14].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">
                {formData.pay_months == null
                  ? t('businessPortal.hiring_goal.pay_transparency.pay_months_default', { months: contractMonths })
                  : t('businessPortal.hiring_goal.pay_transparency.pay_months_custom')}
              </span>
            </div>
          )}
        </div>
        <label htmlFor="goal-ccnl" className={fieldLabel}>
          {t('businessPortal.hiring_goal.pay_transparency.ccnl_label')}
        </label>
        <select
          id="goal-ccnl"
          value={formData.ccnl}
          onChange={(e) => updateField('ccnl', e.target.value)}
          className={inputClass}
        >
          <option value="">{t('businessPortal.hiring_goal.pay_transparency.ccnl_placeholder')}</option>
          {CCNL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-2">{CCNL_HELPER_IT}</p>
      </div>

      {/* Review (the live summary sits beside the form; this stays for the mobile reader) */}
      <details className="border-t border-[hsl(var(--xs-line))] pt-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium text-foreground">{t('hiring_goal.review_title', 'Riepilogo')}</summary>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_role', 'Ruolo')}:</span><span className="font-medium text-foreground">{formData.role_title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_seniority', 'Seniority')}:</span><span className="font-medium capitalize text-foreground">{SENIORITY_DISPLAY[formData.experience_level] || formData.experience_level}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_mode', 'Modalità')}:</span><span className="font-medium capitalize text-foreground">{formData.work_model}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_location', 'Località')}:</span><span className="font-medium text-foreground">{[formData.city_region, formData.country].filter(Boolean).join(', ')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_responsibilities', 'Responsabilità')}:</span><span className="font-medium text-foreground">{formData.responsibilities.length}</span></div>
          {formData.required_skills.length > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">{t('businessPortal.hiring_goal.advanced.required_skills', 'Competenze richieste')}:</span><span className="font-medium text-foreground">{formData.required_skills.length}</span></div>
          )}
          {formData.salary_min > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">{salaryLabel}:</span><span className="font-medium text-foreground">{formData.salary_min.toLocaleString()}–{formData.salary_max.toLocaleString()} {formData.salary_currency}</span></div>
          )}
        </div>
      </details>

      {/* XIMA HR checkbox */}
      <div className="border-t border-[hsl(var(--xs-line))] pt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={formData.xima_hr_requested}
            onCheckedChange={v => updateField('xima_hr_requested', !!v)}
            className="mt-0.5 h-5 w-5 border-2"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('businessPortal.hiring_goal.xima_hr_checkbox.label', 'Preferisco che XIMA HR gestisca la selezione per me')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('businessPortal.hiring_goal.xima_hr_checkbox.description', 'Il team XIMA HR creerà le challenge, valuterà i candidati e ti presenterà solo i finalisti pronti per l\'offerta.')}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default HiringGoalCreate;
