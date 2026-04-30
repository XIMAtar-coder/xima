import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Save,
  Eye,
  EyeOff,
  Pencil,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import JobPostCandidatePreview from './JobPostCandidatePreview';

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
  content_json?: unknown;
  content_html?: string | null;
  created_at: string;
  updated_at: string;
  linkedChallengesCount?: number;
}

interface JobPostDetailDrawerProps {
  job: JobPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function JobPostDetailDrawer({
  job,
  open,
  onOpenChange,
  onUpdate
}: JobPostDetailDrawerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<JobPost>>({});
  
  React.useEffect(() => {
    if (job) {
      setFormData({ ...job });
      // Default to preview tab for imported jobs, editor for others
      setActiveTab(job.source_pdf_path ? 'preview' : 'editor');
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
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = job.status === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('business_id', user?.id);

      if (error) throw error;

      toast.success(newStatus === 'published' ? t('jobs.job_published') : t('jobs.job_unpublished'));
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{t('jobs.published')}</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">{t('jobs.archived')}</Badge>;
      default:
        return <Badge variant="secondary">{t('jobs.draft')}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
                {job.source_pdf_path && (
                  <Badge variant="outline" className="text-xs">PDF Import</Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            onClick={() => navigate(`/business/challenges/select?from_listing=${job.id}`)}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            {t('jobs.create_challenge')}
          </Button>

          {job.status !== 'archived' && (
            <Button variant="outline" onClick={handleToggleStatus} className="gap-2">
              {job.status === 'published' ? (
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
        </div>

        <Separator className="mb-4" />

        {/* Tabs: Preview / Editor */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="preview" className="gap-2">
              <Users className="h-4 w-4" />
              {t('jobs.preview.candidate_view', 'Candidate Preview')}
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2">
              <Pencil className="h-4 w-4" />
              {t('jobs.preview.editor', 'Editor')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-0">
            <JobPostCandidatePreview job={job} />
          </TabsContent>

          <TabsContent value="editor" className="mt-0">
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
                  rows={4}
                  placeholder={t('jobs.responsibilities_placeholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('jobs.preview.bullets_hint', 'Each line starting with • will render as a bullet point')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.requirements_must')}</Label>
                <Textarea
                  value={formData.requirements_must || ''}
                  onChange={(e) => setFormData({ ...formData, requirements_must: e.target.value })}
                  rows={4}
                  placeholder={t('jobs.requirements_must_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.requirements_nice')}</Label>
                <Textarea
                  value={formData.requirements_nice || ''}
                  onChange={(e) => setFormData({ ...formData, requirements_nice: e.target.value })}
                  rows={3}
                  placeholder={t('jobs.requirements_nice_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('jobs.benefits')}</Label>
                <Textarea
                  value={formData.benefits || ''}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={3}
                  placeholder={t('jobs.benefits_placeholder')}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('jobs.save_draft')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
