import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Target, Users, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';

const TOTAL_STEPS = 5;

interface FormData {
  role_title: string;
  task_description: string;
  responsibilities: string[];
  experience_level: string;
  work_model: string;
  country: string;
  city_region: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  salary_period: string;
}

const HiringGoalCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    role_title: '',
    task_description: '',
    responsibilities: [],
    experience_level: '',
    work_model: '',
    country: '',
    city_region: '',
    salary_min: 0,
    salary_max: 0,
    salary_currency: 'EUR',
    salary_period: 'yearly',
  });

  const updateField = (field: keyof FormData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

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

      const { data: goal, error } = await supabase
        .from('hiring_goal_drafts')
        .insert({
          business_id: user.id,
          role_title: formData.role_title,
          task_description: [formData.task_description, ...formData.responsibilities].filter(Boolean).join('\n• '),
          experience_level: formData.experience_level,
          work_model: formData.work_model,
          country: formData.country,
          city_region: formData.city_region,
          salary_min: formData.salary_min,
          salary_max: formData.salary_max,
          salary_currency: formData.salary_currency,
          salary_period: formData.salary_period,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('hiring_goal.created', 'Obiettivo creato con successo'));
      navigate(`/business/goals/${goal.id}/candidates`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          {step === 0 && <Step0Role formData={formData} updateField={updateField} />}
          {step === 1 && <Step1Responsibilities formData={formData} updateField={updateField} />}
          {step === 2 && <Step2SeniorityWorkMode formData={formData} updateField={updateField} />}
          {step === 3 && <Step3Location formData={formData} updateField={updateField} />}
          {step === 4 && <Step4SalaryReview formData={formData} updateField={updateField} />}
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
                : t('hiring_goal.create_and_shortlist', 'Crea e Genera Shortlist')}
            </Button>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
};

// STEP 0 — Role title
const Step0Role = ({ formData, updateField }: { formData: FormData; updateField: (f: keyof FormData, v: any) => void }) => {
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
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('hiring_goal.role_summary', 'Sintesi del ruolo (opzionale)')}
        </label>
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

// STEP 1 — Responsibilities
const Step1Responsibilities = ({ formData, updateField }: { formData: FormData; updateField: (f: keyof FormData, v: any) => void }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const SUGGESTIONS = [
    t('hiring_goal.suggestion_pipeline', 'Gestire pipeline commerciale'),
    t('hiring_goal.suggestion_conversion', 'Migliorare conversion rate'),
    t('hiring_goal.suggestion_team', 'Guidare un piccolo team'),
    t('hiring_goal.suggestion_partnerships', 'Sviluppare partnership'),
    t('hiring_goal.suggestion_reports', 'Automatizzare reportistica'),
    t('hiring_goal.suggestion_strategy', 'Definire strategia di prodotto'),
  ];

  const add = (text: string) => {
    if (!text.trim() || formData.responsibilities.includes(text)) return;
    updateField('responsibilities', [...formData.responsibilities, text]);
    setInput('');
  };

  const remove = (i: number) => {
    updateField('responsibilities', formData.responsibilities.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
          <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('hiring_goal.step1_title', 'Quali sono le responsabilità chiave?')}</h2>
          <p className="text-sm text-muted-foreground">{t('hiring_goal.step1_subtitle', 'Aggiungi 2-5 responsabilità.')}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('hiring_goal.suggestions', 'Suggerimenti comuni')}</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              disabled={formData.responsibilities.includes(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-secondary hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t('hiring_goal.add_custom', 'Oppure scrivi una responsabilità')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
            placeholder={t('hiring_goal.custom_placeholder', 'es. Negoziare contratti enterprise')}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
          />
          <Button type="button" onClick={() => add(input)}>{t('common.add', 'Aggiungi')}</Button>
        </div>
      </div>

      {formData.responsibilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('hiring_goal.selected', 'Selezionate')} ({formData.responsibilities.length})
          </p>
          {formData.responsibilities.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">{i + 1}</div>
              <span className="flex-1 text-sm text-foreground">{r}</span>
              <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// STEP 2 — Seniority + Work mode
const Step2SeniorityWorkMode = ({ formData, updateField }: { formData: FormData; updateField: (f: keyof FormData, v: any) => void }) => {
  const { t } = useTranslation();
  const seniorities = [
    { value: 'first_time', label: t('hiring_goal.seniority_first_time', 'Prima esperienza'), desc: t('hiring_goal.seniority_first_time_desc', '0-2 anni, in apprendimento') },
    { value: 'independent', label: t('hiring_goal.seniority_independent', 'Autonomo'), desc: t('hiring_goal.seniority_independent_desc', '3-7 anni, lavora in autonomia') },
    { value: 'led_others', label: t('hiring_goal.seniority_led_others', 'Ha guidato altri'), desc: t('hiring_goal.seniority_led_others_desc', '7+ anni, esperienza di leadership') },
  ];

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
    </div>
  );
};

// STEP 3 — Location
const Step3Location = ({ formData, updateField }: { formData: FormData; updateField: (f: keyof FormData, v: any) => void }) => {
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

// STEP 4 — Salary + Review
const Step4SalaryReview = ({ formData, updateField }: { formData: FormData; updateField: (f: keyof FormData, v: any) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('hiring_goal.step4_title', 'Range salariale')}</h2>
          <p className="text-sm text-muted-foreground">{t('hiring_goal.step4_subtitle', 'I candidati vedono il range.')}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          {t('hiring_goal.salary_range', 'Range')} <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-2 items-center">
          <input type="number" min="0" step="1000" value={formData.salary_min || ''}
            onChange={e => updateField('salary_min', Number(e.target.value))} placeholder="Min"
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
          <span className="text-muted-foreground">—</span>
          <input type="number" min="0" step="1000" value={formData.salary_max || ''}
            onChange={e => updateField('salary_max', Number(e.target.value))} placeholder="Max"
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
          <select value={formData.salary_currency} onChange={e => updateField('salary_currency', e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none">
            <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
          </select>
          <select value={formData.salary_period} onChange={e => updateField('salary_period', e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none">
            <option value="yearly">{t('hiring_goal.annual', 'Annuale')}</option>
            <option value="monthly">{t('hiring_goal.monthly', 'Mensile')}</option>
          </select>
        </div>
      </div>

      {/* Review */}
      <div className="pt-6 border-t">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{t('hiring_goal.review_title', 'Riepilogo')}</p>
        <div className="rounded-lg bg-secondary/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_role', 'Ruolo')}:</span><span className="font-medium text-foreground">{formData.role_title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_seniority', 'Seniority')}:</span><span className="font-medium capitalize text-foreground">{formData.experience_level}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_mode', 'Modalità')}:</span><span className="font-medium capitalize text-foreground">{formData.work_model}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_location', 'Località')}:</span><span className="font-medium text-foreground">{[formData.city_region, formData.country].filter(Boolean).join(', ')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('hiring_goal.review_responsibilities', 'Responsabilità')}:</span><span className="font-medium text-foreground">{formData.responsibilities.length}</span></div>
        </div>
      </div>
    </div>
  );
};

export default HiringGoalCreate;
