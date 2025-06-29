
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import XimaScoreCard from '../components/XimaScoreCard';
import XimaAvatar from '../components/XimaAvatar';
import { Calendar, User, ArrowRight, BarChart3, Users, Target, TrendingUp } from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [showFullDashboard, setShowFullDashboard] = useState(false);

  useEffect(() => {
    // Check if user came from assessment flow with data
    if (location.state) {
      setDashboardData(location.state);
      setShowFullDashboard(true);
    }
  }, [location.state]);

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto pt-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.access_required')}</CardTitle>
              <CardDescription>{t('dashboard.please_login')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Full Legacy Dashboard View
  if (showFullDashboard && dashboardData) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-8 space-y-8">
          {/* Dashboard Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">{t('dashboard.legacy_title')}</h1>
            <p className="text-gray-600">{t('dashboard.legacy_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - XIMAtar */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-center">{t('dashboard.your_ximatar')}</h2>
                <div className="flex justify-center">
                  <XimaAvatar avatar={dashboardData.userAvatar} size="lg" />
                </div>
              </Card>

              {/* Matched Professional */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-center">{t('dashboard.matched_professional_short')}</h2>
                <div className="text-center space-y-4">
                  <XimaAvatar avatar={dashboardData.selectedProfessional.avatar} size="md" />
                  <div>
                    <h3 className="font-bold text-lg">{dashboardData.selectedProfessional.name}</h3>
                    <p className="text-sm text-[#4171d6]">{dashboardData.selectedProfessional.title}</p>
                    <p className="text-xs text-gray-600 mb-3">{dashboardData.selectedProfessional.specialization}</p>
                    <Button 
                      size="sm"
                      className="bg-[#4171d6] hover:bg-[#2950a3] w-full"
                      onClick={() => toast({
                        title: t('dashboard.booking.booking_system'),
                        description: t('dashboard.booking.coming_soon')
                      })}
                    >
                      {t('dashboard.book_appointment_short')}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle Column - XIMA Score */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-center">{t('dashboard.xima_score')}</h2>
                <XimaScoreCard pillars={dashboardData.assessmentResults} compact />
              </Card>
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-6">
              {/* Welcome Message */}
              <Card className="p-6 bg-blue-50">
                <h2 className="text-xl font-bold mb-3">{t('dashboard.welcome_back', { name: user?.name })}</h2>
                <p className="text-sm text-gray-600 mb-4">{t('dashboard.profile_active_description')}</p>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target size={16} className="text-[#4171d6]" />
                      <span className="text-2xl font-bold text-[#4171d6]">76%</span>
                    </div>
                    <p className="text-xs text-gray-600">{t('dashboard.match_quality')}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BarChart3 size={16} className="text-green-600" />
                      <span className="text-2xl font-bold text-green-600">1/3</span>
                    </div>
                    <p className="text-xs text-gray-600">{t('dashboard.assessments_completed')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users size={16} className="text-purple-600" />
                      <span className="text-lg font-bold text-purple-600">{t('dashboard.active')}</span>
                    </div>
                    <p className="text-xs text-gray-600">{t('dashboard.mentor_status')}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp size={16} className="text-orange-600" />
                      <span className="text-lg font-bold text-orange-600">{t('dashboard.next_step')}</span>
                    </div>
                    <p className="text-xs text-gray-600">{t('dashboard.complete_intelligence_assessment')}</p>
                  </div>
                </div>
              </Card>

              {/* Development Plan */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">{t('dashboard.development_plan')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm">{t('dashboard.enhance_analysis_skills')}</span>
                    <Badge variant="outline">{t('dashboard.priority')}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm">{t('dashboard.communication_workshop')}</span>
                    <Badge className="bg-blue-100 text-blue-800">{t('dashboard.recommended')}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm">{t('dashboard.leadership_fundamentals')}</span>
                    <Badge variant="outline">{t('dashboard.optional')}</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#4171d6] hover:bg-[#2950a3]">
                  {t('dashboard.view_full_development_plan')}
                </Button>
              </Card>

              {/* Your Mentor */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">{t('dashboard.your_mentor')}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#4171d6] flex items-center justify-center">
                    <span className="text-white font-bold">CS</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{t('dashboard.creativity_specialist')}</h4>
                    <p className="text-xs text-gray-600">{t('dashboard.specialist_in_creativity')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{t('dashboard.upcoming_session')}</p>
                <p className="text-xs text-gray-500 mb-4">{t('dashboard.no_session_scheduled')}</p>
                <Button variant="outline" className="w-full">
                  {t('dashboard.message_your_mentor')}
                </Button>
              </Card>
            </div>
          </div>

          {/* Bottom Section - CV Comparison */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">{t('dashboard.cv_vs_evaluation_comparison')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-center mb-4">
                  <Badge variant="outline" className="mb-2">{t('dashboard.baseline_cv')}</Badge>
                  <p className="text-sm text-gray-600">{t('dashboard.complete_evaluation')} | 28/06/2025</p>
                </div>
                <XimaScoreCard 
                  pillars={{
                    computational: 6,
                    communication: 5,
                    knowledge: 8,
                    creativity: 4,
                    drive: 7
                  }} 
                  compact 
                />
              </div>
              <div>
                <div className="text-center mb-4">
                  <Badge className="mb-2 bg-[#4171d6]">{t('dashboard.complete_evaluation')}</Badge>
                  <p className="text-sm text-gray-600">{t('dashboard.view_complete_comparison')}</p>
                </div>
                <XimaScoreCard pillars={dashboardData.assessmentResults} compact />
              </div>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Default Profile View with Dashboard Button
  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto pt-8 space-y-8">
        {/* Welcome Section with Dashboard Button */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            {t('dashboard.welcome', { name: user?.name || t('dashboard.user') })}
          </h1>
          <p className="text-gray-600 text-lg mb-6">{t('dashboard.overview_description')}</p>
          
          {/* Dashboard Button */}
          <Button 
            size="lg"
            className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
            onClick={() => setShowFullDashboard(true)}
          >
            <BarChart3 size={20} className="mr-2" />
            {t('dashboard.go_to_dashboard')}
          </Button>
        </div>

        {/* Assessment Results Section */}
        {dashboardData && (
          <>
            {/* User XIMAtar */}
            <Card className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-4">{t('dashboard.your_ximatar')}</h2>
                <div className="flex justify-center mb-4">
                  <XimaAvatar avatar={dashboardData.userAvatar} size="lg" showDetails />
                </div>
                <p className="text-gray-600">
                  {t('results.your_animal', { animal: dashboardData.userAvatar.animal })}
                </p>
              </div>
            </Card>

            {/* XIMA Score */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">{t('dashboard.xima_score')}</h2>
              <XimaScoreCard pillars={dashboardData.assessmentResults} showTooltip />
            </Card>

            {/* Matched Professional */}
            {dashboardData.selectedProfessional && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-center">{t('dashboard.matched_professional')}</h2>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="md:w-1/3 flex justify-center">
                    <XimaAvatar avatar={dashboardData.selectedProfessional.avatar} size="lg" showDetails />
                  </div>
                  
                  <div className="md:w-2/3 space-y-4 text-center md:text-left">
                    <div>
                      <h3 className="text-2xl font-bold">{dashboardData.selectedProfessional.name}</h3>
                      <p className="text-lg text-gray-600">{dashboardData.selectedProfessional.title}</p>
                      <p className="text-sm text-[#4171d6] font-medium">{dashboardData.selectedProfessional.specialization}</p>
                      <div className="mt-2">
                        <Badge className="bg-green-100 text-green-800">
                          {dashboardData.selectedProfessional.matchPercentage}% {t('results.match')}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600">{dashboardData.selectedProfessional.bio}</p>
                    
                    <Button 
                      size="lg"
                      className="bg-[#4171d6] hover:bg-[#2950a3]"
                      onClick={() => toast({
                        title: t('dashboard.booking.booking_system'),
                        description: t('dashboard.booking.coming_soon')
                      })}
                    >
                      <Calendar size={20} className="mr-2" />
                      {t('dashboard.book_appointment')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Default Dashboard Content for users without assessment */}
        {!dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  {t('dashboard.get_started')}
                </CardTitle>
                <CardDescription>{t('dashboard.assessment_prompt')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-[#4171d6] hover:bg-[#2950a3]"
                  onClick={() => window.location.href = '/ximatar-journey'}
                >
                  {t('dashboard.take_assessment')}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.profile_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>{t('register.full_name')}:</strong> {user?.name}</p>
                <p><strong>{t('register.email')}:</strong> {user?.email}</p>
                <p><strong>{t('dashboard.member_since')}:</strong> {new Date().toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
