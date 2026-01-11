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
import { Plus, Briefcase, MapPin, Eye, Users, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PdfImportModal from '@/components/business/PdfImportModal';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  is_public: boolean;
  created_at: string;
}

export default function Jobs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: roleLoading } = useBusinessRole();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPdfImport, setShowPdfImport] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isBusiness) {
      navigate('/login');
    }
  }, [isBusiness, roleLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && isBusiness) {
      fetchJobs();
    }
  }, [isAuthenticated, isBusiness]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobVisibility = async (jobId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ is_public: !currentVisibility })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: t('jobs.success'),
        description: !currentVisibility ? t('jobs.job_published') : t('jobs.job_unpublished'),
      });

      fetchJobs();
    } catch (error: any) {
      toast({
        title: t('jobs.error'),
        description: error.message || t('jobs.failed_update_visibility'),
        variant: "destructive"
      });
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
                        <Badge variant={job.is_public ? 'default' : 'secondary'}>
                          {job.is_public ? t('jobs.published') : t('jobs.draft')}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {job.company}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleJobVisibility(job.id, job.is_public)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {job.is_public ? t('jobs.unpublish') : t('jobs.publish')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/opportunities/${job.id}`)}
                      >
                        {t('jobs.view_details')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills.slice(0, 5).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          {t('jobs.more_skills', { count: job.skills.length - 5 })}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t('jobs.view_candidate_matches')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
