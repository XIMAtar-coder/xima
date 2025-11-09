import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useSupabaseAssessmentData } from '@/hooks/useSupabaseAssessmentData';
import { XimatarProfileCard } from '@/components/results/XimatarProfileCard';
import { CVComparisonCard } from '@/components/results/CVComparisonCard';
import { ProgressBar } from '@/components/results/ProgressBar';
import { OpenAnswerScore } from '@/components/ximatar-journey/OpenAnswerScore';
import FeaturedProfessionals, { type FieldKey } from '@/components/FeaturedProfessionals';
import { supabase } from '@/integrations/supabase/client';

const Risultati = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const assessmentData = useSupabaseAssessmentData();
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedField, setSelectedField] = useState<FieldKey>('business_leadership');

  useEffect(() => {
    // Get preferred field from profiles - using rationale json for now
    const fetchPreferredField = async () => {
      if (!user?.id) return;

      const { data: assessmentResult } = await supabase
        .from('assessment_results')
        .select('rationale')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessmentResult?.rationale) {
        const field = (assessmentResult.rationale as any)?.field_key;
        if (field) setSelectedField(field as FieldKey);
      }
    };

    fetchPreferredField();
  }, [user]);

  const handleProfessionalSelect = (professional: any) => {
    setSelectedProfessional(professional);
  };

  const handleProceed = async () => {
    if (!selectedProfessional) return;

    // Store professional selection in database
    if (user?.id && selectedProfessional.id) {
      await supabase
        .from('bookings')
        .insert({
          seeker_user_id: user.id,
          professional_id: selectedProfessional.id,
          status: 'pending',
          starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
        });
    }

    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/register');
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('common.login_required')}</h2>
          <Button onClick={() => navigate('/login')}>{t('common.login')}</Button>
        </div>
      </MainLayout>
    );
  }

  if (assessmentData.isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto py-8 space-y-8 watermark-bg animate-[slide-up_0.4s_ease-out]">
        {/* Header */}
        <div className="text-center space-y-4 relative z-10">
          <h1 className="text-4xl font-bold font-heading">{t('results.page_title')}</h1>
          <p className="text-xl text-muted-foreground">{t('results.page_subtitle')}</p>
        </div>

        {/* Progress Bar */}
        <ProgressBar progress={assessmentData.progress} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {/* Left Column */}
          <div className="space-y-6">
            {/* XIMAtar Profile */}
            <XimatarProfileCard ximatar={assessmentData.ximatar} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* CV vs Assessment Comparison */}
            <CVComparisonCard 
              cvPillars={assessmentData.cvPillars}
              assessmentPillars={assessmentData.pillars}
            />
          </div>
        </div>

        {/* Open Question Scores */}
        {assessmentData.openQuestionScores.length > 0 && (
          <div className="space-y-4 fade-in">
            <h3 className="text-2xl font-bold text-center">{t('open_scoring.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessmentData.openQuestionScores.map((response: any) => (
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

        {/* Professional Selection */}
        <Card className="fade-in">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">{t('professionals.select_title')}</h3>
              <p className="text-muted-foreground">{t('professionals.select_subtitle')}</p>
            </div>

            <FeaturedProfessionals 
              onSelect={handleProfessionalSelect}
              fieldKey={selectedField}
            />

            {selectedProfessional && (
              <div className="text-center">
                <Button size="lg" onClick={handleProceed}>
                  {isAuthenticated ? t('results.proceed_to_profile') : t('results.register_to_continue')}
                  <ArrowRight className="ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Risultati;
