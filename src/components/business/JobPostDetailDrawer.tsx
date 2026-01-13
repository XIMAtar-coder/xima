import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Target, 
  Loader2, 
  MapPin, 
  Briefcase, 
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';

interface JobPost {
  id: string;
  title: string;
  status: string;
  locale: string | null;
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
  source_pdf_path?: string | null;
  created_at: string;
  updated_at: string;
  linkedChallengesCount?: number;
}

// Publish Readiness Block Component
function PublishReadinessBlock({ job }: { job: JobPost }) {
  const { t } = useTranslation();
  
  const hasDescription = !!job.description && job.description.length > 50;
  const hasResponsibilities = !!job.responsibilities && job.responsibilities.includes('•');
  const hasRequirements = !!job.requirements_must && job.requirements_must.includes('•');
  const isFromPdf = !!job.source_pdf_path;
  
  const isReady = hasDescription && hasResponsibilities && hasRequirements;
  const sectionsComplete = [hasDescription, hasResponsibilities, hasRequirements].filter(Boolean).length;
  
  if (!isFromPdf) return null;
  
  return (
    <div className={`p-3 rounded-lg border ${isReady ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'}`}>
      <div className="flex items-start gap-2">
        {isReady ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              {isReady ? t('jobs.import_cleaned') : t('jobs.import_needs_review')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('jobs.sections_complete', { count: sectionsComplete, total: 3 })}
          </p>
          {!isReady && (
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {!hasDescription && <li>• {t('jobs.missing_description')}</li>}
              {!hasResponsibilities && <li>• {t('jobs.missing_responsibilities')}</li>}
              {!hasRequirements && <li>• {t('jobs.missing_requirements')}</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

interface JobPostDetailDrawerProps {
  job: JobPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateChallenge: (job: JobPost) => void;
  creatingChallenge: boolean;
  onUpdate: () => void;
}

export default function JobPostDetailDrawer({
  job,
  open,
  onOpenChange,
  onCreateChallenge,
  creatingChallenge,
  onUpdate
}: JobPostDetailDrawerProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<JobPost>>({});

  React.useEffect(() => {
    if (job) {
      setFormData({ ...job });
      setIsEditing(false);
    }
  }, [job]);

  if (!job) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({
          title: formData.title,
          description: formData.description,
          responsibilities: formData.responsibilities,
          requirements_must: formData.requirements_must,
          requirements_nice: formData.requirements_nice,
          benefits: formData.benefits,
          location: formData.location,
          employment_type: formData.employment_type,
          seniority: formData.seniority,
          department: formData.department,
          salary_range: formData.salary_range,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .eq('business_id', user?.id);

      if (error) throw error;

      toast.success(t('jobs.job_draft_saved'));
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = job.status === 'active' ? 'draft' : 'active';
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('business_id', user?.id);

      if (error) throw error;

      toast.success(newStatus === 'active' ? t('jobs.job_published') : t('jobs.job_unpublished'));
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{t('jobs.published')}</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">{t('jobs.archived')}</Badge>;
      default:
        return <Badge variant="secondary">{t('jobs.draft')}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{job.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-2">
                {getStatusBadge(job.status)}
                {job.linkedChallengesCount !== undefined && job.linkedChallengesCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    • {job.linkedChallengesCount} {t('jobs.linked_challenges')}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Publish Readiness Indicator */}
          <PublishReadinessBlock job={job} />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onCreateChallenge(job)}
              disabled={creatingChallenge}
              className="gap-2"
            >
              {creatingChallenge ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              {t('jobs.create_challenge')}
            </Button>

            {job.status !== 'archived' && (
              <Button variant="outline" onClick={handleToggleStatus} className="gap-2">
                {job.status === 'active' ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    {t('jobs.unpublish')}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    {t('jobs.publish')}
                  </>
                )}
              </Button>
            )}

            {!isEditing ? (
              <Button variant="ghost" onClick={() => setIsEditing(true)}>
                {t('jobs.edit')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                {t('jobs.cancel')}
              </Button>
            )}
          </div>

          <Separator />

          {/* Form / View */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('jobs.job_title')}</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('jobs.department')}</Label>
                  <Input
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('jobs.location')}</Label>
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('jobs.employment_type')}</Label>
                  <Select
                    value={formData.employment_type || ''}
                    onValueChange={(v) => setFormData({ ...formData, employment_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('jobs.select_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">{t('jobs.full_time')}</SelectItem>
                      <SelectItem value="part-time">{t('jobs.part_time')}</SelectItem>
                      <SelectItem value="contract">{t('jobs.contract')}</SelectItem>
                      <SelectItem value="internship">{t('jobs.internship')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('jobs.seniority')}</Label>
                  <Select
                    value={formData.seniority || ''}
                    onValueChange={(v) => setFormData({ ...formData, seniority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('jobs.select_seniority')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">{t('jobs.entry_level')}</SelectItem>
                      <SelectItem value="mid">{t('jobs.mid_level')}</SelectItem>
                      <SelectItem value="senior">{t('jobs.senior_level')}</SelectItem>
                      <SelectItem value="lead">{t('jobs.lead_level')}</SelectItem>
                      <SelectItem value="executive">{t('jobs.executive_level')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.salary_range')}</Label>
                <Input
                  value={formData.salary_range || ''}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  placeholder={t('jobs.salary_range_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.job_description')}</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.responsibilities')}</Label>
                <Textarea
                  value={formData.responsibilities || ''}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.requirements_must')}</Label>
                <Textarea
                  value={formData.requirements_must || ''}
                  onChange={(e) => setFormData({ ...formData, requirements_must: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.requirements_nice')}</Label>
                <Textarea
                  value={formData.requirements_nice || ''}
                  onChange={(e) => setFormData({ ...formData, requirements_nice: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.benefits')}</Label>
                <Textarea
                  value={formData.benefits || ''}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={2}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('jobs.save_draft')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* View Mode */}
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {job.department && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                )}
                {job.employment_type && (
                  <Badge variant="outline" className="text-xs">{job.employment_type}</Badge>
                )}
                {job.seniority && (
                  <Badge variant="outline" className="text-xs">{job.seniority}</Badge>
                )}
              </div>

              {job.salary_range && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('jobs.salary')}</h4>
                  <p className="text-sm text-muted-foreground">{job.salary_range}</p>
                </div>
              )}

              {job.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('jobs.job_description')}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </div>
              )}

              {job.responsibilities && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('jobs.responsibilities')}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.responsibilities}</p>
                </div>
              )}

              {job.requirements_must && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('jobs.requirements_must')}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements_must}</p>
                </div>
              )}

              {job.requirements_nice && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('jobs.requirements_nice')}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements_nice}</p>
                </div>
              )}

              {job.benefits && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('jobs.benefits')}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.benefits}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
