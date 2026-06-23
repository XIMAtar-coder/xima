import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCvAnalysisJob } from '@/hooks/useCvAnalysisJob';

interface CvAnalysisUploadProps {
  userId: string;
}

export const CvAnalysisUpload: React.FC<CvAnalysisUploadProps> = ({ userId: _userId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const job = useCvAnalysisJob(activeJobId);
  const analyzing = submitting || job.status === 'processing';

  useEffect(() => {
    if (job.status === 'done') {
      setCompleted(true);
      setErrorMsg(null);
      toast({
        title: t('cv_analysis.complete', 'CV Analysis Complete!'),
        description: t('cv_analysis.success', 'Your CV has been analyzed successfully.'),
      });
      setActiveJobId(null);
    } else if (job.status === 'error' || job.status === 'stale') {
      const msg = job.errorMessage || (t('cv_analysis.failed', 'CV analysis failed. Please retry.') as string);
      setErrorMsg(msg);
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
      setActiveJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.status]);

  const triggerUpload = () => document.getElementById('cv-upload')?.click();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setErrorMsg(null);
    setActiveJobId(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Authentication required. Please refresh the page and try again.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-cv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || errorBody.message || `Analysis failed (${response.status})`);
      }

      const data = await response.json();

      // Cached path (budget exceeded but cached): treat as complete
      if (data?.success && !data?.cv_upload_id) {
        setCompleted(true);
        toast({
          title: t('cv_analysis.complete', 'CV Analysis Complete!'),
          description: t('cv_analysis.cached', 'Showing your most recent analysis (monthly limit reached).'),
        });
        return;
      }

      if (!data?.cv_upload_id) throw new Error(data?.error || 'CV analysis failed to start.');

      setActiveJobId(data.cv_upload_id as string);
      toast({
        title: t('cv_analysis.analyzing', 'Analyzing your CV...'),
        description: t('cv_analysis.bg_running', 'Running in the background — you can stay on this page.'),
      });
    } catch (error) {
      console.error('CV Upload Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze CV';
      setErrorMsg(message);
      toast({ title: t('common.error', 'Error'), description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
      const input = document.getElementById('cv-upload') as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cv_analysis.title', 'Upload Your CV for Enhanced Analysis')}</CardTitle>
      </CardHeader>
      <CardContent>
        {completed ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('cv_analysis.complete', 'CV Analysis Complete!')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('cv_analysis.description', 'Upload your CV to get personalized insights based on your professional experience.')}
            </p>

            {errorMsg && (
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}

            <Button disabled={analyzing} className="w-full" onClick={triggerUpload}>
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {submitting
                    ? t('cv_analysis.uploading', 'Uploading...')
                    : t('cv_analysis.analyzing', 'Analyzing...')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {errorMsg
                    ? t('cv_analysis.retry', 'Retry')
                    : t('cv_analysis.upload_button', 'Upload CV')}
                </>
              )}
            </Button>

            <input
              id="cv-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
