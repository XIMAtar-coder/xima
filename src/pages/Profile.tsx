
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
import { Calendar, User, ArrowRight, LogOut } from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated, logout } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    // Check if user came from assessment flow with data
    if (location.state) {
      setDashboardData(location.state);
    }
  }, [location.state]);

  const handleLogout = () => {
    logout();
    toast({
      title: t('auth.logged_out'),
      description: t('auth.logged_out_description')
    });
    window.location.href = '/';
  };

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

  return (
    <MainLayout>
      {/* Login/Logout Menu */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-4 bg-white shadow-lg rounded-lg px-4 py-2 border">
          <span className="text-sm text-gray-600">
            {t('dashboard.welcome_user', { name: user?.name })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut size={16} className="mr-1" />
            {t('auth.logout')}
          </Button>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto pt-16 space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            {t('dashboard.welcome', { name: user?.name || t('dashboard.user') })}
          </h1>
          <p className="text-gray-600 text-lg">{t('dashboard.overview_description')}</p>
        </div>

        {/* Full Legacy Dashboard with Assessment Results */}
        {dashboardData && (
          <>
            {/* User XIMAtar Section */}
            <Card className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-4">{t('dashboard.your_ximatar')}</h2>
                <div className="flex justify-center mb-6">
                  <XimaAvatar avatar={dashboardData.userAvatar} size="lg" showDetails />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-[#4171d6]">
                    {dashboardData.userAvatar.animal}
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {t('results.animal_description')}
                  </p>
                </div>
              </div>
            </Card>

            {/* XIMA Score with Full Evaluation Bars */}
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-8 text-center">{t('dashboard.complete_evaluation')}</h2>
              <XimaScoreCard pillars={dashboardData.assessmentResults} showTooltip />
            </Card>

            {/* Assessment Summary */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">{t('dashboard.assessment_summary')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(dashboardData.assessmentResults).map(([pillar, score]) => (
                  <div key={pillar} className="text-center p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">
                      {t(`pillars.${pillar}.name`)}
                    </h3>
                    <div className="text-3xl font-bold text-[#4171d6] mb-2">
                      {Math.round(Number(score) * 10)}/100
                    </div>
                    <p className="text-sm text-gray-600">
                      {t(`pillars.${pillar}.description`)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Matched Professional Section */}
            {dashboardData.selectedProfessional && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-center">{t('dashboard.matched_professional')}</h2>
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="lg:w-1/3 flex justify-center">
                    <XimaAvatar avatar={dashboardData.selectedProfessional.avatar} size="lg" showDetails />
                  </div>
                  
                  <div className="lg:w-2/3 space-y-6 text-center lg:text-left">
                    <div>
                      <h3 className="text-3xl font-bold mb-2">{dashboardData.selectedProfessional.name}</h3>
                      <p className="text-xl text-gray-600 mb-2">{dashboardData.selectedProfessional.title}</p>
                      <p className="text-lg text-[#4171d6] font-medium mb-4">{dashboardData.selectedProfessional.specialization}</p>
                      <div className="mb-4">
                        <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                          {dashboardData.selectedProfessional.matchPercentage}% {t('results.match')}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-lg leading-relaxed">{dashboardData.selectedProfessional.bio}</p>
                    
                    <Button 
                      size="lg"
                      className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4 text-lg"
                      onClick={() => toast({
                        title: t('dashboard.booking.booking_system'),
                        description: t('dashboard.booking.coming_soon')
                      })}
                    >
                      <Calendar size={24} className="mr-3" />
                      {t('dashboard.book_appointment')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Personal Development Insights */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">{t('dashboard.development_insights')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-green-600">{t('dashboard.strengths')}</h3>
                  {dashboardData.userAvatar.features.map((feature, index) => (
                    <div key={index} className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{feature.name}</span>
                        <Badge className="bg-green-100 text-green-800">
                          {feature.strength}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-blue-600">{t('dashboard.growth_areas')}</h3>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-600">
                      {t('dashboard.growth_description')}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
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
