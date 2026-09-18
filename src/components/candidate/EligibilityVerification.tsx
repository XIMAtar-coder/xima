import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCandidateEligibility } from '@/hooks/useCandidateEligibility';
import { useHiringGoalRequirements } from '@/hooks/useHiringGoalRequirements';
import { 
  GraduationCap, Award, Languages, Upload, FileCheck, 
  Clock, CheckCircle2, XCircle, Loader2, AlertTriangle,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EligibilityVerificationProps {
  hiringGoalId: string;
  businessId: string;
  onComplete?: () => void;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const EligibilityVerification: React.FC<EligibilityVerificationProps> = ({
  hiringGoalId,
  businessId,
  onComplete
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { requirements, loading: reqLoading } = useHiringGoalRequirements(hiringGoalId);
  const { 
    eligibility, 
    documents, 
    loading: eligLoading,
    createOrUpdateEligibility,
    uploadDocument,
    submitForReview 
  } = useCandidateEligibility(hiringGoalId);

  const [useCvFallback, setUseCvFallback] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [languageLevel, setLanguageLevel] = useState('B1');
  const [languageNotes, setLanguageNotes] = useState('');

  useEffect(() => {
    if (eligibility) {
      setLanguageLevel(eligibility.language_level || 'B1');
      setLanguageNotes(eligibility.language_notes || '');
    }
  }, [eligibility]);

  const loading = reqLoading || eligLoading;

  // Initialize eligibility record if needed
  useEffect(() => {
    const initEligibility = async () => {
      if (!eligLoading && !eligibility && requirements) {
        await createOrUpdateEligibility({ status: 'not_started' }, businessId);
      }
    };
    initEligibility();
  }, [eligLoading, eligibility, requirements, createOrUpdateEligibility, businessId]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: 'education' | 'certificate' | 'cv'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: t('eligibility.upload.pdf_only'),
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('eligibility.upload.file_too_large'),
        variant: 'destructive'
      });
      return;
    }

    setUploading(docType);
    try {
      await uploadDocument(file, docType, file.name);
      toast({
        title: t('eligibility.upload.success'),
        description: file.name
      });
    } catch (error: any) {
      toast({
        title: t('eligibility.upload.error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Save language info if required
      if (requirements?.language_required) {
        await createOrUpdateEligibility({
          language_level: languageLevel,
          language_notes: languageNotes
        }, businessId);
      }

      await submitForReview();
      toast({
        title: t('eligibility.submit.success_title'),
        description: t('eligibility.submit.success_desc')
      });
      onComplete?.();
    } catch (error: any) {
      toast({
        title: t('eligibility.submit.error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDocumentsByType = (type: string) => documents.filter(d => d.doc_type === type);
  
  const hasEducationDoc = getDocumentsByType('education').length > 0;
  const hasCertificateDocs = getDocumentsByType('certificate').length > 0;
  const hasCvDoc = getDocumentsByType('cv').length > 0;

  const canSubmit = () => {
    if (!requirements) return false;
    
    // If using CV fallback, only need CV
    if (useCvFallback) return hasCvDoc;

    // Otherwise check each requirement
    let valid = true;
    if (requirements.education_required && !hasEducationDoc) valid = false;
    if (requirements.certificates_required && !hasCertificateDocs) valid = false;
    if (requirements.language_required && !languageLevel) valid = false;
    
    return valid;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!requirements) {
    return null; // No requirements configured
  }

  // Show status if already submitted
  if (eligibility?.status === 'pending_review') {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertTitle>{t('eligibility.status.pending_title')}</AlertTitle>
        <AlertDescription>
          {t('eligibility.status.pending_desc')}
        </AlertDescription>
      </Alert>
    );
  }

  if (eligibility?.status === 'eligible') {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>{t('eligibility.status.eligible_title')}</AlertTitle>
        <AlertDescription>
          {t('eligibility.status.eligible_desc')}
        </AlertDescription>
      </Alert>
    );
  }

  if (eligibility?.status === 'rejected') {
    return (
      <Alert className="border-red-500/50 bg-red-500/10">
        <XCircle className="h-4 w-4 text-red-500" />
        <AlertTitle>{t('eligibility.status.rejected_title')}</AlertTitle>
        <AlertDescription>
          {eligibility.notes || t('eligibility.status.rejected_desc')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          {t('eligibility.verification.title')}
        </CardTitle>
        <CardDescription>
          {t('eligibility.verification.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Education Upload */}
        {requirements.education_required && !useCvFallback && (
          <div className="space-y-3 p-4 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              <Label className="font-medium">{t('eligibility.verification.education_proof')}</Label>
              <Badge variant="outline" className="ml-auto">
                {t(`eligibility.education_levels.${requirements.min_education_level}`)}
              </Badge>
            </div>
            {requirements.education_field && (
              <p className="text-sm text-muted-foreground">
                {t('eligibility.verification.field')}: {requirements.education_field}
              </p>
            )}
            
            {hasEducationDoc ? (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{getDocumentsByType('education')[0].label}</span>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, 'education')}
                  className="hidden"
                  id="education-upload"
                />
                <label htmlFor="education-upload">
                  <Button variant="outline" asChild disabled={uploading === 'education'}>
                    <span className="cursor-pointer">
                      {uploading === 'education' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {t('eligibility.verification.upload_education')}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Certificate Upload */}
        {requirements.certificates_required && !useCvFallback && (
          <div className="space-y-3 p-4 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <Label className="font-medium">{t('eligibility.verification.certificates')}</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {requirements.required_certificates?.map(cert => (
                <Badge key={cert} variant="secondary">{cert}</Badge>
              ))}
            </div>
            
            {hasCertificateDocs && (
              <div className="space-y-2">
                {getDocumentsByType('certificate').map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{doc.label}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e, 'certificate')}
                className="hidden"
                id="certificate-upload"
              />
              <label htmlFor="certificate-upload">
                <Button variant="outline" asChild disabled={uploading === 'certificate'}>
                  <span className="cursor-pointer">
                    {uploading === 'certificate' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {t('eligibility.verification.upload_certificate')}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {/* Language Requirement */}
        {requirements.language_required && (
          <div className="space-y-3 p-4 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-green-500" />
              <Label className="font-medium">
                {t('eligibility.verification.language')}: {requirements.language}
              </Label>
              <Badge variant="outline" className="ml-auto">
                {t('eligibility.verification.min_level')}: {requirements.language_level}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t('eligibility.verification.your_level')}</Label>
                <Select value={languageLevel} onValueChange={setLanguageLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CEFR_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t('eligibility.verification.language_sample')}</Label>
                <Textarea
                  placeholder={t('eligibility.verification.language_sample_placeholder')}
                  value={languageNotes}
                  onChange={(e) => setLanguageNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {t('eligibility.verification.language_sample_hint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CV Fallback Option */}
        {(requirements.education_required || requirements.certificates_required) && (
          <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {t('eligibility.verification.no_documents_title')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('eligibility.verification.no_documents_desc')}
                </p>
                
                <div className="mt-3">
                  <Button
                    variant={useCvFallback ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setUseCvFallback(!useCvFallback)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {useCvFallback 
                      ? t('eligibility.verification.switch_to_docs')
                      : t('eligibility.verification.use_cv_instead')
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CV Upload (if fallback) */}
        {useCvFallback && (
          <div className="space-y-3 p-4 rounded-lg border border-primary/50 bg-primary/5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <Label className="font-medium">{t('eligibility.verification.official_cv')}</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('eligibility.verification.cv_review_note')}
            </p>
            
            {hasCvDoc ? (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{getDocumentsByType('cv')[0].label}</span>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, 'cv')}
                  className="hidden"
                  id="cv-upload"
                />
                <label htmlFor="cv-upload">
                  <Button variant="outline" asChild disabled={uploading === 'cv'}>
                    <span className="cursor-pointer">
                      {uploading === 'cv' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {t('eligibility.verification.upload_cv')}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit() || submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          {t('eligibility.verification.submit_for_review')}
        </Button>
      </CardFooter>
    </Card>
  );
};
