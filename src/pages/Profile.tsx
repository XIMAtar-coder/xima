import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, MessageSquare, TrendingUp, User, Target, ChevronRight, ArrowRight, Clock, BookOpen } from 'lucide-react';
import { XimatarDisplay } from '@/components/XimatarDisplay';
import XimaScoreCard from '@/components/XimaScoreCard';
import { getXIMAtarByAssessment } from '@/utils/ximatarUtils';
import { XIMAtar } from '@/types/ximatar';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showFullDashboard, setShowFullDashboard] = useState(false);

  // Mock data for dashboard - using actual user data when available
  const mockDashboardData = {
    user: {
      name: user?.name || 'User',
      currentXimatar: user?.pillars ? getXIMAtarByAssessment(user.pillars as any) : null,
      matchedProfessional: {
        name: 'Dr. Sarah Chen',
        title: 'Senior Business Strategist',
        specialty: 'Communication & Leadership',
        bio: 'Expert in organizational communication and team dynamics with 15+ years of experience in consulting.',
        ximatar: user?.pillars ? getXIMAtarByAssessment(user.pillars as any) : null
      }
    },
    scores: {
      matchQuality: 94,
      assessmentCompletion: user?.pillars ? 100 : 0
    },
    ximaScores: user?.pillars || {
      computational: 0,
      communication: 0,
      knowledge: 0,
      creativity: 0,
      drive: 0
    },
    mentor: {
      name: 'Dr. Sarah Chen',
      status: 'Connected',
      lastMessage: '2 days ago'
    },
    nextSteps: [
      { action: 'Complete personality assessment', completed: !!user?.pillars },
      { action: 'Book first mentoring session', completed: false },
      { action: 'Review development plan', completed: false }
    ],
    baselineScores: {
      computational: 60,
      communication: 80,
      knowledge: 60,
      creativity: 40,
      drive: 70
    }
  };

  useEffect(() => {
    if (location.state) {
      setDashboardData({ ...mockDashboardData, ...location.state });
    } else {
      setDashboardData(mockDashboardData);
    }
  }, [location.state, user]);

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

  if (!dashboardData) {
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto pt-8">
          <div className="text-center">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  // Welcome section (default view)
  if (!showFullDashboard) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto pt-8 space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">
              {t('profile.welcome')}, {dashboardData.user.name}!
            </h1>
            
            <div className="flex flex-col items-center space-y-6">
              {dashboardData.user.currentXimatar ? (
                <XimatarDisplay 
                  ximatar={dashboardData.user.currentXimatar} 
                  size="lg" 
                  showDescription={false} 
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <User size={48} className="text-muted-foreground" />
                </div>
              )}
              
              <Button 
                size="lg"
                onClick={() => setShowFullDashboard(true)}
              >
                {t('profile.view_dashboard')}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>

            <p className="text-muted-foreground text-lg mt-6">
              {t('profile.welcome_description')}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <Target className="text-primary mr-2" size={20} />
                <span className="text-2xl font-bold text-primary">{dashboardData.scores.matchQuality}%</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.match_quality')}</p>
            </Card>
            
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="text-primary mr-2" size={20} />
                <span className="text-2xl font-bold text-primary">{dashboardData.scores.assessmentCompletion}%</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.assessment_completion')}</p>
            </Card>
            
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="text-primary mr-2" size={20} />
                <span className="text-2xl font-bold text-primary">{dashboardData.mentor.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.mentor_status')}</p>
            </Card>
            
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <Clock className="text-primary mr-2" size={20} />
                <span className="text-sm font-bold text-primary">{t('profile.next_step')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{dashboardData.nextSteps.find(step => !step.completed)?.action || t('profile.all_complete')}</p>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Full Dashboard view
  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('profile.dashboard_title')}</h1>
            <p className="text-muted-foreground">{t('profile.dashboard_description')}</p>
          </div>
          <Button variant="outline" onClick={() => setShowFullDashboard(false)}>
            ← {t('common.back')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Il Tuo XIMATAR */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.your_ximatar')}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {dashboardData.user.currentXimatar ? (
                  <XimatarDisplay 
                    ximatar={dashboardData.user.currentXimatar} 
                    size="lg" 
                    showDescription={true} 
                  />
                ) : (
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-primary/20 bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">{t('profile.no_assessment')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Il Tuo Professionista Abbinato */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.matched_professional')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  {dashboardData.user.matchedProfessional.ximatar ? (
                    <div className="w-20 h-20 flex-shrink-0">
                      <XimatarDisplay 
                        ximatar={dashboardData.user.matchedProfessional.ximatar} 
                        size="sm" 
                        showDescription={false} 
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{dashboardData.user.matchedProfessional.name}</h3>
                    <p className="text-sm text-muted-foreground">{dashboardData.user.matchedProfessional.title}</p>
                    <p className="text-sm text-primary">{dashboardData.user.matchedProfessional.specialty}</p>
                    <p className="text-xs text-muted-foreground mt-2">{dashboardData.user.matchedProfessional.bio}</p>
                    <Button size="sm" className="mt-3">
                      {t('profile.book_appointment')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prenota una Sessione */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2" size={20} />
                  {t('profile.book_session')}
                </CardTitle>
                <CardDescription>{t('profile.book_session_description', { name: dashboardData.user.matchedProfessional.name })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('profile.select_date')}</h4>
                    <div className="bg-muted p-3 rounded text-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <div className="text-sm text-muted-foreground">July 2025</div>
                      <div className="mt-2">
                        <div className="inline-block bg-primary text-primary-foreground px-2 py-1 rounded text-sm">15</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t('profile.select_time')}</h4>
                    <div className="space-y-1 text-sm">
                      {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time) => (
                        <div key={time} className="flex justify-between py-1 px-2 rounded hover:bg-muted cursor-pointer transition-colors">
                          <span>{time}</span>
                          <span className="text-primary">✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  {t('profile.confirm_booking')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Punteggio XIMA */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.xima_score')}</CardTitle>
              </CardHeader>
              <CardContent>
                <XimaScoreCard pillars={dashboardData.ximaScores} />
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('profile.match_quality')}</span>
                    <span className="text-lg font-bold text-primary">{dashboardData.scores.matchQuality}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('profile.assessment_completion')}</span>
                    <span className="text-lg font-bold text-primary">{dashboardData.scores.assessmentCompletion}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Development Plan & Mentor */}
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.development_plan')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('profile.enhance_analysis')}</span>
                    <Badge variant="outline" className="text-xs">{t('profile.priority')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('profile.communication_workshop')}</span>
                    <Badge variant="secondary" className="text-xs">{t('profile.recommended')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('profile.leadership_fundamentals')}</span>
                    <Badge variant="outline" className="text-xs">{t('profile.optional')}</Badge>
                  </div>
                  <Button size="sm" className="w-full mt-3">
                    {t('profile.view_full_plan')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.your_mentor')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">SC</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{dashboardData.mentor.name}</div>
                      <div className="text-xs text-muted-foreground">{t('profile.mentor_specialty')}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    <div>{t('profile.last_message')}: {dashboardData.mentor.lastMessage}</div>
                    <div>{t('profile.status')}: {dashboardData.mentor.status}</div>
                  </div>
                  <Button size="sm" className="w-full">
                    {t('profile.message_mentor')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom Section - Confronto CV vs Valutazione */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.cv_vs_assessment')}</CardTitle>
            <CardDescription>
              {t('profile.assessment_completed')} | {new Date().toLocaleDateString()} | 
              <Button variant="link" className="p-0 h-auto ml-1">
                {t('profile.view_full_comparison')}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium mb-4">{t('profile.baseline_cv')}</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.baselineScores).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm">{t(`profile.${key}`)}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-muted rounded">
                          <div 
                            className="h-full bg-primary rounded" 
                            style={{ width: `${(value as number)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{Math.round((value as number) / 10)}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4">{t('profile.complete_assessment')}</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.ximaScores).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm">{t(`profile.${key}`)}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-muted rounded">
                          <div 
                            className="h-full bg-primary rounded" 
                            style={{ width: `${(value as number)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{Math.round((value as number) / 10)}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile;