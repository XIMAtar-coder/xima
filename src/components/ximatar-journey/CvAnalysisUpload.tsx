import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseFunctionErrorMessage } from '@/lib/supabaseFunctionError';

interface CvAnalysisUploadProps {
  userId: string;
}

export const CvAnalysisUpload: React.FC<CvAnalysisUploadProps> = ({ userId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      setUploading(false);
      setAnalyzing(true);
      toast({ title: t('cv_analysis.analyzing', 'Analyzing your CV...') });

      // Send file directly as FormData to the edge function
      // The edge function handles storage upload + AI analysis
      const formData = new FormData();
      formData.append('file', file);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Authentication required. Please refresh the page and try again.');
      }

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

      if (data._budget?.exceeded) {
        toast({
          title: t('cv_analysis.complete', 'CV Analysis Complete!'),
          description: t('cv_analysis.cached', 'Showing your most recent analysis (monthly limit reached).'),
        });
      } else {
        toast({
          title: t('cv_analysis.complete', 'CV Analysis Complete!'),
          description: t('cv_analysis.success', 'Your CV has been analyzed successfully.'),
        });
      }

      setCompleted(true);
    } catch (error) {
      console.error('CV Upload Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze CV';
      toast({
        title: t('common.error', 'Error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
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
            <Button
              disabled={uploading || analyzing}
              className="w-full"
              onClick={() => document.getElementById('cv-upload')?.click()}
            >
              {(uploading || analyzing) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {analyzing ? t('cv_analysis.analyzing', 'Analyzing...') : t('cv_analysis.uploading', 'Uploading...')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('cv_analysis.upload_button', 'Upload CV')}
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
