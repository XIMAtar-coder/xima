
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
import { Calendar, User, ArrowRight } from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
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
      <div className="container max-w-6xl mx-auto pt-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            {t('dashboard.welcome', { name: user?.name || t('dashboard.user') })}
          </h1>
          <p className="text-gray-600 text-lg">{t('dashboard.overview_description')}</p>
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
