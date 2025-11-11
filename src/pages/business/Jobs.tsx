import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, MapPin, Eye, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: roleLoading } = useBusinessRole();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
        title: "Success",
        description: `Job ${!currentVisibility ? 'published' : 'unpublished'} successfully`,
      });

      fetchJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update job visibility",
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
            <h1 className="text-3xl font-bold">Job Offers</h1>
            <p className="text-muted-foreground mt-1">
              Manage and publish job opportunities for candidates
            </p>
          </div>
          <Button onClick={() => navigate('/business/jobs/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job Offer
          </Button>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No job offers yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first job offer to start attracting candidates
              </p>
              <Button onClick={() => navigate('/business/jobs/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Job Offer
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
                          {job.is_public ? 'Published' : 'Draft'}
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
                        {job.is_public ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/opportunities/${job.id}`)}
                      >
                        View Details
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
                          +{job.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      View candidate matches
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
