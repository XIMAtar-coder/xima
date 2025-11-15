import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CvAnalysisUploadProps {
  userId: string;
}

export const CvAnalysisUpload: React.FC<CvAnalysisUploadProps> = ({ userId }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cv-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cv-uploads')
        .getPublicUrl(fileName);

      setUploading(false);
      setAnalyzing(true);

      toast({ title: t('cv_analysis.analyzing', 'Analyzing your CV...') });

      // Call analyze-cv edge function
      const { data, error } = await supabase.functions.invoke('analyze-cv', {
        body: { file_url: publicUrl, lang: i18n.language.split('-')[0], user_id: userId }
      });

      if (error) throw error;

      setCompleted(true);
      toast({ 
        title: t('cv_analysis.complete', 'CV Analysis Complete!'),
        description: t('cv_analysis.success', 'Your CV has been analyzed successfully.')
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : 'Failed to analyze CV',
        variant: 'destructive'
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
