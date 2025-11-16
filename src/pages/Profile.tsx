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
import { PillarRadarChart } from '@/components/profile/PillarRadarChart';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const assessmentData = useSupabaseAssessmentData();
  
  const [mentorData, setMentorData] = useState<any>(null);
  const [fullName, setFullName] = useState<string>('');
  const [driveLevel, setDriveLevel] = useState<'high' | 'medium' | 'low'>('medium');
  
  // Calculate drive level from pillar scores
  useEffect(() => {
    if (assessmentData.pillars?.drive) {
      const driveScore = assessmentData.pillars.drive;
      if (driveScore >= 7.5) setDriveLevel('high');
      else if (driveScore >= 5) setDriveLevel('medium');
      else setDriveLevel('low');
    }
  }, [assessmentData.pillars]);
  
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

        {/* Check if user has assessment data */}
        {!assessmentData.ximatar && !assessmentData.pillars ? (
          <Card className="p-12 text-center animate-fade-in">
            <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">{t('profile.no_assessment_title', 'Complete Your First XIMA Assessment')}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('profile.no_assessment_desc', 'Complete your first XIMA Assessment to unlock your professional blueprint and discover your XIMAtar archetype')}
            </p>
            <Button size="lg" onClick={() => navigate('/ximatar-journey')}>
              <ArrowRight className="mr-2" />
              {t('profile.start_assessment', 'Start Assessment')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Profile Photo Upload */}
                <ProfilePhotoUpload />
                
                {/* XIMAtar Profile */}
                {assessmentData.ximatar && (
                  <XimatarProfileCard ximatar={assessmentData.ximatar} />
                )}
                
                {/* Pillar Radar Chart */}
                {assessmentData.pillars && (
                  <PillarRadarChart pillars={assessmentData.pillars} />
                )}
                
                {/* Drive Level Card */}
                {assessmentData.pillars?.drive && (
                  <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle className="font-heading">{t('pillars.drive.name')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className={`
                          p-4 rounded-lg border-2
                          ${driveLevel === 'high' ? 'bg-green-500/5 border-green-500/20' :
                            driveLevel === 'medium' ? 'bg-blue-500/5 border-blue-500/20' :
                            'bg-orange-500/5 border-orange-500/20'
                          }
                        `}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="default"
                              className={`
                                ${driveLevel === 'high' ? 'bg-green-600' :
                                  driveLevel === 'medium' ? 'bg-blue-600' :
                                  'bg-orange-600'
                                }
                              `}
                            >
                              {t(`ximatar_intro.drive_paths.${driveLevel}`)}
                            </Badge>
                            <span className="text-sm font-semibold">{assessmentData.pillars.drive.toFixed(1)}/10</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t(`ximatar_intro.drive_paths.${driveLevel}_desc`)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* CV Analysis (if available) */}
                {assessmentData.cvPillars && (
                  <CVComparisonCard 
                    cvPillars={assessmentData.cvPillars}
                    assessmentPillars={assessmentData.pillars}
                  />
                )}
                
                {/* Personalized Challenge */}
                {assessmentData.ximatar && (
                  <PersonalizedChallenge
                    userId={user?.id || ''}
                    ximatarType={assessmentData.ximatar.label}
                    pillarScores={assessmentData.pillars}
                  />
                )}
                
                {/* Mentor Section */}
                {mentorData && <MentorSection mentor={mentorData} />}
              </div>
            </div>
          </div>
        )}

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
