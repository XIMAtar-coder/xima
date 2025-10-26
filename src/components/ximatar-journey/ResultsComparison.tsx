
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import XimaScoreCard from '../XimaScoreCard';
import { OpenAnswerScore } from './OpenAnswerScore';
import FeaturedProfessionals, { type FieldKey } from '../FeaturedProfessionals';
import ProfileXimatarBadge from '../ximatar/ProfileXimatarBadge';
import { ArrowRight } from 'lucide-react';
import { XimaPillars } from '../../types';
import { useUser } from '../../context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import type { Rubric } from '@/lib/scoring/openResponse';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useUser();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [openResponses, setOpenResponses] = useState<Array<{
    open_key: 'open1' | 'open2';
    answer: string;
    score: number;
    rubric: Rubric;
  }>>([]);
  const [selectedField] = useState<FieldKey>(() => {
    return (localStorage.getItem('preferred_field') as FieldKey) || 'business_leadership';
  });
  
  // Fetch assigned XIMAtar and assessment results
  const [assignedXimatar, setAssignedXimatar] = useState<any>(null);
  const [assessmentPillars, setAssessmentPillars] = useState<XimaPillars | null>(null);
  const [top3Matches, setTop3Matches] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch assigned XIMAtar and assessment results
  useEffect(() => {
    const fetchXimatarAndResults = async () => {
      if (!user?.id) return;
      
      // 1) Fetch assigned XIMAtar from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('ximatar')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.ximatar) {
        // Fetch the full XIMAtar details by label
        const { data: ximatarData } = await supabase
          .from('ximatars')
          .select(`
            id,
            label,
            image_url,
            updated_at,
            vector,
            ximatar_translations (
              lang,
              title,
              core_traits
            )
          `)
          .eq('label', profile.ximatar)
          .single();

        if (ximatarData) {
          const lang = localStorage.getItem('i18nextLng') || 'it';
          const translation = (ximatarData as any).ximatar_translations?.find((t: any) => t.lang === lang) 
            || (ximatarData as any).ximatar_translations?.[0];
          
          setAssignedXimatar({
            ...ximatarData,
            name: translation?.title || ximatarData.label,
            traits: translation?.core_traits ? JSON.parse(translation.core_traits) : []
          });
        }
      }

      // 2) Fetch latest assessment results for pillars and top-3
      const { data: latestResult } = await supabase
        .from('assessment_results')
        .select('pillars, top3')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestResult?.pillars) {
        const pillars = latestResult.pillars as any;
        setAssessmentPillars({
          computational: pillars.comp_power || 0,
          communication: pillars.communication || 0,
          knowledge: pillars.knowledge || 0,
          creativity: pillars.creativity || 0,
          drive: pillars.drive || 0
        });
      }

      if (latestResult?.top3 && Array.isArray(latestResult.top3)) {
        setTop3Matches(latestResult.top3);
      }

      // 3) Fetch open responses
      const attemptId = localStorage.getItem('current_attempt_id');
      if (attemptId) {
        const { data: openData } = await supabase
          .from('assessment_open_responses')
          .select('open_key, answer, score, rubric')
          .eq('user_id', user.id)
          .eq('attempt_id', attemptId)
          .order('open_key', { ascending: true });

        if (openData) {
          setOpenResponses(openData as any);
        }
      }
    };

    if (showResults) {
      fetchXimatarAndResults();
    }
  }, [showResults, user]);

  const handleProfessionalSelect = (professional: any) => {
    setSelectedProfessional(professional.id);
    // Store the full professional data for later use
    localStorage.setItem('selected_professional_data', JSON.stringify(professional));
  };

  const handleProceedWithSelection = () => {
    if (!selectedProfessional) return;
    
    const professionalData = JSON.parse(localStorage.getItem('selected_professional_data') || '{}');
    
    if (isAuthenticated) {
      // User is already authenticated, go to profile/dashboard
      navigate('/profile', { 
        state: { 
          selectedProfessional: professionalData,
          assessmentResults: assessmentPillars,
          assignedXimatar
        }
      });
    } else {
      // User needs to register, store selection and redirect to Italian journey
      localStorage.setItem('ximatar_journey_data', JSON.stringify({
        ximatar: assignedXimatar,
        professional: professionalData,
        pillars: assessmentPillars
      }));
      navigate('/il-tuo-viaggio');
    }
  };

  if (isAnalyzing) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4171d6]"></div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('results.analyzing')}</h2>
          <p className="text-gray-600">{t('results.analyzing_subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t('results.title')}</h2>
        <p className="text-muted-foreground">
          {hasCv ? t('results.subtitle_with_cv') : t('results.subtitle_without_cv')}
        </p>
      </div>

      {/* Assigned XIMAtar Section */}
      {assignedXimatar && (
        <Card className="p-6">
          <div className="max-w-2xl mx-auto">
            <ProfileXimatarBadge
              name={assignedXimatar.name}
              avatar_path={assignedXimatar.image_url}
              updated_at={assignedXimatar.updated_at}
              subtitle={t('ximatar.your_ximatar')}
              traits={assignedXimatar.traits}
              size="lg"
              className="bg-card"
            />
            
            {/* Top-3 Matches (optional) */}
            {top3Matches.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground mb-3">
                  {t('ximatar.other_close_matches', 'Other close matches')}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {top3Matches.map((match: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {match.key} ({(match.score * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Professional Selection Section */}
      <Card className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center">{t('professionals.title')}</h3>
        <p className="text-center text-muted-foreground mb-8">{t('professionals.subtitle')}</p>
        
        <FeaturedProfessionals 
          onSelect={handleProfessionalSelect}
          fieldKey={selectedField}
        />

        {selectedProfessional && (
          <div className="text-center mt-8">
            <Button 
              size="lg"
              onClick={handleProceedWithSelection}
              className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
            >
              {isAuthenticated ? t('results.proceed_to_dashboard') : t('results.register_to_continue')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {/* Assessment Pillar Scores */}
      {assessmentPillars && (
        <Card className="p-8">
          <h3 className="text-xl font-semibold text-center mb-6">
            {t('results.your_scores', 'Your Scores')}
          </h3>
          <XimaScoreCard pillars={assessmentPillars} showTooltip />
        </Card>
      )}

      {/* Open Answer Scores */}
      {openResponses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center">{t('open_scoring.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openResponses.map((response) => (
              <OpenAnswerScore
                key={response.open_key}
                openKey={response.open_key}
                rubric={response.rubric}
                answer={response.answer}
              />
            ))}
          </div>
        </div>
      )}

      {!selectedProfessional && (
        <div className="text-center">
          <p className="text-gray-500">{t('results.select_professional_prompt')}</p>
        </div>
      )}
    </div>
  );
};

export default ResultsComparison;
