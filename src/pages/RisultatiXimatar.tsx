import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FeaturedProfessionals, { type FieldKey } from '@/components/FeaturedProfessionals';
import { OpenAnswerScore } from '@/components/ximatar-journey/OpenAnswerScore';
import { XimatarProfile } from '@/components/ximatar-journey/XimatarProfile';
import { CVComparison } from '@/components/ximatar-journey/CVComparison';
import { useTheme } from 'next-themes';
import type { Rubric } from '@/lib/scoring/openResponse';
import { useNavigate } from 'react-router-dom';

const RisultatiXimatar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const { resolvedTheme } = useTheme();
  const [selectedField] = useState<FieldKey>(() => (localStorage.getItem('preferred_field') as FieldKey) || 'business_leadership');

  const [assignedXimatar, setAssignedXimatar] = useState<any>(null);
  const [assessmentPillars, setAssessmentPillars] = useState<any>(null);
  const [cvPillars, setCvPillars] = useState<any>(null);
  const [top3Matches, setTop3Matches] = useState<any[]>([]);
  const [openResponses, setOpenResponses] = useState<Array<{ open_key: 'open1' | 'open2'; answer: string; score: number; rubric: Rubric }>>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // latest assessment result with joined ximatar
      const { data: latestResult } = await supabase
        .from('assessment_results')
        .select(`
          pillars,
          top3,
          ximatar_id,
          ximatars (
            id,
            label,
            image_url,
            updated_at,
            vector,
            ximatar_translations (
              lang,
              title,
              core_traits,
              behavior,
              weaknesses,
              ideal_roles
            )
          )
        `)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestResult?.ximatars) {
        const ximatarData = latestResult.ximatars as any;
        const lang = localStorage.getItem('i18nextLng') || 'it';
        const translation = ximatarData.ximatar_translations?.find((t: any) => t.lang === lang) || ximatarData.ximatar_translations?.[0];
        setAssignedXimatar({
          ...ximatarData,
          name: translation?.title || ximatarData.label,
          traits: translation?.core_traits ? translation.core_traits.split(' – ') : []
        });
      }

      if (latestResult?.pillars) {
        const p: any = latestResult.pillars;
        setAssessmentPillars({
          computational: p.comp_power || 0,
          communication: p.communication || 0,
          knowledge: p.knowledge || 0,
          creativity: p.creativity || 0,
          drive: p.drive || 0
        });
      }

      if (latestResult?.top3 && Array.isArray(latestResult.top3)) setTop3Matches(latestResult.top3);

      // Check for CV upload and baseline assessment
      if (user?.id) {
        const { data: cvData } = await supabase
          .from('cv_uploads')
          .select('analysis_results')
          .eq('user_id', user.id)
          .eq('analysis_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cvData?.analysis_results) {
          const analysis = cvData.analysis_results as any;
          if (analysis.pillars) {
            setCvPillars({
              computational: analysis.pillars.computational || 0,
              communication: analysis.pillars.communication || 0,
              knowledge: analysis.pillars.knowledge || 0,
              creativity: analysis.pillars.creativity || 0,
              drive: analysis.pillars.drive || 0
            });
          }
        }
      }

      // open answers by attempt
      const attemptId = localStorage.getItem('current_attempt_id');
      if (attemptId && user?.id) {
        const { data: openData } = await supabase
          .from('assessment_open_responses')
          .select('open_key, answer, score, rubric')
          .eq('user_id', user.id)
          .eq('attempt_id', attemptId)
          .order('open_key', { ascending: true });
        if (openData) setOpenResponses(openData as any);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleProfessionalSelect = (professional: any) => {
    setSelectedProfessional(professional.id);
    localStorage.setItem('selected_professional_data', JSON.stringify(professional));
  };

  const proceed = () => {
    if (!selectedProfessional) return;
    const professionalData = JSON.parse(localStorage.getItem('selected_professional_data') || '{}');
    localStorage.setItem('ximatar_journey_data', JSON.stringify({
      ximatar: assignedXimatar,
      professional: professionalData,
      pillars: assessmentPillars
    }));
    navigate(isAuthenticated ? '/profile' : '/register');
  };

  const logoSrc = (resolvedTheme === 'dark') ? '/assets/logo_dark.png' : '/assets/logo_light.png';

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto py-8">
        <div className="text-center mb-8">
          <img src={logoSrc} alt="XIMA Logo" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">{t('results.page_title')}</h1>
          <p className="text-muted-foreground">{t('results.page_subtitle')}</p>
        </div>

        {/* XIMAtar Profile with Strengths/Weaknesses */}
        {assignedXimatar && (
          <div className="mb-8">
            <XimatarProfile ximatar={assignedXimatar} top3Matches={top3Matches} />
          </div>
        )}

        {/* CV vs Assessment Comparison */}
        {assessmentPillars && (
          <div className="mb-8">
            <CVComparison cvPillars={cvPillars} assessmentPillars={assessmentPillars} />
          </div>
        )}

        {/* Professionals */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">{t('professionals.select_title')}</h3>
          <p className="text-center text-muted-foreground mb-8">{t('professionals.select_subtitle')}</p>
          <FeaturedProfessionals onSelect={handleProfessionalSelect} fieldKey={selectedField} />
          {selectedProfessional && (
            <div className="text-center mt-8">
              <Button size="lg" onClick={proceed}>
                {isAuthenticated ? t('results.go_to_profile') : t('results.register_now')}
              </Button>
            </div>
          )}
        </Card>

        {/* Open answers */}
        {openResponses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">{t('results.open_responses_title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openResponses.map((response) => (
                <OpenAnswerScore key={response.open_key} openKey={response.open_key} rubric={response.rubric} answer={response.answer} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RisultatiXimatar;
