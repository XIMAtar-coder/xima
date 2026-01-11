import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface JobPostSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  applicationsCount: number;
  newApplicationsLast7Days: number;
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

      // Fetch hiring goals (job posts) for this business
      const { data: hiringGoals, error: goalsError } = await supabase
        .from('hiring_goal_drafts')
        .select('id, role_title, status, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (goalsError) throw goalsError;

      const goals = hiringGoals || [];

      // Calculate totals from hiring goals
      const openCount = goals.length;
      const activeCount = goals.filter(g => g.status === 'active' || g.status === 'published').length;

      // Get goal IDs for querying applications
      const goalIds = goals.map(g => g.id);

      let applicationsLast30d = 0;
      let pendingReviewsCount = 0;
      const postApplicationCounts: Record<string, { total: number; recent: number }> = {};

      if (goalIds.length > 0) {
        // Fetch all challenge invitations (applications) for these hiring goals
        const { data: invitations, error: invError } = await supabase
          .from('challenge_invitations')
          .select('id, hiring_goal_id, status, created_at')
          .in('hiring_goal_id', goalIds);

        if (invError) throw invError;

        const allInvitations = invitations || [];

        // Count applications in last 30 days
        applicationsLast30d = allInvitations.filter(inv => 
          new Date(inv.created_at) >= new Date(thirtyDaysAgo)
        ).length;

        // Count pending reviews (status = 'pending' or 'sent')
        pendingReviewsCount = allInvitations.filter(inv => 
          inv.status === 'pending' || inv.status === 'sent'
        ).length;

        // Build per-post counts
        for (const inv of allInvitations) {
          if (!postApplicationCounts[inv.hiring_goal_id]) {
            postApplicationCounts[inv.hiring_goal_id] = { total: 0, recent: 0 };
          }
          postApplicationCounts[inv.hiring_goal_id].total++;
          if (new Date(inv.created_at) >= new Date(sevenDaysAgo)) {
            postApplicationCounts[inv.hiring_goal_id].recent++;
          }
        }
      }

      // Build latest posts (max 3)
      const latestPosts: JobPostSummary[] = goals.slice(0, 3).map(goal => ({
        id: goal.id,
        title: goal.role_title || 'Untitled Position',
        status: goal.status || 'draft',
        updatedAt: goal.updated_at,
        applicationsCount: postApplicationCounts[goal.id]?.total || 0,
        newApplicationsLast7Days: postApplicationCounts[goal.id]?.recent || 0,
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
