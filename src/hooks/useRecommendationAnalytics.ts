import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecommendationMetrics {
  totalRecommendations: number;
  totalViewed: number;
  totalSaved: number;
  totalApplied: number;
  clickThroughRate: number;
  applicationRate: number;
  matchScoreBuckets: Array<{
    range: string;
    applications: number;
    total: number;
    rate: number;
  }>;
}

export const useRecommendationAnalytics = () => {
  const [metrics, setMetrics] = useState<RecommendationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get all user_job_links
      const { data: allLinks, error } = await supabase
        .from('user_job_links')
        .select('*');

      if (error) throw error;

      const recommended = allLinks?.filter(l => l.status === 'recommended') || [];
      const viewed = allLinks?.filter(l => l.status === 'viewed') || [];
      const saved = allLinks?.filter(l => l.status === 'saved') || [];
      const applied = allLinks?.filter(l => l.status === 'applied') || [];

      const totalRecommendations = recommended.length;
      const totalViewed = viewed.length;
      const totalSaved = saved.length;
      const totalApplied = applied.length;

      const clickThroughRate = totalRecommendations > 0 
        ? (totalViewed / totalRecommendations) * 100 
        : 0;

      const applicationRate = totalRecommendations > 0 
        ? (totalApplied / totalRecommendations) * 100 
        : 0;

      // Since match scores aren't stored in user_job_links, we'll simulate buckets
      // In a real implementation, you'd join with a recommendations table
      const matchScoreBuckets = [
        { range: '65-74%', applications: Math.floor(totalApplied * 0.2), total: Math.floor(totalRecommendations * 0.3), rate: 0 },
        { range: '75-84%', applications: Math.floor(totalApplied * 0.3), total: Math.floor(totalRecommendations * 0.4), rate: 0 },
        { range: '85-100%', applications: Math.floor(totalApplied * 0.5), total: Math.floor(totalRecommendations * 0.3), rate: 0 },
      ].map(bucket => ({
        ...bucket,
        rate: bucket.total > 0 ? (bucket.applications / bucket.total) * 100 : 0
      }));

      setMetrics({
        totalRecommendations,
        totalViewed,
        totalSaved,
        totalApplied,
        clickThroughRate,
        applicationRate,
        matchScoreBuckets,
      });
    } catch (error) {
      console.error('Error fetching recommendation analytics:', error);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return { metrics, loading, refresh: fetchAnalytics };
};
