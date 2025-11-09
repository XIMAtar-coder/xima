import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface AssessmentData {
  ximatar: any;
  pillars: any;
  openQuestionScores: any[];
  cvPillars: any;
  professional: any;
  isLoading: boolean;
  progress: number;
}

export const useSupabaseAssessmentData = () => {
  const { user } = useUser();
  const [data, setData] = useState<AssessmentData>({
    ximatar: null,
    pillars: null,
    openQuestionScores: [],
    cvPillars: null,
    professional: null,
    isLoading: true,
    progress: 0
  });

  useEffect(() => {
    const fetchAssessmentData = async () => {
      if (!user?.id) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setData(prev => ({ ...prev, isLoading: true }));

      try {
        // Fetch latest assessment result
        const { data: assessmentResult, error: assessmentError } = await supabase
          .from('assessment_results')
        .select(`
            *,
            ximatars (
              id,
              label,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assessmentError) throw assessmentError;

        // Fetch pillar scores
        let pillars = null;
        if (assessmentResult) {
          const { data: pillarData } = await supabase
            .from('pillar_scores')
            .select('pillar, score')
            .eq('assessment_result_id', assessmentResult.id);

          if (pillarData) {
            pillars = pillarData.reduce((acc: any, { pillar, score }: any) => {
              const key = pillar === 'computational_power' ? 'computational' : pillar;
              acc[key] = score;
              return acc;
            }, {});
          }
        }

        // Fetch open question scores
        const { data: openResponses } = await supabase
          .from('assessment_open_responses')
          .select('open_key, answer, score, rubric')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(2);

        // Fetch CV analysis if exists
        const { data: cvData } = await supabase
          .from('cv_uploads')
          .select('analysis_results')
          .eq('user_id', user.id)
          .eq('analysis_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const cvPillars = cvData?.analysis_results ? (cvData.analysis_results as any).pillars : null;

        // Fetch XIMAtar translations
        let ximatarWithTranslations = null;
        if (assessmentResult?.ximatars) {
          const { data: translations } = await supabase
            .from('ximatar_translations')
            .select('*')
            .eq('ximatar_id', (assessmentResult.ximatars as any).id)
            .eq('lang', 'it')
            .maybeSingle();

          ximatarWithTranslations = {
            ...(assessmentResult.ximatars as any),
            translations
          };
        }

        // Calculate progress percentage
        let progress = 0;
        if (assessmentResult) progress += 50;
        if (cvData) progress += 25;
        if (openResponses && openResponses.length > 0) progress += 25;

        setData({
          ximatar: ximatarWithTranslations,
          pillars: (assessmentResult?.rationale as any)?.pillars || pillars || {},
          openQuestionScores: openResponses || [],
          cvPillars,
          professional: null, // Will be set separately
          isLoading: false,
          progress
        });
      } catch (error) {
        console.error('Error fetching assessment data:', error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchAssessmentData();
  }, [user]);

  return data;
};
