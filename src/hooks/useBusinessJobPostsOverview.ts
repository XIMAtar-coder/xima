import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface JobPostSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  applicationsCount: number;
  newApplicationsLast7Days: number;
  locale: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements_must: string | null;
}

interface JobPostsOverviewData {
  totals: {
    openCount: number;
    activeCount: number;
    applicationsLast30d: number;
    pendingReviewsCount: number;
  };
  latestPosts: JobPostSummary[];
}

interface UseBusinessJobPostsOverviewResult {
  data: JobPostsOverviewData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBusinessJobPostsOverview(businessId: string | undefined): UseBusinessJobPostsOverviewResult {
  const [data, setData] = useState<JobPostsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch job posts from the new job_posts table
      const { data: jobPosts, error: postsError } = await supabase
        .from('job_posts')
        .select('id, title, status, updated_at, locale, description, responsibilities, requirements_must')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (postsError) throw postsError;

      const posts = jobPosts || [];

      // Calculate totals from job posts
      const openCount = posts.length;
      const activeCount = posts.filter(p => p.status === 'active').length;

      // Get job post IDs for querying linked challenges
      const jobPostIds = posts.map(p => p.id);

      let applicationsLast30d = 0;
      let pendingReviewsCount = 0;
      const postApplicationCounts: Record<string, { total: number; recent: number }> = {};

      if (jobPostIds.length > 0) {
        // Fetch challenges linked to these job posts
        const { data: challenges, error: challengesError } = await supabase
          .from('business_challenges')
          .select('id, job_post_id')
          .in('job_post_id', jobPostIds);

        if (challengesError) throw challengesError;

        const linkedChallenges = challenges || [];
        const challengeIds = linkedChallenges.map(c => c.id);

        // Build mapping of challenge_id -> job_post_id
        const challengeToJobPost: Record<string, string> = {};
        for (const c of linkedChallenges) {
          if (c.job_post_id) {
            challengeToJobPost[c.id] = c.job_post_id;
          }
        }

        if (challengeIds.length > 0) {
          // Fetch submissions for these challenges
          const { data: submissions, error: subError } = await supabase
            .from('challenge_submissions')
            .select('id, challenge_id, status, created_at')
            .in('challenge_id', challengeIds);

          if (subError) throw subError;

          const allSubmissions = submissions || [];

          // Count applications in last 30 days
          applicationsLast30d = allSubmissions.filter(sub => 
            new Date(sub.created_at) >= new Date(thirtyDaysAgo)
          ).length;

          // Count pending reviews (status = 'submitted' awaiting review)
          pendingReviewsCount = allSubmissions.filter(sub => 
            sub.status === 'submitted'
          ).length;

          // Build per-job-post counts
          for (const sub of allSubmissions) {
            const jobPostId = challengeToJobPost[sub.challenge_id];
            if (!jobPostId) continue;

            if (!postApplicationCounts[jobPostId]) {
              postApplicationCounts[jobPostId] = { total: 0, recent: 0 };
            }
            postApplicationCounts[jobPostId].total++;
            if (new Date(sub.created_at) >= new Date(sevenDaysAgo)) {
              postApplicationCounts[jobPostId].recent++;
            }
          }
        }
      }

      // Build latest posts (max 3)
      const latestPosts: JobPostSummary[] = posts.slice(0, 3).map(post => ({
        id: post.id,
        title: post.title || 'Untitled Position',
        status: post.status || 'draft',
        updatedAt: post.updated_at,
        applicationsCount: postApplicationCounts[post.id]?.total || 0,
        newApplicationsLast7Days: postApplicationCounts[post.id]?.recent || 0,
        locale: post.locale,
        description: post.description,
        responsibilities: post.responsibilities,
        requirements_must: post.requirements_must,
      }));

      setData({
        totals: {
          openCount,
          activeCount,
          applicationsLast30d,
          pendingReviewsCount,
        },
        latestPosts,
      });
    } catch (err: any) {
      console.error('Error fetching job posts overview:', err);
      setError(err.message || 'Failed to load job posts data');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
