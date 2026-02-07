import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, User, Sparkles, ArrowRight } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useProfileData } from '@/hooks/useProfileData';
import { XimatarProfileCard } from '@/components/results/XimatarProfileCard';
import { MentorSection } from '@/components/profile/MentorSection';

import { PillarRadarChart } from '@/components/profile/PillarRadarChart';
import { XimatarHeroCard } from '@/components/profile/XimatarHeroCard';
import { StrengthFrictionSummary } from '@/components/profile/StrengthFrictionSummary';
import { AssessmentOverviewCard } from '@/components/profile/AssessmentOverviewCard';
import { OpenAnswerList } from '@/components/profile/OpenAnswerList';
import { CVAnalysisCard } from '@/components/profile/CVAnalysisCard';
import { MyOpportunitiesSection } from '@/components/opportunities/MyOpportunitiesSection';
import { MembershipSummaryCard } from '@/components/profile/MembershipSummaryCard';
// Removed ChallengeInvitationBanner - ChallengesForYouSection is the single source of truth
import { ChallengesForYouSection } from '@/components/profile/ChallengesForYouSection';
import { WelcomeOverlay } from '@/components/onboarding/WelcomeOverlay';
import { OnboardingHintBanner } from '@/components/onboarding/OnboardingHintBanner';
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
  const { showWelcome, completeStep } = useOnboardingState();
  
  // Process pending mentor assignment after registration
  useEffect(() => {
    const processPendingMentorAssignment = async () => {
      if (!isAuthenticated || !user?.id || processingMentor) return;
      
      // Check if there's a selected professional from the journey
      const selectedProfessionalData = localStorage.getItem('selected_professional_data');
      if (!selectedProfessionalData) return;
      
      // Check if user already has a mentor
      if (profileData.mentor_profile) {
        console.log('[Profile] User already has a mentor, skipping assignment');
        localStorage.removeItem('selected_professional_data');
        return;
      }
      
      try {
        setProcessingMentor(true);
        const professional = JSON.parse(selectedProfessionalData);
        console.log('[Profile] Processing pending mentor assignment:', professional);
        
        const { data, error } = await supabase.functions.invoke('assign-mentor', {
          body: { professional_id: professional.id },
        });
        
        if (error) {
          console.error('[Profile] Error assigning mentor:', error);
          toast({
            title: "Note",
            description: "We'll assign your selected mentor shortly.",
          });
        } else if (data?.success) {
          console.log('[Profile] Mentor assigned successfully:', data.mentor);
          localStorage.removeItem('selected_professional_data');
          toast({
            title: "Success",
            description: `${professional.full_name} has been assigned as your mentor!`,
          });
          // Refresh profile data to show the mentor
          setProfileRefreshKey(prev => prev + 1);
        }
      } catch (error) {
        console.error('[Profile] Failed to process mentor assignment:', error);
      } finally {
        setProcessingMentor(false);
      }
    };
    
    // Wait a bit for profile data to load before processing
    const timeout = setTimeout(() => {
      processPendingMentorAssignment();
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [isAuthenticated, user?.id, profileData.mentor_profile, processingMentor, toast]);
  
  const handleAvatarUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCVUploadSuccess = () => {
    // Trigger profile data refresh without hard reload
    setProfileRefreshKey(prev => prev + 1);
  };

  const handleMentorBookingSuccess = () => {
    setMentorRefreshKey(prev => prev + 1);
    setProfileRefreshKey(prev => prev + 1);
  };

  console.log('[Profile] render profileData', profileData);
  
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

  // No assessment completed yet
  if (!profileData.hasAssessment) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-12 space-y-8">
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Sparkles className="h-24 w-24 text-primary opacity-50" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">{t('profile.no_assessment_title')}</h2>
                <p className="text-muted-foreground text-lg mb-8">{t('profile.no_assessment_desc')}</p>
              </div>
              <Button size="lg" onClick={() => navigate('/ximatar-journey')}>
                <Sparkles className="mr-2 h-5 w-5" />
                {t('profile.start_assessment')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto py-8 space-y-8 watermark-bg animate-[slide-up_0.4s_ease-out]">
        {/* Header with Full Name */}
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold flex items-center gap-3 font-heading">
              <Sparkles className="text-primary" />
              {t('profile.welcome_name', { name: profileData.full_name || user?.name || t('profile.user') })}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">{t('profile.page_subtitle')}</p>
        </div>

        <div className="space-y-8 relative z-10">
          {/* Welcome overlay for first-time users */}
          <WelcomeOverlay
            open={showWelcome}
            onStart={() => completeStep('welcome_seen')}
            onSkip={() => completeStep('welcome_seen')}
          />

          {/* Onboarding hint */}
          <OnboardingHintBanner hintKey="dashboard" />

          {/* Membership & Credits Recap */}
          <MembershipSummaryCard />

          {/* XIMAtar Hero Card - Full Width with Profile Photo */}
          <XimatarHeroCard
            ximatarName={profileData.ximatar_name}
            ximatarImage={profileData.ximatar_image}
            driveLevel={profileData.drive_level}
            strongestPillar={profileData.strongest_pillar}
            weakestPillar={profileData.weakest_pillar}
            storytelling={profileData.ximatar_storytelling}
            fullName={profileData.full_name}
            avatarUrl={(user?.avatar as any)?.image || null}
            pillarScores={profileData.pillar_scores}
            onAvatarUpdate={handleAvatarUpdate}
          />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Strength & Friction Summary */}
              <StrengthFrictionSummary 
                strongestPillar={profileData.strongest_pillar}
                weakestPillar={profileData.weakest_pillar}
                growthPath={profileData.ximatar_growth_path}
              />
              
              {/* Pillar Radar Chart */}
              {profileData.pillar_scores && (
                <PillarRadarChart pillars={profileData.pillar_scores} />
              )}

              {/* Assessment Overview */}
              {profileData.pillar_scores && (
                <AssessmentOverviewCard 
                  pillarScores={profileData.pillar_scores}
                  driveLevel={profileData.drive_level}
                  storytelling={profileData.ximatar_storytelling}
                />
              )}

              {/* Open Answers */}
              {profileData.open_answers && profileData.open_answers.length > 0 && (
                <OpenAnswerList openAnswers={profileData.open_answers} />
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Unified Mentor Section - Identity + Availability */}
              <MentorSection 
                mentor={profileData.mentor_profile} 
                onBookingSuccess={handleMentorBookingSuccess}
              />


              {/* CV Analysis */}
              <CVAnalysisCard 
                cvAnalysis={profileData.cv_analysis}
                cvPillarScores={profileData.cv_pillar_scores}
                assessmentPillarScores={profileData.pillar_scores}
                onUploadSuccess={handleCVUploadSuccess}
              />
            </div>
          </div>

          {/* Full Width Sections */}
          {/* Challenges for You */}
          <ChallengesForYouSection />
          
          {/* Job Opportunities */}
          <MyOpportunitiesSection />

        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
