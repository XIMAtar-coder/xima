import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CV_PROCESSING_VERSION } from '@/lib/legal/consentVersions';

/**
 * Guest CV upload — used in /ximatar-journey BEFORE registration.
 * Calls the anonymous analyze-cv-guest edge function and stores the
 * resulting analysis in sessionStorage under `guest_cv_*`. The data is
 * claimed at register time by syncGuestCvToProfile().
 *
 * GDPR: the original PDF file is never persisted server-side. Only the
 * structured analysis result is kept on the user's device until they
 * register (Option A — no orphan rows).
 */
export const GuestCvUpload: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [consent, setConsent] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(
    typeof window !== 'undefined' && !!sessionStorage.getItem('guest_cv_analysis')
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!consent) {
      toast({
        title: t('guestCv.error_consent_required_title', 'Consenso richiesto'),
        description: t('guestCv.error_consent_required', 'Accetta il trattamento del CV per procedere.'),
        variant: 'destructive',
      });
      return;
    }

    const guestPillarScores = sessionStorage.getItem('guest_pillar_scores');
    const guestXimatar = sessionStorage.getItem('guest_ximatar');
    const guestXimatarName = sessionStorage.getItem('guest_ximatar_name');

    if (!guestPillarScores || !guestXimatar) {
      toast({
        title: t('common.error', 'Errore'),
        description: t('guestCv.error_assessment_required', "Completa prima l'assessment XIMAtar."),
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('guest_pillar_scores', guestPillarScores);
      formData.append('guest_ximatar', guestXimatar);
      if (guestXimatarName) formData.append('guest_ximatar_name', guestXimatarName);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-cv-guest`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'x-guest-consent': '1',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || errorBody.message || `Analysis failed (${response.status})`);
      }

      const data = await response.json();

      // Persist guest CV blob until register-time claim
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

      setCompleted(true);
      toast({
        title: t('guestCv.completed', 'CV analizzato'),
        description: t(
          'guestCv.success',
          'I risultati saranno collegati al tuo profilo al momento della registrazione.'
        ),
      });
    } catch (error) {
      console.error('[GuestCvUpload]', error);
      toast({
        title: t('common.error', 'Errore'),
        description: error instanceof Error ? error.message : 'Failed to analyze CV',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('guestCv.title', 'Carica il tuo CV (opzionale)')}</CardTitle>
      </CardHeader>
      <CardContent>
        {completed ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('guestCv.completed', 'CV analizzato')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(
                'guestCv.disclaimer',
                "Il CV è usato solo per calcolare il tuo profilo. Il file non viene conservato sui nostri server: i risultati restano sul tuo dispositivo finché non completi la registrazione."
              )}
            </p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <span>
                {t(
                  'guestCv.consent_label',
                  'Acconsento al trattamento del mio CV per il calcolo del profilo XIMAtar.'
                )}
              </span>
            </label>
            <Button
              disabled={!consent || analyzing}
              className="w-full"
              onClick={() => document.getElementById('guest-cv-upload')?.click()}
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('cv_analysis.analyzing', 'Analisi in corso...')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('guestCv.upload_button', 'Carica CV ora (opzionale)')}
                </>
              )}
            </Button>
            <input
              id="guest-cv-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GuestCvUpload;
