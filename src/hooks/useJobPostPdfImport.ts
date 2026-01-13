import { useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { 
  extractTextFromPdf, 
  validateExtractedText, 
  getTextPreview,
  detectHeadings 
} from '@/lib/pdfTextExtractor';

export type ImportStatus = 'idle' | 'extracting' | 'uploading' | 'processing' | 'success' | 'error';

interface UseJobPostPdfImportOptions {
  /** After successful import, redirect to Jobs page with the job post drawer open */
  redirectOnSuccess?: boolean;
}

interface DebugInfo {
  extractedTextLength: number;
  textPreview: string;
  detectedHeadings: string[];
  pageCount: number;
}

export function useJobPostPdfImport(options: UseJobPostPdfImportOptions = { redirectOnSuccess: true }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isDebugMode = searchParams.get('debug') === '1';
  
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const resetState = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setSelectedFile(null);
    setErrorMessage('');
    setCreatedJobId(null);
    setDebugInfo(null);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast({
        title: t('business.pdf_import.invalid_file_type'),
        description: t('business.pdf_import.only_pdf_allowed'),
        variant: 'destructive',
      });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('business.pdf_import.file_too_large'),
        description: t('business.pdf_import.max_size_10mb'),
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [t, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setDebugInfo(null);
    }
  }, [validateFile]);

  const handleImport = useCallback(async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    try {
      // Step 1: Extract text client-side using PDF.js
      setStatus('extracting');
      setProgress(5);

      const extractionResult = await extractTextFromPdf(selectedFile);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error || t('business.pdf_import.extraction_failed'));
      }

      setProgress(15);

      // Validate extracted text
      const validation = validateExtractedText(extractionResult.text);
      
      // Set debug info
      const headings = detectHeadings(extractionResult.text);
      setDebugInfo({
        extractedTextLength: extractionResult.text.length,
        textPreview: getTextPreview(extractionResult.text),
        detectedHeadings: headings,
        pageCount: extractionResult.pageCount,
      });

      if (!validation.valid) {
        setStatus('error');
        const errorMsg = validation.reason || t('business.pdf_import.no_extractable_text');
        setErrorMessage(errorMsg);
        toast({
          title: t('business.pdf_import.extraction_error'),
          description: errorMsg,
          variant: 'destructive',
        });
        return null;
      }

      // Step 2: Upload PDF to storage
      setStatus('uploading');
      setProgress(25);

      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('job_posts_pdfs')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setProgress(40);

      // Step 3: Create import record
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

      setProgress(55);
      setStatus('processing');

      // Step 4: Call edge function with extracted text
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://iyckvvnecpnldrxqmzta.supabase.co/functions/v1/import-job-post-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ 
            importId: importRecord.id,
            extracted_text: extractionResult.text,
            locale: navigator.language?.split('-')[0] || 'en',
          }),
        }
      );

      setProgress(85);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      setProgress(100);
      setStatus('success');
      const jobId = result.job_post_id;
      setCreatedJobId(jobId);

      toast({
        title: t('business.pdf_import.redirect_to_draft_toast'),
        description: t('business.pdf_import.job_created'),
      });

      // Auto-redirect if enabled
      if (options.redirectOnSuccess && jobId) {
        navigate(`/business/jobs?jobPostId=${jobId}`);
      }

      return jobId;
    } catch (error: any) {
      console.error('Import error:', error);
      setStatus('error');
      
      // Handle auth errors gracefully
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setErrorMessage(t('common.login_required'));
      } else {
        setErrorMessage(error.message || t('business.pdf_import.unknown_error'));
      }
      
      toast({
        title: t('business.pdf_import.error'),
        description: error.message || t('business.pdf_import.unknown_error'),
        variant: 'destructive',
      });
      
      return null;
    }
  }, [selectedFile, user, t, toast, navigate, options.redirectOnSuccess]);

  const redirectToJob = useCallback(() => {
    if (createdJobId) {
      navigate(`/business/jobs?jobPostId=${createdJobId}`);
    }
  }, [createdJobId, navigate]);

  return {
    // State
    status,
    progress,
    selectedFile,
    errorMessage,
    createdJobId,
    debugInfo,
    isDebugMode,
    
    // Refs
    fileInputRef,
    
    // Actions
    handleFileSelect,
    handleImport,
    resetState,
    redirectToJob,
    validateFile,
  };
}
