import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserHeaderData = (userId: string | undefined) => {
  const [data, setData] = useState<{
    ximatarImage: string | null;
    totalScore: number;
    isLoading: boolean;
  }>({
    ximatarImage: null,
    totalScore: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchHeaderData = async () => {
      if (!userId) {
        setData({ ximatarImage: null, totalScore: 0, isLoading: false });
        return;
      }

      try {
        // Fetch latest assessment result with ximatar
        const { data: assessmentResult } = await supabase
          .from('assessment_results')
          .select(`
            total_score,
            ximatars (
              image_url
            )
          `)
          .eq('user_id', userId)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assessmentResult) {
          setData({
            ximatarImage: assessmentResult.ximatars?.image_url || null,
            totalScore: Math.round(assessmentResult.total_score || 0),
            isLoading: false
          });
        } else {
          setData({ ximatarImage: null, totalScore: 0, isLoading: false });
        }
      } catch (error) {
        console.error('Error fetching user header data:', error);
        setData({ ximatarImage: null, totalScore: 0, isLoading: false });
      }
    };

    fetchHeaderData();
  }, [userId]);

  return data;
};
