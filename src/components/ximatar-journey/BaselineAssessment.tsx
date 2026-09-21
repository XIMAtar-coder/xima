
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Check, AlertCircle, Loader2, RotateCcw, X, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import FieldSelector, { FieldKey } from '@/components/FieldSelector';
import { CV_PROCESSING_VERSION } from '@/lib/legal/consentVersions';
import { log } from '@/lib/log';
import { cn } from '@/lib/utils';
import { Eyebrow, Panel } from '@/components/layout/PageHeader';
import { ASSESSMENT_MC_COUNT, ASSESSMENT_OPEN_COUNT, ASSESSMENT_ESTIMATED_MINUTES } from './assessmentShape';
import { PILLAR_ORDER, pillarShortName } from './pillarLabels';

interface BaselineAssessmentProps {
  onComplete: (step: number) => void;
  onCvUpload: (uploaded: boolean) => void;
}

/**
 * Staged progress for the CV analysis. analyze-cv-guest is a single request
 * that answers after roughly a minute and reports no progress, so these stages
 * advance on elapsed time only. They say what the analysis does, in order; they
 * are deliberately not a percentage, which would claim a precision we don't have.
 */
const CV_STAGES = [
  { key: 'reading', startsAt: 0 },
  { key: 'experience', startsAt: 10 },
  { key: 'pillars', startsAt: 25 },
  { key: 'finalizing', startsAt: 45 },
] as const;

/** After this many seconds the wait is unusual enough to say so and offer a retry. */
const CV_SLOW_AFTER_SECONDS = 90;

const MAX_CV_BYTES = 5 * 1024 * 1024;

const BaselineAssessment: React.FC<BaselineAssessmentProps> = ({ onComplete, onCvUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Bumped on every attempt so a retry restarts the staged messages.
  const [attempt, setAttempt] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(
    typeof window !== 'undefined' && !!sessionStorage.getItem('guest_cv_analysis')
  );
  const [dataConsent, setDataConsent] = useState(false);
  const [field, setField] = useState<FieldKey | null>(null);
  const [fieldMissing, setFieldMissing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldCardRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('preferred_field') as FieldKey | null;
    if (cached) setField(cached);
  }, []);

  // Tick once a second while the analysis runs, to drive the staged messages.
  useEffect(() => {
    if (!uploading) return;
    const startedAt = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [uploading, attempt]);

  // Leaving the page mid-analysis must not leave a request resolving into an
  // unmounted component.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleFieldChange = (value: FieldKey) => {
    setField(value);
    setFieldMissing(false);
  };

  /** The chosen field picks the question set, so nothing can continue without it. */
  const requireField = (): boolean => {
    if (field) return true;
    setFieldMissing(true);
    fieldCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  };

  /** Same rules for a picked and a dropped file: one PDF, up to 5 MB. */
  const acceptFile = (selectedFile: File | undefined) => {
    if (!selectedFile || uploading) return;
    if (selectedFile.type !== 'application/pdf') {
      toast({ title: t('cv.invalid_type', 'Invalid file type'), description: t('cv.pdf_only', 'Please upload a PDF file'), variant: "destructive" });
      return;
    }
    if (selectedFile.size > MAX_CV_BYTES) {
      toast({ title: t('cv.file_too_large', 'File too large'), description: t('cv.max_size', 'Maximum file size is 5MB'), variant: "destructive" });
      return;
    }
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    // Picking the same file again after "Rimuovi" must fire change again.
    e.target.value = '';
  };

  const removeFile = () => {
    if (uploading) return;
    setFile(null);
  };

  const handleUpload = async () => {
    if (!file || !dataConsent) return;
    if (!requireField()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAttempt((n) => n + 1);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Assessment hasn't run yet at step 1 — send whatever the journey produced
      // so the edge can enrich. Missing values are tolerated server-side.
      const guestPillarScores = sessionStorage.getItem('guest_pillar_scores');
      const guestXimatar = sessionStorage.getItem('guest_ximatar');
      const guestXimatarName = sessionStorage.getItem('guest_ximatar_name');
      if (guestPillarScores) formData.append('guest_pillar_scores', guestPillarScores);
      if (guestXimatar) formData.append('guest_ximatar', guestXimatar);
      if (guestXimatarName) formData.append('guest_ximatar_name', guestXimatarName);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-cv-guest`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'x-guest-consent': '1',
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || errorBody.message || `Analysis failed (${response.status})`);
      }

      const data = await response.json();
      if (controller.signal.aborted) return;

      sessionStorage.setItem('guest_cv_filename', file.name);
      sessionStorage.setItem('guest_cv_analysis', JSON.stringify(data));
      sessionStorage.setItem(
        'guest_cv_pillar_scores',
        JSON.stringify(data.identity?.cv_pillar_scores || {})
      );
      sessionStorage.setItem(
        'guest_cv_consent',
        JSON.stringify({
          version: CV_PROCESSING_VERSION,
          locale: i18n.language?.split('-')[0] || 'it',
          accepted_at: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        })
      );

      setUploadComplete(true);
      onCvUpload(true);
      toast({
        title: t('guestCv.completed', 'CV analizzato'),
        description: t('guestCv.success', 'I risultati saranno collegati al tuo profilo al momento della registrazione.'),
      });
      // The questionnaire opens with a short "CV done, here is what comes next"
      // note, so a separate confirmation screen here would only cost a click.
      saveFieldPreference();
      onComplete(1);
    } catch (error) {
      // Cancelled by the user (or superseded by a retry): not an error to report.
      if (controller.signal.aborted) return;
      log.error('[BaselineAssessment] CV upload error:', error);
      toast({
        title: t('common.error', 'Errore'),
        description: error instanceof Error ? error.message : 'Failed to analyze CV',
        variant: 'destructive',
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setUploading(false);
      }
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
  };

  const handleSkip = () => {
    if (!requireField()) return;
    cancelUpload();
    saveFieldPreference();
    onCvUpload(false);
    onComplete(1);
  };

  const handleContinue = () => {
    if (!requireField()) return;
    saveFieldPreference();
    onComplete(1);
  };

  const saveFieldPreference = () => {
    if (!field) return;
    localStorage.setItem('preferred_field', field);
  };

  const handleConsentChange = (checked: boolean | 'indeterminate') => {
    setDataConsent(checked === true);
  };

  const questionnaireShape = {
    mc: ASSESSMENT_MC_COUNT,
    open: ASSESSMENT_OPEN_COUNT,
    minutes: ASSESSMENT_ESTIMATED_MINUTES,
  };

  const currentStageIndex = CV_STAGES.reduce(
    (current, stage, index) => (elapsed >= stage.startsAt ? index : current),
    0
  );
  const isSlow = elapsed >= CV_SLOW_AFTER_SECONDS;
  const canAnalyse = !!file && dataConsent && !uploading;
  const fileSizeMb = file ? (file.size / 1024 / 1024).toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

  const skipLink = (
    <button
      type="button"
      onClick={handleSkip}
      disabled={uploading}
      className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary underline underline-offset-[5px] hover:text-primary/80 disabled:opacity-50"
    >
      {t('baseline.continue_without_cv')}
      <ArrowRight size={14} aria-hidden />
    </button>
  );

  return (
    <div>
      {/* Intro: eyebrow, title, one line, and the no-CV route at the right. */}
      <div className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-[650px]">
          <Eyebrow className="mb-2.5">{t('guestJourney.cv.eyebrow')}</Eyebrow>
          <h1 className="xs-title">{t('guestJourney.cv.title')}</h1>
          <p className="mt-2.5 max-w-[590px] text-[15px] text-muted-foreground">{t('guestJourney.cv.subtitle')}</p>
        </div>
        <div className="shrink-0 sm:pt-1">{skipLink}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
        {/* One panel, two columns: the field at the left, the CV at the right. */}
        <Panel className="grid gap-7 p-5 sm:p-8 md:grid-cols-2 md:gap-0">
          <div ref={fieldCardRef} className="min-w-0 md:pr-8">
            <h2 id="field-legend" className="text-[19px] font-semibold tracking-[-0.4px] text-foreground sm:text-xl">
              {t('guestJourney.cv.field_legend')}
            </h2>
            <p className="mb-5 mt-1.5 max-w-[470px] text-sm text-muted-foreground">{t('guestJourney.cv.field_copy')}</p>
            {fieldMissing && (
              <p className="mb-3 text-sm font-medium text-destructive" role="alert">
                {t('baseline.field_required_error')}
              </p>
            )}
            <FieldSelector value={field} onChange={handleFieldChange} disabled={uploading} invalid={fieldMissing} labelledBy="field-legend" />
          </div>

          <section
            aria-labelledby="upload-title"
            className="min-w-0 border-t border-[hsl(var(--xs-line))] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"
          >
            {!uploadComplete ? (
              <>
                <h2 id="upload-title" className="flex flex-wrap items-center gap-2.5 text-[19px] font-semibold tracking-[-0.4px] text-foreground sm:text-xl">
                  {t('guestJourney.cv.upload_title')}
                  <span className="rounded-[5px] border border-[hsl(var(--xs-line))] px-2 py-0.5 text-xs font-normal tracking-normal text-muted-foreground">
                    {t('guestJourney.cv.optional')}
                  </span>
                </h2>
                <p className="mb-5 mt-1.5 text-sm text-muted-foreground">{t('baseline.cv_duration_hint')}</p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                  className="hidden"
                  aria-label={t('baseline.select_file')}
                />

                {/* Drop zone. */}
                <div
                  onDragEnter={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
                  onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]); }}
                  className={cn(
                    'flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed px-5 py-6 text-center transition-colors',
                    dragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/40 bg-muted/40',
                    uploading && 'opacity-70',
                  )}
                >
                  <FileText size={30} className={cn('mb-1', file ? 'text-primary' : 'text-primary/80')} aria-hidden />
                  <p className="max-w-full break-words text-[15px] font-semibold text-foreground">
                    {file ? file.name : t('guestJourney.cv.drop_title')}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {dragOver
                      ? t('guestJourney.cv.drop_release')
                      : file
                        ? t('guestJourney.cv.file_meta', { size: fileSizeMb })
                        : t('guestJourney.cv.drop_hint')}
                  </p>
                  <div className="mt-1 flex items-center gap-3.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 rounded-md px-4 text-sm"
                    >
                      {file ? t('baseline.change_file') : t('guestJourney.cv.choose')}
                    </Button>
                    {file && (
                      <button
                        type="button"
                        onClick={removeFile}
                        disabled={uploading}
                        className="text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                      >
                        {t('guestJourney.cv.remove')}
                      </button>
                    )}
                  </div>
                </div>
                <p className="pt-3 text-xs text-muted-foreground">{t('guestJourney.cv.file_rule')}</p>

                <p className="py-4 text-[13px] leading-relaxed text-muted-foreground">
                  {t('guestCv.disclaimer', "Il CV è usato solo per calcolare il tuo profilo. Il file non viene conservato sui nostri server: i risultati restano sul tuo dispositivo finché non completi la registrazione.")}
                </p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="data-consent"
                    checked={dataConsent}
                    disabled={uploading}
                    onCheckedChange={handleConsentChange}
                    className="mt-0.5"
                  />
                  <label htmlFor="data-consent" className="cursor-pointer text-sm leading-relaxed text-foreground">
                    {t('guestCv.consent_label', 'Acconsento al trattamento del mio CV per il calcolo del profilo XIMAtar.')}
                  </label>
                </div>

                {uploading && (
                  <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4" aria-live="polite">
                    <h3 className="text-[15px] font-semibold text-foreground">{t('guestJourney.cv.analysing_title')}</h3>
                    <div className="my-3 h-[3px] bg-primary/20" aria-hidden>
                      <span
                        className="block h-full bg-primary transition-[width] duration-500"
                        style={{ width: `${((currentStageIndex + 1) / CV_STAGES.length) * 100}%` }}
                      />
                    </div>
                    <ol className="space-y-1.5">
                      {CV_STAGES.map((stage, index) => {
                        const done = index < currentStageIndex;
                        const active = index === currentStageIndex;
                        return (
                          <li
                            key={stage.key}
                            className={cn(
                              'flex items-center gap-2 text-sm',
                              active ? 'font-semibold text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/60',
                            )}
                          >
                            {done ? (
                              <Check size={15} className="shrink-0 text-green-600" />
                            ) : active ? (
                              <Loader2 size={15} className="shrink-0 animate-spin" />
                            ) : (
                              <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
                            )}
                            {t(`baseline.cv_stage_${stage.key}`)}
                          </li>
                        );
                      })}
                    </ol>

                    {isSlow && (
                      <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3" role="status">
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                        <p className="text-sm text-foreground">{t('baseline.cv_slow')}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {isSlow && (
                        <Button variant="outline" size="sm" onClick={handleUpload} className="h-8 gap-2 rounded-md text-[13px]">
                          <RotateCcw size={14} />
                          {t('baseline.cv_retry')}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={cancelUpload} className="h-8 gap-2 text-[13px]">
                        <X size={14} />
                        {t('baseline.cv_cancel')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2.5">
                  <Button
                    onClick={handleUpload}
                    disabled={!canAnalyse}
                    className="min-h-[48px] w-full rounded-[7px] px-5 text-[15px]"
                  >
                    {uploading ? t('guestJourney.cv.analysing_cta') : t('guestJourney.cv.analyse_cta')}
                    {!uploading && <ArrowRight size={16} aria-hidden />}
                  </Button>
                  {!canAnalyse && !uploading && (
                    <small className="text-center text-xs text-muted-foreground">{t('guestJourney.cv.cta_requirements')}</small>
                  )}
                </div>
              </>
            ) : (
              // Reached only when coming back to this step with a CV already analysed
              // in this session; a fresh upload goes straight to the questionnaire.
              <div className="flex h-full flex-col justify-center gap-4 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Check size={24} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-[19px] font-semibold tracking-[-0.4px] text-foreground sm:text-xl">{t('baseline.cv_done_title')}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t('baseline.cv_done_next', questionnaireShape)}</p>
                </div>
                <Button onClick={handleContinue} className="min-h-[48px] self-start rounded-[7px] px-5 text-[15px]">
                  {t('baseline.start_questionnaire')}
                  <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            )}
          </section>
        </Panel>

        {/* Step summary: time, chosen field, what comes next. */}
        <Panel className="p-6 sm:p-7">
          <Eyebrow>{t('guestJourney.cv.aside_eyebrow')}</Eyebrow>
          <p className="mt-4 text-[48px] font-medium leading-none tracking-[-2.5px] text-foreground">
            {t('guestJourney.cv.aside_minutes')}{' '}
            <span className="text-[20px] tracking-normal">{t('guestJourney.cv.aside_unit')}</span>
          </p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{t('guestJourney.cv.aside_for')}</p>
          <hr className="my-5 border-[hsl(var(--xs-line))]" />
          <h3 className="text-[15px] font-semibold text-foreground">{t('guestJourney.cv.aside_field')}</h3>
          <p className={cn('mt-1.5 text-[15px]', field ? 'text-foreground' : 'text-muted-foreground')}>
            {field ? t(`field.${field}.title`) : t('guestJourney.cv.aside_field_none')}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('guestJourney.cv.aside_field_change')}</p>
          <hr className="my-5 border-[hsl(var(--xs-line))]" />
          <h3 className="text-[15px] font-semibold text-foreground">{t('guestJourney.cv.aside_next')}</h3>
          <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
            {t('guestJourney.cv.aside_next_shape', questionnaireShape)}
            <br />
            {t('guestJourney.cv.aside_next_minutes', questionnaireShape)}
          </p>
          <p className="mt-3 text-[13px] text-muted-foreground">{t('guestJourney.cv.aside_no_cv')}</p>
        </Panel>
      </div>

      {/* Method strip. */}
      <section
        aria-label={t('guestJourney.cv.method_title')}
        className="mt-6 flex flex-col gap-4 rounded-[10px] border border-[hsl(var(--xs-line))] bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <p className="text-[13px] text-muted-foreground">
          <strong className="font-semibold text-foreground">{t('guestJourney.cv.method_title')}</strong>
          <br />
          {t('guestJourney.cv.method_body')}
        </p>
        <ul className="flex flex-wrap gap-2">
          {PILLAR_ORDER.map((id) => (
            <li key={id} className="rounded border border-[hsl(var(--xs-line))] px-2.5 py-1 text-xs text-muted-foreground">
              {pillarShortName(t, id)}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-5 text-xs text-muted-foreground">
        {t('guestJourney.step_of', { step: 1, total: 3 })} · {t('guestJourney.no_account_needed')}
      </p>
    </div>
  );
};

export default BaselineAssessment;
