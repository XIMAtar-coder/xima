import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface ImportedJobData {
  id: string;
  title: string;
  description: string | null;
  responsibilities: string | null;
  requirements_must: string | null;
  requirements_nice: string | null;
  benefits: string | null;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  department: string | null;
  salary_range: string | null;
}

interface PdfImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** If provided, will fetch the imported job and call this instead of navigating */
  onImportComplete?: (jobData: ImportedJobData) => void;
}

type ImportStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export default function PdfImportModal({ open, onOpenChange, onSuccess, onImportComplete }: PdfImportModalProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const resetState = () => {
    setStatus('idle');
    setProgress(0);
    setSelectedFile(null);
    setErrorMessage('');
    setCreatedJobId(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: t('business.pdf_import.invalid_file_type'),
          description: t('business.pdf_import.only_pdf_allowed'),
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('business.pdf_import.file_too_large'),
          description: t('business.pdf_import.max_size_10mb'),
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !user) return;

    try {
      setStatus('uploading');
      setProgress(10);

      // Upload PDF to storage
      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('job_posts_pdfs')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setProgress(30);

      // Create import record
      const { data: importRecord, error: insertError } = await supabase
        .from('business_job_post_imports')
        .insert({
          business_id: user.id,
          pdf_path: filePath,
          status: 'queued',
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setProgress(50);
      setStatus('processing');

      // Call edge function to process PDF
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://iyckvvnecpnldrxqmzta.supabase.co/functions/v1/import-job-post-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ importId: importRecord.id }),
        }
      );

      setProgress(80);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      setProgress(100);
      setStatus('success');
      setCreatedJobId(result.jobPostId);

      toast({
        title: t('business.pdf_import.success'),
        description: t('business.pdf_import.job_created'),
      });

      onSuccess?.();

    } catch (error: any) {
      console.error('Import error:', error);
      setStatus('error');
      setErrorMessage(error.message || t('business.pdf_import.unknown_error'));
      toast({
        title: t('business.pdf_import.error'),
        description: error.message || t('business.pdf_import.unknown_error'),
        variant: 'destructive',
      });
    }
  };

  const handleViewJob = async () => {
    if (createdJobId) {
      // If onImportComplete is provided, fetch job data and call it
      if (onImportComplete) {
        try {
          const { data: jobData, error } = await supabase
            .from('job_posts')
            .select('id, title, description, responsibilities, requirements_must, requirements_nice, benefits, location, employment_type, seniority, department, salary_range')
            .eq('id', createdJobId)
            .single();
          
          if (error) throw error;
          
          onOpenChange(false);
          resetState();
          onImportComplete(jobData as ImportedJobData);
        } catch (error) {
          console.error('Error fetching imported job:', error);
          // Fallback to navigation
          onOpenChange(false);
          navigate(`/opportunities/${createdJobId}`);
        }
      } else {
        onOpenChange(false);
        navigate(`/opportunities/${createdJobId}`);
      }
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('business.pdf_import.title')}
          </DialogTitle>
          <DialogDescription>
            {t('business.pdf_import.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload Area */}
          {status === 'idle' && (
            <>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  {t('business.pdf_import.drop_or_click')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('business.pdf_import.pdf_only')}
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Processing State */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="space-y-4 text-center py-4">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {status === 'uploading' 
                    ? t('business.pdf_import.uploading')
                    : t('business.pdf_import.processing')
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('business.pdf_import.please_wait')}
                </p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600">
                  {t('business.pdf_import.success')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('business.pdf_import.job_created_desc')}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-4 space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {t('business.pdf_import.error')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleImport} disabled={!selectedFile}>
                <Upload className="h-4 w-4 mr-2" />
                {t('business.pdf_import.import_button')}
              </Button>
            </>
          )}
          
          {status === 'success' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('common.close')}
              </Button>
              <Button onClick={handleViewJob}>
                {onImportComplete 
                  ? t('business.pdf_import.use_imported_data')
                  : t('business.pdf_import.view_job')
                }
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('common.close')}
              </Button>
              <Button onClick={resetState}>
                {t('business.pdf_import.try_again')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
