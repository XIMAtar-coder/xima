import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, MapPin, ArrowLeft, Loader2 } from 'lucide-react';

const CreateJobOffer = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsibilities: '',
    requirements_must: '',
    requirements_nice: '',
    benefits: '',
    location: '',
    employment_type: '',
    seniority: '',
    department: '',
    salary_range: '',
    status: 'draft' as 'draft' | 'active',
  });

  React.useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
    }
  }, [isAuthenticated, isBusiness, businessLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = true) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: t('common.error'),
        description: t('jobs.fill_required_fields'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('job_posts')
        .insert({
          business_id: user?.id,
          title: formData.title,
          description: formData.description || null,
          responsibilities: formData.responsibilities || null,
          requirements_must: formData.requirements_must || null,
          requirements_nice: formData.requirements_nice || null,
          benefits: formData.benefits || null,
          location: formData.location || null,
          employment_type: formData.employment_type || null,
          seniority: formData.seniority || null,
          department: formData.department || null,
          salary_range: formData.salary_range || null,
          status: saveAsDraft ? 'draft' : 'active',
          locale: 'en',
        });

      if (error) throw error;

      toast({
        title: t('jobs.success'),
        description: saveAsDraft ? t('jobs.job_draft_saved') : t('jobs.job_published'),
      });

      navigate('/business/jobs');
    } catch (error: any) {
      console.error('Error creating job offer:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('jobs.failed_create'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/business/jobs')}
            className="gap-2 -ml-2"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('jobs.create_job')}</h1>
            <p className="text-muted-foreground">
              {t('jobs.create_job_desc')}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, true)}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="text-primary" size={24} />
                {t('jobs.job_details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('jobs.job_title')} *</Label>
                <Input
                  id="title"
                  placeholder={t('jobs.job_title_placeholder')}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">{t('jobs.department')}</Label>
                <Input
                  id="department"
                  placeholder={t('jobs.department_placeholder')}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin size={16} />
                  {t('jobs.location')}
                </Label>
                <Input
                  id="location"
                  placeholder={t('jobs.location_placeholder')}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* Employment Type & Seniority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employment_type">{t('jobs.employment_type')}</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
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
                  <Label htmlFor="seniority">{t('jobs.seniority')}</Label>
                  <Select
                    value={formData.seniority}
                    onValueChange={(value) => setFormData({ ...formData, seniority: value })}
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

              {/* Salary Range */}
              <div className="space-y-2">
                <Label htmlFor="salary_range">{t('jobs.salary_range')}</Label>
                <Input
                  id="salary_range"
                  placeholder={t('jobs.salary_range_placeholder')}
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('jobs.job_description')} *</Label>
                <Textarea
                  id="description"
                  placeholder={t('jobs.job_description_placeholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px]"
                  required
                />
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <Label htmlFor="responsibilities">{t('jobs.responsibilities')}</Label>
                <Textarea
                  id="responsibilities"
                  placeholder={t('jobs.responsibilities_placeholder')}
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>

              {/* Requirements Must */}
              <div className="space-y-2">
                <Label htmlFor="requirements_must">{t('jobs.requirements_must')}</Label>
                <Textarea
                  id="requirements_must"
                  placeholder={t('jobs.requirements_must_placeholder')}
                  value={formData.requirements_must}
                  onChange={(e) => setFormData({ ...formData, requirements_must: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>

              {/* Requirements Nice */}
              <div className="space-y-2">
                <Label htmlFor="requirements_nice">{t('jobs.requirements_nice')}</Label>
                <Textarea
                  id="requirements_nice"
                  placeholder={t('jobs.requirements_nice_placeholder')}
                  value={formData.requirements_nice}
                  onChange={(e) => setFormData({ ...formData, requirements_nice: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <Label htmlFor="benefits">{t('jobs.benefits')}</Label>
                <Textarea
                  id="benefits"
                  placeholder={t('jobs.benefits_placeholder')}
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/business/jobs')}
                  disabled={loading}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={loading}
                  className="flex-1"
                >
                  {t('jobs.save_draft')}
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('jobs.publish')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </BusinessLayout>
  );
};

export default CreateJobOffer;
