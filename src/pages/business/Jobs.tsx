import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Briefcase, 
  MapPin, 
  Eye, 
  FileUp, 
  Target, 
  Loader2,
  ChevronRight,
  Archive,
  Pencil,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';
import PdfImportModal from '@/components/business/PdfImportModal';
import JobPostDetailDrawer from '@/components/business/JobPostDetailDrawer';
import { format } from 'date-fns';

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
  linkedChallengesCount?: number;
}

type StatusFilter = 'all' | 'draft' | 'active' | 'archived';

export default function Jobs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: roleLoading } = useBusinessRole();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [creatingChallengeForJob, setCreatingChallengeForJob] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isBusiness) {
      navigate('/login');
    }
  }, [isBusiness, roleLoading, navigate]);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch job posts
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('business_id', user.id)
        .order('updated_at', { ascending: false });

      if (jobsError) throw jobsError;

      const jobIds = (jobsData || []).map(j => j.id);

      // Fetch linked challenges count
      let challengeCounts: Record<string, number> = {};
      if (jobIds.length > 0) {
        const { data: challenges, error: challengesError } = await supabase
          .from('business_challenges')
          .select('job_post_id')
          .in('job_post_id', jobIds);

        if (!challengesError && challenges) {
          challenges.forEach(c => {
            if (c.job_post_id) {
              challengeCounts[c.job_post_id] = (challengeCounts[c.job_post_id] || 0) + 1;
            }
          });
        }
      }

      // Merge counts
      const jobsWithCounts = (jobsData || []).map(job => ({
        ...job,
        linkedChallengesCount: challengeCounts[job.id] || 0
      }));

      setJobs(jobsWithCounts);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (isAuthenticated && isBusiness && user?.id) {
      fetchJobs();
    }
  }, [isAuthenticated, isBusiness, user?.id, fetchJobs]);

  const filteredJobs = jobs.filter(job => {
    if (statusFilter === 'all') return true;
    return job.status === statusFilter;
  });

  const statusCounts = {
    all: jobs.length,
    draft: jobs.filter(j => j.status === 'draft').length,
    active: jobs.filter(j => j.status === 'active').length,
    archived: jobs.filter(j => j.status === 'archived').length
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

      toast.success(t('jobs.challenge_created_from_job_post'));
      navigate(`/business/challenges/${data.id}/edit`);
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setCreatingChallengeForJob(null);
    }
  };

  const handleArchiveJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('business_id', user?.id);

      if (error) throw error;

      toast.success(t('jobs.job_archived'));
      fetchJobs();
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

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  if (roleLoading || loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('jobs.title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('jobs.subtitle')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowPdfImport(true)}>
              <FileUp className="h-4 w-4 mr-2" />
              {t('business.pdf_import.import_from_pdf')}
            </Button>
            <Button size="sm" onClick={() => navigate('/business/jobs/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('jobs.create_job')}
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              {t('jobs.filter_all')}
              <Badge variant="secondary" className="text-xs">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-2">
              {t('jobs.draft')}
              <Badge variant="secondary" className="text-xs">{statusCounts.draft}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              {t('jobs.published')}
              <Badge variant="secondary" className="text-xs">{statusCounts.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              {t('jobs.archived')}
              <Badge variant="secondary" className="text-xs">{statusCounts.archived}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <PdfImportModal 
          open={showPdfImport} 
          onOpenChange={setShowPdfImport}
          onSuccess={fetchJobs}
        />

        {/* Job Posts List */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === 'all' ? t('jobs.no_jobs_title') : t('jobs.no_jobs_filter', { status: t(`jobs.${statusFilter}`) })}
              </h3>
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
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <Card 
                key={job.id} 
                className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedJobId(job.id)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Left: Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold truncate">{job.title}</h3>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
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
                        <span className="text-xs">
                          {t('jobs.updated_at', { date: format(new Date(job.updated_at), 'MMM d, yyyy') })}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions & Stats */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Linked Challenges Count */}
                      {job.linkedChallengesCount !== undefined && job.linkedChallengesCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Link2 className="h-3.5 w-3.5" />
                          <span>{job.linkedChallengesCount} {t('jobs.linked_challenges')}</span>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateChallenge(job);
                          }}
                          disabled={creatingChallengeForJob === job.id}
                        >
                          {creatingChallengeForJob === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Target className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">{t('jobs.create_challenge')}</span>
                        </Button>

                        {job.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveJob(job.id);
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}

                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <JobPostDetailDrawer
        job={selectedJob}
        open={!!selectedJobId}
        onOpenChange={(open) => !open && setSelectedJobId(null)}
        onCreateChallenge={handleCreateChallenge}
        creatingChallenge={creatingChallengeForJob === selectedJobId}
        onUpdate={fetchJobs}
      />
    </BusinessLayout>
  );
}
