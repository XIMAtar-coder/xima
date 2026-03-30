import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Link2, Upload, Search, CheckCircle, Loader2, FileText, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportJobModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  businessId: string;
  companyName?: string;
}

export const ImportJobModal: React.FC<ImportJobModalProps> = ({
  open, onClose, onImported, businessId, companyName = ''
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'search'>('url');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedJob, setExtractedJob] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  const resetState = () => {
    setUrl('');
    setExtractedJob(null);
    setSearchResults([]);
    setStep('input');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleUrlImport = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-job-post', {
        body: { method: 'url', url },
      });
      if (error) throw error;
      if (data?.job) {
        setExtractedJob(data.job);
        setStep('review');
      } else {
        toast.error(t('import_job.extraction_failed', 'Failed to extract job details'));
      }
    } catch {
      toast.error(t('import_job.url_error', 'Failed to extract job details. Please check the URL and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImport = async (file: File | undefined) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'iyckvvnecpnldrxqmzta';

      const resp = await fetch(
        `https://${projId}.supabase.co/functions/v1/import-job-post`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Y2t2dm5lY3BubGRyeHFtenRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMwNjUsImV4cCI6MjA2NzA2OTA2NX0.OJJ4iid8HbUCmUUkaMVObJOG1y4_t1ia1QTpDhKYlqQ',
          },
          body: formData,
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      if (data?.job) {
        setExtractedJob(data.job);
        setStep('review');
      }
    } catch {
      toast.error(t('import_job.file_error', 'Failed to extract job details from file.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiSearch = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-job-post', {
        body: { method: 'ai_search', company_name: companyName },
      });
      if (error) throw error;
      if (data?.jobs?.length > 0) {
        setSearchResults(data.jobs);
      } else {
        toast.info(t('import_job.no_results', 'No open positions found. Try pasting a URL instead.'));
      }
    } catch {
      toast.error(t('import_job.search_error', 'AI search failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSearchResult = async (job: any) => {
    if (job.url) {
      setUrl(job.url);
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('import-job-post', {
          body: { method: 'url', url: job.url },
        });
        if (error) throw error;
        if (data?.job) {
          setExtractedJob(data.job);
          setStep('review');
        }
      } catch {
        // Fallback to the search result data
        setExtractedJob({
          title: job.title,
          location: job.location,
          employment_type: job.type || 'full-time',
          description: job.description || '',
          required_skills: [],
        });
        setStep('review');
      } finally {
        setIsLoading(false);
      }
    } else {
      setExtractedJob({
        title: job.title,
        location: job.location,
        employment_type: job.type || 'full-time',
        description: job.description || '',
        required_skills: [],
      });
      setStep('review');
    }
  };

  const handleConfirmImport = async () => {
    if (!extractedJob?.title) {
      toast.error('Job title is required');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('job_posts').insert({
        business_id: businessId,
        title: extractedJob.title,
        description: extractedJob.description || null,
        location: extractedJob.location || null,
        employment_type: extractedJob.employment_type || null,
        seniority: extractedJob.seniority || null,
        salary_range: extractedJob.salary_range || null,
        requirements_must: extractedJob.requirements || null,
        benefits: extractedJob.benefits || null,
        department: extractedJob.department || null,
        import_source: activeTab === 'search' ? 'ai_search' : activeTab,
        import_source_url: url || null,
        import_raw_data: extractedJob as any,
        imported_at: new Date().toISOString(),
        status: 'draft',
      } as any);

      if (error) throw error;

      toast.success(t('import_job.success', 'Job imported successfully!'));
      onImported();
      handleClose();
    } catch (err: any) {
      console.error('[ImportJob] Save error:', err);
      toast.error(t('import_job.save_error', 'Failed to save job. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: 'url' as const, icon: Link2, label: t('import_job.tab_url', 'Paste URL') },
    { key: 'file' as const, icon: Upload, label: t('import_job.tab_file', 'Upload File') },
    { key: 'search' as const, icon: Search, label: t('import_job.tab_search', 'AI Search'), beta: true },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('import_job.title', 'Import a Job Position')}</DialogTitle>
          <DialogDescription>
            {t('import_job.subtitle', 'Bring your existing job posts into XIMA and connect them to the behavioral challenge pipeline.')}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.beta && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">Beta</Badge>
                  )}
                </button>
              ))}
            </div>

            {/* URL Tab */}
            {activeTab === 'url' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('import_job.url_label', 'Job post URL')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('import_job.url_hint', 'Paste a link from LinkedIn, Indeed, Glassdoor, or your company careers page')}
                  </p>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('import_job.url_placeholder', 'https://www.linkedin.com/jobs/view/...')}
                  />
                </div>
                <Button onClick={handleUrlImport} disabled={!url || isLoading} className="w-full">
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('import_job.extracting', 'Extracting job details...')}</>
                  ) : (
                    t('import_job.extract_button', 'Extract Job Details')
                  )}
                </Button>
              </div>
            )}

            {/* File Tab */}
            {activeTab === 'file' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {t('import_job.file_drop', 'Drop a job description file here')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('import_job.file_hint', 'PDF or DOCX, max 10MB')}
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => handleFileImport(e.target.files?.[0])}
                    className="mt-3 max-w-xs mx-auto"
                    disabled={isLoading}
                  />
                </div>
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('import_job.extracting', 'Extracting job details...')}
                  </div>
                )}
              </div>
            )}

            {/* AI Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {t('import_job.search_title', 'AI-Powered Job Search')}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">Beta</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('import_job.search_hint', "XIMA's AI will search LinkedIn for your company's open positions.")}
                  </p>
                </div>

                <Button onClick={handleAiSearch} disabled={isLoading || !companyName} className="w-full">
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('import_job.searching', 'Searching LinkedIn...')}</>
                  ) : (
                    t('import_job.search_button', `Search for ${companyName} jobs on LinkedIn`)
                  )}
                </Button>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {t('import_job.found_positions', `Found ${searchResults.length} positions`)}
                    </p>
                    {searchResults.map((job, i) => (
                      <div key={i} className="flex items-start justify-between p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.location} · {job.type} {job.posted && `· ${job.posted}`}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSelectSearchResult(job)}>
                          {t('import_job.import_btn', 'Import')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && extractedJob && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('import_job.review_title', 'Job details extracted successfully')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('import_job.review_hint', 'Review and edit before importing')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t('import_job.field_title', 'Job Title')} *
                </label>
                <Input
                  value={extractedJob.title || ''}
                  onChange={(e) => setExtractedJob({ ...extractedJob, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t('import_job.field_location', 'Location')}
                  </label>
                  <Input
                    value={extractedJob.location || ''}
                    onChange={(e) => setExtractedJob({ ...extractedJob, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t('import_job.field_type', 'Employment Type')}
                  </label>
                  <select
                    value={extractedJob.employment_type || 'full-time'}
                    onChange={(e) => setExtractedJob({ ...extractedJob, employment_type: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  {t('import_job.field_description', 'Description')}
                </label>
                <Textarea
                  value={extractedJob.description || ''}
                  onChange={(e) => setExtractedJob({ ...extractedJob, description: e.target.value })}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {extractedJob.required_skills?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t('import_job.field_skills', 'Required Skills')}
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {extractedJob.required_skills.map((skill: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedJob.salary_range && (
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t('import_job.field_salary', 'Salary Range')}
                  </label>
                  <p className="text-sm mt-1 text-muted-foreground">{extractedJob.salary_range}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('input')}>
                {t('import_job.back', 'Back')}
              </Button>
              <Button onClick={handleConfirmImport} className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('import_job.importing', 'Importing...')}</>
                ) : (
                  t('import_job.confirm_import', 'Import to XIMA & Create Challenge Pipeline')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
