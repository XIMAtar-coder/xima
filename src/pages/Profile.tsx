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
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { MentorSection } from '@/components/profile/MentorSection';
import { PersonalizedChallenge } from '@/components/profile/PersonalizedChallenge';
import { PillarRadarChart } from '@/components/profile/PillarRadarChart';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profileData = useProfileData();
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
              {t('profile.welcome_name', { name: profileData.fullName || user?.name || t('profile.user') })}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">{t('profile.page_subtitle')}</p>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Profile Photo Upload */}
              <ProfilePhotoUpload />
              
              {/* XIMAtar Profile */}
              {profileData.ximatar && (
                <XimatarProfileCard ximatar={profileData.ximatar} />
              )}
              
              {/* Pillar Radar Chart */}
              {profileData.pillar_scores && (
                <PillarRadarChart pillars={profileData.pillar_scores} />
              )}
              
              {/* Drive Level Card */}
              {profileData.drive_level && profileData.pillar_scores?.drive && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="font-heading">{t('pillars.drive.name')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className={`
                        p-4 rounded-lg border-2
                        ${profileData.drive_level === 'high' ? 'bg-green-500/5 border-green-500/20' :
                          profileData.drive_level === 'medium' ? 'bg-blue-500/5 border-blue-500/20' :
                          'bg-orange-500/5 border-orange-500/20'
                        }
                      `}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="default"
                            className={`
                              ${profileData.drive_level === 'high' ? 'bg-green-600' :
                                profileData.drive_level === 'medium' ? 'bg-blue-600' :
                                'bg-orange-600'
                              }
                            `}
                          >
                            {t(`ximatar_intro.drive_paths.${profileData.drive_level}`)}
                          </Badge>
                          <span className="text-sm font-semibold">{profileData.pillar_scores.drive.toFixed(1)}/10</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {profileData.ximatar_growth_path || t(`ximatar_intro.drive_paths.${profileData.drive_level}_desc`)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Storytelling */}
              {profileData.ximatar_storytelling && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="font-heading">{t('ximatar_intro.your_story')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {profileData.ximatar_storytelling}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Strongest/Weakest Pillars */}
              {(profileData.strongest_pillar || profileData.weakest_pillar) && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="font-heading">{t('profile.pillar_breakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileData.strongest_pillar && (
                      <div>
                        <Badge variant="default" className="mb-2 bg-green-600">
                          {t('common.strongest')}
                        </Badge>
                        <p className="text-sm font-semibold">
                          {t(`pillars.${profileData.strongest_pillar}.name`)}
                        </p>
                      </div>
                    )}
                    {profileData.weakest_pillar && (
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {t('common.area_to_develop')}
                        </Badge>
                        <p className="text-sm font-semibold">
                          {t(`pillars.${profileData.weakest_pillar}.name`)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Mentor Section */}
              {profileData.mentor && (
                <MentorSection mentor={profileData.mentor} />
              )}

              {/* Personalized Challenge */}
              {profileData.pillar_scores && user?.id && (
                <PersonalizedChallenge 
                  userId={user.id}
                  ximatarType={profileData.ximatar || undefined}
                  pillarScores={Object.entries(profileData.pillar_scores).map(([pillar, score]) => ({ pillar, score }))}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
