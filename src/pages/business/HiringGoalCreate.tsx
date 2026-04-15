import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Target, Users, MapPin, DollarSign, FileDown, Info, ChevronDown, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const fromListingId = searchParams.get('from_listing');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [importedListing, setImportedListing] = useState<any>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [userId, setUserId] = useState('');

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

  // Load user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Pre-fill from ?from_listing=<id>
  useEffect(() => {
    if (!fromListingId) return;
    const load = async () => {
      const { data: jp, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', fromListingId)
        .single();
      if (error || !jp) { console.error('Failed to load listing:', error); return; }
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
  }, [fromListingId]);

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

      const { data: goal, error } = await supabase
        .from('hiring_goal_drafts')
        .insert({
          business_id: user.id,
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
          status: isXimaHr ? 'active' : 'draft',
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
        } as any)
        .select()
        .single();

      if (error) throw error;

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
          console.error('[HiringGoalCreate] XIMA HR request failed:', hrErr);
          toast.error(t('businessPortal.hiring_goal.xima_hr_checkbox.error', 'XIMA HR non è riuscito a ricevere la richiesta. L\'obiettivo è stato salvato — puoi riprovare.'));
          navigate('/business/dashboard');
          return;
        }
        toast.success(t('businessPortal.hiring_goal.xima_hr_checkbox.success', 'Obiettivo attivato — XIMA HR ti contatterà entro 24 ore'));
        navigate('/business/dashboard');
      } else {
        toast.success(t('hiring_goal.created', 'Obiettivo creato con successo'));
        navigate(`/business/goals/${goal.id}/candidates`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepProps = { formData, updateField, userId, importedListing };

  return (
    <BusinessLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Back */}
        <button
          onClick={() => navigate('/business/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back_to_dashboard', 'Torna alla dashboard')}
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {t('hiring_goal.create_title', 'Crea un nuovo obiettivo di assunzione')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('hiring_goal.create_subtitle', 'XIMA trasformerà questo brief in una shortlist intelligente di candidati per identità comportamentale.')}
          </p>
        </div>

        {/* Import banner */}
        {importedListing && (
          <ImportBanner
            listing={importedListing}
            onModify={() => setShowLeaveConfirm(true)}
          />
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary'}`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-2">{step + 1}/{TOTAL_STEPS}</span>
        </div>

        {/* Step content */}
        <div className="min-h-[320px]">
          {step === 0 && <Step0Role {...stepProps} />}
          {step === 1 && <Step1Responsibilities {...stepProps} />}
          {step === 2 && <Step2SeniorityWorkMode {...stepProps} />}
          {step === 3 && <Step3Location {...stepProps} />}
          {step === 4 && <Step4SalaryReview {...stepProps} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t mt-8">
          <Button variant="ghost" onClick={prev} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back', 'Indietro')}
          </Button>
          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={next} disabled={!canProceed()}>
              {t('common.next', 'Avanti')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
              <Sparkles className="w-4 h-4 mr-2" />
              {submitting
                ? t('hiring_goal.creating', 'Creazione...')
                : formData.xima_hr_requested
                  ? t('businessPortal.hiring_goal.xima_hr_checkbox.activate', 'Attiva con XIMA HR')
                  : t('hiring_goal.create_and_shortlist', 'Crea e Genera Shortlist')}
            </Button>
          )}
        </div>

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
      </div>
    </BusinessLayout>
  );
};

// ── Import Banner ──
const ImportBanner = ({ listing, onModify }: { listing: any; onModify: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 flex items-start gap-3">
      <FileDown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
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

// ── STEP 0 — Role title ──
const Step0Role = ({ formData, updateField, userId }: StepProps) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('hiring_goal.step0_title', 'Quale ruolo stai cercando?')}</h2>
          <p className="text-sm text-muted-foreground">{t('hiring_goal.step0_subtitle', 'Inizia con il titolo. XIMA userà questo come ancora per il matching.')}</p>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('hiring_goal.role_title', 'Titolo del ruolo')} <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={formData.role_title}
          onChange={e => updateField('role_title', e.target.value)}
          placeholder={t('hiring_goal.role_title_placeholder', 'es. Senior Product Manager, Lead Engineer')}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-foreground">
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
          value={formData.task_description}
          onChange={e => updateField('task_description', e.target.value)}
          rows={3}
          placeholder={t('hiring_goal.role_summary_placeholder', 'In una frase, qual è la missione di questo ruolo?')}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
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
  const { t } = useTranslation();
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
        <label className="text-sm font-medium text-foreground">{label}</label>
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
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {item}
            <button onClick={() => remove(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
        />
        <Button type="button" size="sm" onClick={() => add(input)}>
          <Plus className="h-4 w-4" />
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
          <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('hiring_goal.step1_title', 'Quali sono le responsabilità chiave?')}</h2>
          <p className="text-sm text-muted-foreground">{t('hiring_goal.step1_subtitle', 'Aggiungi 2-5 responsabilità e le competenze richieste.')}</p>
        </div>
      </div>

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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
          <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('hiring_goal.step2_title', 'Livello e modalità di lavoro')}</h2>
          <p className="text-sm text-muted-foreground">{t('hiring_goal.step2_subtitle', 'Questo influenza la difficoltà delle sfide.')}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {t('hiring_goal.seniority', 'Seniority')} <span className="text-destructive">*</span>
        </label>
        <div className="space-y-2">
          {seniorities.map(s => (
            <label
              key={s.value}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.experience_level === s.value ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'
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
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('businessPortal.hiring_goal.original_seniority_note', 'Importato come "{{original}}" (mappato a "{{mapped}}")', {
                original: formData.original_seniority,
                mapped: SENIORITY_DISPLAY[formData.experience_level] || formData.experience_level,
              })}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {t('hiring_goal.work_mode', 'Modalità di lavoro')} <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'remote', label: t('hiring_goal.remote', 'Remoto') },
            { value: 'hybrid', label: t('hiring_goal.hybrid', 'Ibrido') },
            { value: 'onsite', label: t('hiring_goal.onsite', 'In sede') },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('work_model', opt.value)}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                formData.work_model === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50'
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
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            {t('businessPortal.hiring_goal.advanced.title', 'Dettagli avanzati')}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Years experience */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('businessPortal.hiring_goal.advanced.years_experience', 'Anni di esperienza')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                value={formData.years_experience_min ?? ''}
                onChange={e => updateField('years_experience_min', e.target.value ? Number(e.target.value) : null)}
                placeholder={t('businessPortal.hiring_goal.advanced.min', 'Min')}
              />
              <Input
                type="number"
                min={0}
                value={formData.years_experience_max ?? ''}
                onChange={e => updateField('years_experience_max', e.target.value ? Number(e.target.value) : null)}
                placeholder={t('businessPortal.hiring_goal.advanced.max', 'Max')}
              />
            </div>
          </div>

          {/* Education level */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('businessPortal.hiring_goal.advanced.education_level', 'Livello di istruzione')}
            </label>
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
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('businessPortal.hiring_goal.advanced.languages', 'Lingue')}
            </label>
            <div className="space-y-2">
              {formData.languages.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 py-1">
                    {l.language} ({t(`businessPortal.language_levels.${l.level}`, l.level)})
                    <button onClick={() => updateField('languages', formData.languages.filter((_, j) => j !== i))} className="hover:text-destructive">
                      <X className="h-3 w-3" />
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
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                />
                <Select value={newLangLevel} onValueChange={setNewLangLevel}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{t('businessPortal.language_levels.basic', 'Base')}</SelectItem>
                    <SelectItem value="fluent">{t('businessPortal.language_levels.fluent', 'Fluente')}</SelectItem>
                    <SelectItem value="native">{t('businessPortal.language_levels.native', 'Madrelingua')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" variant="outline" onClick={addLanguage}>
                  <Plus className="h-4 w-4" />
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('hiring_goal.step3_title', 'Dove si trova il ruolo?')}</h2>
          <p className="text-sm text-muted-foreground">{t('hiring_goal.step3_subtitle', 'Indica paese e città del ruolo.')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            {t('hiring_goal.country', 'Paese')} <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.country}
            onChange={e => updateField('country', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
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
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t('hiring_goal.city', 'Città')}</label>
          <input
            type="text"
            value={formData.city_region}
            onChange={e => updateField('city_region', e.target.value)}
            placeholder={t('hiring_goal.city_placeholder', 'es. Milano')}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
          />
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t('businessPortal.hiring_goal.gross_salary.title', 'Compensazione lorda annuale (RAL)')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('businessPortal.hiring_goal.gross_salary.subtitle', 'XIMA mostra sempre la retribuzione lorda. Il candidato vedrà questo valore.')}
          </p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {t('hiring_goal.salary_range', 'Range')} <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
          <Input type="number" min={0} step={1000} value={formData.salary_min || ''}
            onChange={e => updateField('salary_min', Number(e.target.value))} placeholder={`${salaryLabel} Min`} />
          <span className="text-muted-foreground">—</span>
          <Input type="number" min={0} step={1000} value={formData.salary_max || ''}
            onChange={e => updateField('salary_max', Number(e.target.value))} placeholder={`${salaryLabel} Max`} />
          <select value={formData.salary_currency} onChange={e => updateField('salary_currency', e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none">
            <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
          </select>
        </div>
        {/* Period toggle — yearly default, monthly de-emphasized */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground">{t('businessPortal.hiring_goal.gross_salary.period', 'Periodo')}:</span>
          <button
            type="button"
            onClick={() => updateField('salary_period', 'yearly')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('hiring_goal.annual', 'Annuale')}
          </button>
          <button
            type="button"
            onClick={() => updateField('salary_period', 'monthly')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${!isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('hiring_goal.monthly', 'Mensile')}
          </button>
        </div>
      </div>

      {/* Review */}
      <div className="pt-6 border-t">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{t('hiring_goal.review_title', 'Riepilogo')}</p>
        <div className="rounded-lg bg-secondary/30 p-4 space-y-2 text-sm">
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
      </div>

      {/* XIMA HR checkbox */}
      <div className="border-t pt-4">
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
