
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Check, AlertCircle, SkipForward, Clock, Loader2, RotateCcw, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import FieldSelector, { FieldKey } from '@/components/FieldSelector';
import { CV_PROCESSING_VERSION } from '@/lib/legal/consentVersions';
import { log } from '@/lib/log';
import { ASSESSMENT_MC_COUNT, ASSESSMENT_OPEN_COUNT, ASSESSMENT_ESTIMATED_MINUTES } from './assessmentShape';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast({ title: t('cv.invalid_type', 'Invalid file type'), description: t('cv.pdf_only', 'Please upload a PDF file'), variant: "destructive" });
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({ title: t('cv.file_too_large', 'File too large'), description: t('cv.max_size', 'Maximum file size is 5MB'), variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground">{t('baseline.title')}</h2>
        <p className="text-muted-foreground sm:text-lg">
          {t('baseline.subtitle')}
        </p>
      </div>

      <div ref={fieldCardRef}>
        <Card className={`p-4 sm:p-6 border-2 ${fieldMissing ? 'border-destructive' : ''}`}>
          <p
            className={`mb-3 text-sm font-medium ${fieldMissing ? 'text-destructive' : 'text-muted-foreground'}`}
            role={fieldMissing ? 'alert' : undefined}
          >
            {fieldMissing ? t('baseline.field_required_error') : t('baseline.field_required_note')}
          </p>
          <FieldSelector value={field} onChange={handleFieldChange} disabled={uploading} />
        </Card>
      </div>

      {!uploadComplete ? (
        <div className="space-y-6">
          <Card className="p-4 sm:p-6 border-2 border-dashed border-border bg-muted/30">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />

            {/* Going on without a CV is a first-class choice, so it sits at the top
                of the upload area rather than below the whole form. */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <h3 className="text-lg font-medium text-foreground">{t('baseline.upload_cv_optional')}</h3>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={14} className="shrink-0" />
                  {t('baseline.cv_duration_hint')}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex items-center gap-2 self-start sm:self-auto"
              >
                <SkipForward size={16} />
                {t('baseline.continue_without_cv')}
              </Button>
            </div>

            {uploading ? (
              <div className="space-y-4" aria-live="polite">
                <ol className="space-y-2">
                  {CV_STAGES.map((stage, index) => {
                    const done = index < currentStageIndex;
                    const active = index === currentStageIndex;
                    return (
                      <li
                        key={stage.key}
                        className={`flex items-center gap-2 text-sm ${
                          active ? 'font-medium text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/60'
                        }`}
                      >
                        {done ? (
                          <Check size={16} className="shrink-0 text-green-600" />
                        ) : active ? (
                          <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                        )}
                        {t(`baseline.cv_stage_${stage.key}`)}
                      </li>
                    );
                  })}
                </ol>

                {isSlow && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3" role="status">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-sm text-foreground">{t('baseline.cv_slow')}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {isSlow && (
                    <Button variant="outline" size="sm" onClick={handleUpload} className="gap-2">
                      <RotateCcw size={14} />
                      {t('baseline.cv_retry')}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={cancelUpload} className="gap-2">
                    <X size={14} />
                    {t('baseline.cv_cancel')}
                  </Button>
                </div>
              </div>
            ) : !file ? (
              <div className="text-center space-y-4">
                <FileText size={40} className="text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">{t('baseline.file_format')}</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Upload size={16} className="mr-2" />
                  {t('baseline.select_file')}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <FileText size={32} className="text-primary mx-auto" />
                <div>
                  <p className="text-lg font-medium text-foreground break-words">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('baseline.change_file')}
                </Button>
              </div>
            )}
          </Card>

          {file && !uploading && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-primary mt-0.5 shrink-0" size={20} />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('guestCv.disclaimer', "Il CV è usato solo per calcolare il tuo profilo. Il file non viene conservato sui nostri server: i risultati restano sul tuo dispositivo finché non completi la registrazione.")}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="data-consent"
                      checked={dataConsent}
                      onCheckedChange={handleConsentChange}
                    />
                    <label
                      htmlFor="data-consent"
                      className="text-sm text-foreground cursor-pointer"
                    >
                      {t('guestCv.consent_label', 'Acconsento al trattamento del mio CV per il calcolo del profilo XIMAtar.')}
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {file && !uploading && (
            <div className="flex justify-center">
              <Button
                onClick={handleUpload}
                disabled={!dataConsent}
                className="bg-primary hover:bg-primary/90"
              >
                <Upload size={16} className="mr-2" />
                {t('baseline.upload_continue')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Reached only when coming back to this step with a CV already analysed
        // in this session; a fresh upload goes straight to the questionnaire.
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">{t('baseline.cv_done_title')}</h3>
            <p className="text-muted-foreground">
              {t('baseline.cv_done_next', questionnaireShape)}
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleContinue}
            className="bg-primary hover:bg-primary/90"
          >
            {t('baseline.start_questionnaire')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BaselineAssessment;
