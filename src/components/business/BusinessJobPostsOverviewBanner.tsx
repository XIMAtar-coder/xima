import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Briefcase, 
  Plus, 
  ChevronRight, 
  Clock,
  Users,
  Eye,
  FileText,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { useBusinessJobPostsOverview } from '@/hooks/useBusinessJobPostsOverview';
import { toast } from 'sonner';

interface BusinessJobPostsOverviewBannerProps {
  businessId?: string;
}

type JobStatus = 'active' | 'draft' | 'archived' | string;

export const BusinessJobPostsOverviewBanner: React.FC<BusinessJobPostsOverviewBannerProps> = ({
  businessId
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, loading, error } = useBusinessJobPostsOverview(businessId);

  // Show error toast but keep banner visible
  React.useEffect(() => {
    if (error) {
      toast.error(t('business.job_posts_overview.error_loading'));
    }
  }, [error, t]);

  const stats = data?.totals ?? {
    openCount: 0,
    activeCount: 0,
    applicationsLast30d: 0,
    pendingReviewsCount: 0
  };

  const jobPosts = data?.latestPosts ?? [];

  const kpiItems = [
    {
      key: 'open_job_posts',
      labelKey: 'businessPortal.jobs_stat_open',
      value: stats.openCount,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      key: 'active_job_posts',
      labelKey: 'businessPortal.jobs_stat_active',
      value: stats.activeCount,
      icon: Eye,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      key: 'total_applications',
      labelKey: 'businessPortal.jobs_stat_applications',
      value: stats.applicationsLast30d,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      key: 'pending_reviews',
      labelKey: 'businessPortal.jobs_stat_to_evaluate',
      value: stats.pendingReviewsCount,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ];

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'published':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            {t('business.job_posts_overview.status.active')}
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {t('business.job_posts_overview.status.draft')}
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t('business.job_posts_overview.status.archived')}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {status}
          </Badge>
        );
    }
  };

  const handleCreateChallenge = async (
    e: React.MouseEvent,
    jobPost: typeof jobPosts[0]
  ) => {
    e.stopPropagation();
    navigate(`/business/challenges/select?from_listing=${jobPost.id}`);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {t('businessPortal.jobs_overview_title')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/business/jobs/new')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('businessPortal.jobs_create_cta')}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/business/jobs')}
              className="gap-2"
            >
              {t('businessPortal.jobs_view_all_cta')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Chips Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiItems.map((kpi) => (
            <div
              key={kpi.key}
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
            >
              {loading ? (
                <div className="flex items-center gap-3 w-full">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ) : (
                <>
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(kpi.labelKey)}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Job Posts List Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('businessPortal.jobs_recent_title')}
          </h4>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : jobPosts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">{t('businessPortal.jobs_empty_headline')}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/business/jobs/new')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('businessPortal.jobs_create_cta')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {jobPosts.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/business/jobs`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">
                          {job.title}
                        </p>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('business.job_posts_overview.last_updated', {
                          date: format(new Date(job.updatedAt), 'MMM d, yyyy')
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {job.applicationsCount}
                      </span>
                      <span className="text-muted-foreground">
                        {t('business.job_posts_overview.applications')}
                      </span>
                    </div>
                    
                    {job.newApplicationsLast7Days > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        +{job.newApplicationsLast7Days} {t('business.job_posts_overview.new')}
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-7 px-2 text-xs"
                      onClick={(e) => handleCreateChallenge(e, job)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {t('business.jobs.create_challenge')}
                    </Button>
                    
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
