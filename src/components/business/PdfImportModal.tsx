import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useJobPostPdfImport } from '@/hooks/useJobPostPdfImport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Bug } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PdfImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback after successful import (before redirect) */
  onSuccess?: () => void;
}

export default function PdfImportModal({ open, onOpenChange, onSuccess }: PdfImportModalProps) {
  const { t } = useTranslation();
  
  const {
    status,
    progress,
    selectedFile,
    errorMessage,
    debugInfo,
    isDebugMode,
    fileInputRef,
    handleFileSelect,
    handleImport,
    resetState,
    redirectToJob,
  } = useJobPostPdfImport({ redirectOnSuccess: true });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleImportClick = async () => {
    const jobId = await handleImport();
    if (jobId) {
      onSuccess?.();
      onOpenChange(false);
      // Hook already handles redirect
    }
  };

  const handleViewJob = () => {
    onOpenChange(false);
    redirectToJob();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'extracting':
        return t('business.pdf_import.extracting_text');
      case 'uploading':
        return t('business.pdf_import.uploading');
      case 'processing':
        return t('business.pdf_import.processing');
      default:
        return '';
    }
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
          {(status === 'extracting' || status === 'uploading' || status === 'processing') && (
            <div className="space-y-4 text-center py-4">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {getStatusMessage()}
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
                  {t('business.pdf_import.redirecting_to_draft')}
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

          {/* Debug Info (only shown in debug mode) */}
          {isDebugMode && debugInfo && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Info
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-muted rounded-lg text-xs font-mono space-y-2">
                  <div>
                    <strong>Pages:</strong> {debugInfo.pageCount}
                  </div>
                  <div>
                    <strong>Text Length:</strong> {debugInfo.extractedTextLength} chars
                  </div>
                  <div>
                    <strong>Detected Headings:</strong>
                    {debugInfo.detectedHeadings.length > 0 ? (
                      <ul className="ml-4 mt-1">
                        {debugInfo.detectedHeadings.map((h, i) => (
                          <li key={i}>• {h}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground ml-2">None</span>
                    )}
                  </div>
                  <div>
                    <strong>Preview:</strong>
                    <pre className="mt-1 p-2 bg-background rounded text-[10px] whitespace-pre-wrap max-h-40 overflow-auto">
                      {debugInfo.textPreview}
                    </pre>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleImportClick} disabled={!selectedFile}>
                <Upload className="h-4 w-4 mr-2" />
                {t('business.pdf_import.import_button')}
              </Button>
            </>
          )}
          
          {status === 'success' && (
            <Button onClick={handleViewJob}>
              {t('business.pdf_import.view_job')}
            </Button>
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
