
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Check, AlertCircle, SkipForward } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import FieldSelector, { FieldKey } from '@/components/FieldSelector';
import { CV_PROCESSING_VERSION } from '@/lib/legal/consentVersions';

interface BaselineAssessmentProps {
  onComplete: (step: number) => void;
  onCvUpload: (uploaded: boolean) => void;
}

const BaselineAssessment: React.FC<BaselineAssessmentProps> = ({ onComplete, onCvUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(
    typeof window !== 'undefined' && !!sessionStorage.getItem('guest_cv_analysis')
  );
  const [dataConsent, setDataConsent] = useState(false);
  const [field, setField] = useState<FieldKey | null>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cached = localStorage.getItem('preferred_field') as FieldKey | null;
    if (cached) setField(cached);
  }, []);

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
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || errorBody.message || `Analysis failed (${response.status})`);
      }

      const data = await response.json();

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
    } catch (error) {
      console.error('[BaselineAssessment] CV upload error:', error);
      toast({
        title: t('common.error', 'Errore'),
        description: error instanceof Error ? error.message : 'Failed to analyze CV',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    if (!field) return;
    saveFieldPreference();
    onCvUpload(false);
    onComplete(1);
  };

  const handleContinue = () => {
    if (!field) return;
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4 text-foreground">{t('baseline.title')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('baseline.subtitle')}
        </p>
      </div>

      <Card className="p-6 border-2">
        <FieldSelector value={field} onChange={setField} disabled={uploading} />
      </Card>

      {!uploadComplete ? (
        <div className="space-y-6">
          <Card className="p-6 border-2 border-dashed border-border bg-muted/30">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            
            {!file ? (
              <div className="text-center space-y-4">
                <FileText size={48} className="text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-foreground">{t('baseline.upload_cv')}</h3>
                  <p className="text-sm text-muted-foreground">{t('baseline.file_format')}</p>
                </div>
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
                  <h3 className="text-lg font-medium text-foreground">{file.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {t('baseline.change_file')}
                </Button>
              </div>
            )}
          </Card>

          {file && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-primary mt-0.5" size={20} />
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

          <div className="flex justify-center gap-4">
            <Button 
              variant="outline"
              onClick={handleSkip}
              disabled={!field || uploading}
              className="flex items-center gap-2"
            >
              <SkipForward size={16} />
              {t('baseline.skip_for_now')}
            </Button>
            
            {file && (
              <Button 
                onClick={handleUpload}
                disabled={!field || uploading || !dataConsent}
                className="bg-primary hover:bg-primary/90"
              >
                {uploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('baseline.processing')}
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    {t('baseline.upload_continue')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">{t('baseline.complete_title')}</h3>
            <p className="text-muted-foreground">
              {t('baseline.complete_text')}
            </p>
          </div>
          
          <Button 
            size="lg"
            onClick={handleContinue}
            disabled={!field}
            className="bg-primary hover:bg-primary/90"
          >
            {t('baseline.continue_assessment')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BaselineAssessment;
