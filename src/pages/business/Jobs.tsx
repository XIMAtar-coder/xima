import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, MapPin, Eye, FileUp, Target, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PdfImportModal from '@/components/business/PdfImportModal';

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
  created_at: string;
  updated_at: string;
}

export default function Jobs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: roleLoading } = useBusinessRole();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [creatingChallengeForJob, setCreatingChallengeForJob] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isBusiness) {
      navigate('/login');
    }
  }, [isBusiness, roleLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && isBusiness && user?.id) {
      fetchJobs();
    }
  }, [isAuthenticated, isBusiness, user?.id]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('business_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('business_id', user?.id);

      if (error) throw error;

      toast({
        title: t('jobs.success'),
        description: newStatus === 'active' ? t('jobs.job_published') : t('jobs.job_unpublished'),
      });

      fetchJobs();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('jobs.failed_update_visibility'),
        variant: "destructive"
      });
    }
  };

  const extractSkillsFromText = (text: string): string[] => {
    const commonSkills = [
      'javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 
      'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'leadership',
      'communication', 'teamwork', 'problem-solving', 'analytics', 'excel',
      'project management', 'design', 'marketing', 'sales', 'customer service'
    ];
    
    const lowerText = text.toLowerCase();
    return commonSkills.filter(skill => lowerText.includes(skill));
  };

  const handleCreateChallenge = async (job: JobPost) => {
    setCreatingChallengeForJob(job.id);
    
    try {
      const contextParts = [
        job.description,
        job.responsibilities ? `Responsibilities:\n${job.responsibilities}` : '',
        job.requirements_must ? `Requirements:\n${job.requirements_must}` : '',
        job.requirements_nice ? `Nice to have:\n${job.requirements_nice}` : ''
      ].filter(Boolean).join('\n\n');

      const skillsText = [job.requirements_must, job.requirements_nice].filter(Boolean).join(' ');
      const targetSkills = extractSkillsFromText(skillsText);

      const { data, error } = await supabase
        .from('business_challenges')
        .insert({
          business_id: user?.id,
          title: job.title,
          description: contextParts.slice(0, 2000),
          target_skills: targetSkills.length > 0 ? targetSkills : null,
          job_post_id: job.id,
          created_from_job_post: true,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: t('jobs.challenge_created'),
        description: t('jobs.challenge_created_from_job_post'),
      });

      navigate(`/business/challenges/${data.id}/edit`);
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCreatingChallengeForJob(null);
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

  if (roleLoading || loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('jobs.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('jobs.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPdfImport(true)}>
              <FileUp className="h-4 w-4 mr-2" />
              {t('business.pdf_import.import_from_pdf')}
            </Button>
            <Button onClick={() => navigate('/business/jobs/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('jobs.create_job')}
            </Button>
          </div>
        </div>

        <PdfImportModal 
          open={showPdfImport} 
          onOpenChange={setShowPdfImport}
          onSuccess={fetchJobs}
        />

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('jobs.no_jobs_title')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('jobs.no_jobs_desc')}
              </p>
              <Button onClick={() => navigate('/business/jobs/new')}>
                <Plus className="h-4 w-4 mr-2" />
                {t('jobs.create_job')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        {getStatusBadge(job.status)}
                      </div>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        {job.department && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {job.department}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.employment_type && (
                          <Badge variant="outline" className="text-xs">{job.employment_type}</Badge>
                        )}
                        {job.seniority && (
                          <Badge variant="outline" className="text-xs">{job.seniority}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateChallenge(job)}
                        disabled={creatingChallengeForJob === job.id}
                        className="gap-1"
                      >
                        {creatingChallengeForJob === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Target className="h-4 w-4" />
                        )}
                        {t('jobs.create_challenge')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleJobStatus(job.id, job.status)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {job.status === 'active' ? t('jobs.unpublish') : t('jobs.publish')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  {job.salary_range && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>{t('jobs.salary')}:</strong> {job.salary_range}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
