import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, User, Sparkles, ArrowRight } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useSupabaseAssessmentData } from '@/hooks/useSupabaseAssessmentData';
import { XimatarProfileCard } from '@/components/results/XimatarProfileCard';
import { CVComparisonCard } from '@/components/results/CVComparisonCard';
import { ProgressBar } from '@/components/results/ProgressBar';
import { OpenAnswerScore } from '@/components/ximatar-journey/OpenAnswerScore';
import { JobMatchesBlock } from '@/components/JobMatchesBlock';
import { useJobMatches } from '@/hooks/useJobMatches';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { MentorSection } from '@/components/profile/MentorSection';
import { PersonalizedChallenge } from '@/components/profile/PersonalizedChallenge';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const assessmentData = useSupabaseAssessmentData();
  
  const [mentorData, setMentorData] = useState<any>(null);
  const [fullName, setFullName] = useState<string>('');
  
  // Fetch user profile with mentor
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, mentor')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setFullName(profile.full_name || user.name || '');
        
        if (profile.mentor) {
          setMentorData(profile.mentor);
        }
      }
    };
    
    fetchProfile();
  }, [user]);

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
        {/* Header with Full Name */}
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold flex items-center gap-3 font-heading">
              <Sparkles className="text-primary" />
              {t('profile.welcome_name', { name: fullName || user?.name || t('profile.user') })}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">{t('profile.page_subtitle')}</p>
        </div>

        {/* Progress Bar */}
        <ProgressBar progress={assessmentData.progress} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Profile Photo Upload */}
            <ProfilePhotoUpload />
            
            {/* XIMAtar Profile */}
            <XimatarProfileCard ximatar={assessmentData.ximatar} />
            
            {/* Mentor Section */}
            {mentorData && <MentorSection mentor={mentorData} />}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pillar Scores / CV Comparison */}
            <CVComparisonCard 
              cvPillars={assessmentData.cvPillars}
              assessmentPillars={assessmentData.pillars}
            />
            
            {/* Personalized Challenge */}
            {assessmentData.ximatar && (
              <PersonalizedChallenge
                userId={user?.id || ''}
                ximatarType={assessmentData.ximatar.label}
                pillarScores={assessmentData.pillars}
              />
            )}
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
      </div>
    </MainLayout>
  );
};

export default Profile;
