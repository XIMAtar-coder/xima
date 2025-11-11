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
        // Fetch latest assessment result with computed data
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
          .eq('completed', true) // Only fetch completed assessments
          .order('computed_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (assessmentError) {
          console.error('Error fetching assessment:', assessmentError);
          throw assessmentError;
        }

        if (!assessmentResult) {
          console.log('No completed assessment found for user');
          setData(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Fetch pillar scores for this assessment
        let pillars: any = null;
        const { data: pillarData, error: pillarError } = await supabase
          .from('pillar_scores')
          .select('pillar, score')
          .eq('assessment_result_id', assessmentResult.id);

        if (pillarError) {
          console.error('Error fetching pillar scores:', pillarError);
        }

        if (pillarData && pillarData.length > 0) {
          pillars = pillarData.reduce((acc: any, { pillar, score }: any) => {
            const key = pillar === 'computational_power' ? 'computational' : pillar;
            acc[key] = score;
            return acc;
          }, {});
          console.log('Fetched pillar scores:', pillars);
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

        // Fetch XIMAtar translations if available
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
        if (assessmentResult && assessmentResult.computed_at) progress += 50;
        if (cvData) progress += 25;
        if (openResponses && openResponses.length > 0) progress += 25;

        setData({
          ximatar: ximatarWithTranslations,
          pillars: pillars || {},
          openQuestionScores: openResponses || [],
          cvPillars,
          professional: null,
          isLoading: false,
          progress
        });

        console.log('Assessment data loaded:', {
          hasXimatar: !!ximatarWithTranslations,
          hasPillars: !!pillars,
          totalScore: assessmentResult.total_score
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
