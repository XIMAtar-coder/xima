import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, User, Sparkles, ArrowRight, X } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useProfileData } from '@/hooks/useProfileData';
import { XimatarProfileCard } from '@/components/results/XimatarProfileCard';
import { MentorSection } from '@/components/profile/MentorSection';
import { ProfileCompletionModal } from '@/components/profile/ProfileCompletionModal';

import { PillarRadarChart } from '@/components/profile/PillarRadarChart';
import { XimatarHeroCard } from '@/components/profile/XimatarHeroCard';
import { StrengthFrictionSummary } from '@/components/profile/StrengthFrictionSummary';
import { AssessmentOverviewCard } from '@/components/profile/AssessmentOverviewCard';
import { OpenAnswerList } from '@/components/profile/OpenAnswerList';
import { CVAnalysisCard } from '@/components/profile/CVAnalysisCard';
import { MyOpportunitiesSection } from '@/components/opportunities/MyOpportunitiesSection';
import { MembershipSummaryCard } from '@/components/profile/MembershipSummaryCard';
import { ChallengesForYouSection } from '@/components/profile/ChallengesForYouSection';
import { XimaJourneyGuideModal } from '@/components/onboarding/XimaJourneyGuideModal';
import { useOnboardingState } from '@/hooks/useOnboardingState';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = React.useState(0);
  const [mentorRefreshKey, setMentorRefreshKey] = React.useState(0);
  const [processingMentor, setProcessingMentor] = React.useState(false);
  const profileData = useProfileData(profileRefreshKey);
  const { shouldAutoShowGuide, completeStep } = useOnboardingState();
  const [guideOpen, setGuideOpen] = useState(false);

  const hasMentor = !!profileData.mentor_profile;

  useEffect(() => {
    if (shouldAutoShowGuide) setGuideOpen(true);
  }, [shouldAutoShowGuide]);

  useEffect(() => {
    if (hasMentor) completeStep('choose_mentor');
  }, [hasMentor, completeStep]);
  
  useEffect(() => {
    const processPendingMentorAssignment = async () => {
      if (!isAuthenticated || !user?.id || processingMentor) return;
      const selectedProfessionalData = localStorage.getItem('selected_professional_data');
      if (!selectedProfessionalData) return;
      if (profileData.mentor_profile) {
        localStorage.removeItem('selected_professional_data');
        return;
      }
      try {
        setProcessingMentor(true);
        const professional = JSON.parse(selectedProfessionalData);
        const { data, error } = await supabase.functions.invoke('assign-mentor', { body: { professional_id: professional.id } });
        if (error) {
          toast({ title: "Note", description: "We'll assign your selected mentor shortly." });
        } else if (data?.success) {
          localStorage.removeItem('selected_professional_data');
          toast({ title: "Success", description: `${professional.full_name} has been assigned as your mentor!` });
          setProfileRefreshKey(prev => prev + 1);
        }
      } catch (error) {
        console.error('[Profile] Failed to process mentor assignment:', error);
      } finally { setProcessingMentor(false); }
    };
    const timeout = setTimeout(() => { processPendingMentorAssignment(); }, 1000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, user?.id, profileData.mentor_profile, processingMentor, toast]);
  
  const handleAvatarUpdate = () => setRefreshKey(prev => prev + 1);
  const handleCVUploadSuccess = () => setProfileRefreshKey(prev => prev + 1);
  const handleMentorBookingSuccess = () => { setMentorRefreshKey(prev => prev + 1); setProfileRefreshKey(prev => prev + 1); };
  const handleGuideClose = (dontShowAgain: boolean) => {
    setGuideOpen(false);
    if (dontShowAgain || shouldAutoShowGuide) completeStep('welcome_seen');
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 text-center">
          <h2 className="text-[28px] font-bold mb-4 text-foreground">{t('common.login_required')}</h2>
          <Button onClick={() => navigate('/login')}>{t('common.login')}</Button>
        </div>
      </MainLayout>
    );
  }

  if (profileData.isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </MainLayout>
    );
  }

  if (!profileData.hasAssessment) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 space-y-8">
          <XimaJourneyGuideModal open={guideOpen} onClose={handleGuideClose} isAutoOpen={shouldAutoShowGuide} />
          <div className="glass-surface rounded-[20px] text-center py-16 px-6 hover:translate-y-0">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-[20px] bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-[28px] md:text-[34px] font-bold mb-4 text-foreground">{t('profile.no_assessment_title')}</h2>
            <p className="text-muted-foreground text-[17px] mb-8 max-w-md mx-auto">{t('profile.no_assessment_desc')}</p>
            <Button size="lg" onClick={() => navigate('/ximatar-journey')} className="challenge-active-ring">
              <Sparkles className="mr-2 h-5 w-5" strokeWidth={1.5} />
              {t('profile.start_assessment')}
            </Button>
            <div className="h-1 momentum-bar mt-8 rounded-[999px] max-w-xs mx-auto" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-6 watermark-bg">
        <XimaJourneyGuideModal open={guideOpen} onClose={handleGuideClose} isAutoOpen={shouldAutoShowGuide} />

        <div className="space-y-2 relative z-10">
          <p className="text-[12px] font-medium text-primary uppercase tracking-[0.04em]">
            {t('dashboard.page_label', 'Dashboard')}
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold text-foreground">
            {t('dashboard.welcome_headline', { name: profileData.full_name || user?.name || t('profile.user') })}
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-lg">{t('dashboard.welcome_subheadline')}</p>
        </div>

        <div className="space-y-6 relative z-10 dashboard-stagger">
          <MembershipSummaryCard />
          <XimatarHeroCard
            ximatarName={profileData.ximatar_name} ximatarImage={profileData.ximatar_image}
            driveLevel={profileData.drive_level} strongestPillar={profileData.strongest_pillar}
            weakestPillar={profileData.weakest_pillar} storytelling={profileData.ximatar_storytelling}
            fullName={profileData.full_name} avatarUrl={(user?.avatar as any)?.image || null}
            pillarScores={profileData.pillar_scores} onAvatarUpdate={handleAvatarUpdate}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-6">
              <StrengthFrictionSummary strongestPillar={profileData.strongest_pillar} weakestPillar={profileData.weakest_pillar} growthPath={profileData.ximatar_growth_path} />
              {profileData.pillar_scores && <PillarRadarChart pillars={profileData.pillar_scores} />}
              {profileData.pillar_scores && <AssessmentOverviewCard pillarScores={profileData.pillar_scores} driveLevel={profileData.drive_level} storytelling={profileData.ximatar_storytelling} />}
              {profileData.open_answers && profileData.open_answers.length > 0 && <OpenAnswerList openAnswers={profileData.open_answers} />}
            </div>
            <div className="space-y-6">
              <MentorSection mentor={profileData.mentor_profile} onBookingSuccess={handleMentorBookingSuccess} />
              <CVAnalysisCard cvAnalysis={profileData.cv_analysis} cvPillarScores={profileData.cv_pillar_scores} assessmentPillarScores={profileData.pillar_scores} onUploadSuccess={handleCVUploadSuccess} />
            </div>
          </div>

          <ChallengesForYouSection />
          <MyOpportunitiesSection />
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
