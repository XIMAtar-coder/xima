import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Trophy, MessageSquare, TrendingUp, User, Target, ChevronRight, ArrowRight, Clock, BookOpen, CheckCircle, AlertCircle, Upload, Info } from 'lucide-react';
import { XimatarDisplay } from '@/components/XimatarDisplay';
import XimaScoreCard from '@/components/XimaScoreCard';
import { getXIMAtarByAssessment } from '@/utils/ximatarUtils';
import { XIMAtar } from '@/types/ximatar';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showFullDashboard, setShowFullDashboard] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('2025-07-15');
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'pending' | 'confirmed'>('idle');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get complementary XIMAtar for mentor (different from user's)
  const getComplementaryXimatar = (userXimatar: XIMAtar | null) => {
    if (!userXimatar || !user?.pillars) return null;
    
    // Find user's weakest pillar and create mentor with strength in that area
    const pillars = user.pillars;
    const weakestPillar = Object.entries(pillars).reduce((min, [key, value]) => 
      (value as number) < (pillars[min[0] as keyof typeof pillars] as number) ? [key, value] : min
    )[0] as keyof typeof pillars;
    
    // Create complementary scores
    const complementaryPillars = {
      computational: 5,
      communication: 5,
      knowledge: 5,
      creativity: 5,
      drive: 5
    };
    complementaryPillars[weakestPillar] = 9; // Strong in user's weak area
    
    return getXIMAtarByAssessment(complementaryPillars);
  };

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
      name: user?.mentor ? 'Dr. Alex Rivera' : null,
      title: 'Strategic Development Specialist',
      status: user?.mentor ? 'Connected' : 'Not Assigned',
      lastMessage: '2 days ago',
      ximatar: user?.pillars ? getComplementaryXimatar(getXIMAtarByAssessment(user.pillars as any)) : null
    },
    nextSteps: [
      { action: 'Complete personality assessment', completed: !!user?.pillars },
      { action: 'Book first mentoring session', completed: false },
      { action: 'Review development plan', completed: false }
    ],
    baselineScores: {
      computational: 6,
      communication: 8,
      knowledge: 6,
      creativity: 4,
      drive: 7
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSkillTooltip = (skill: string) => {
    return t(`profile.${skill.toLowerCase()}_tooltip`);
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
              {t('profile.dashboard_description')}
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
            
            <Card className="text-center p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="text-primary mr-2" size={20} />
                <span className="text-2xl font-bold text-primary">{t('profile.connected')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.mentor_status')}</p>
              {dashboardData.mentor.status === 'Connected' && (
                <Badge variant="secondary" className="mt-1">
                  <CheckCircle size={12} className="mr-1" />
                  Active
                </Badge>
              )}
            </Card>
            
            <Card className="text-center p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-center mb-2">
                <Clock className="text-primary mr-2" size={20} />
                <span className="text-sm font-bold text-primary">{t('profile.next_step')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.nextSteps.find((step: any) => !step.completed)?.action || t('profile.all_complete')}
              </p>
              {dashboardData.nextSteps.some((step: any) => !step.completed) && (
                <Badge variant="outline" className="mt-1">
                  <AlertCircle size={12} className="mr-1" />
                  Pending
                </Badge>
              )}
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
              <CardContent className="text-center space-y-4">
                <div className="relative">
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
                  
                  {/* Profile Image Overlay */}
                  {profileImage && (
                    <div className="absolute top-0 right-0 w-16 h-16 rounded-full border-2 border-white overflow-hidden">
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                
                {/* Upload Profile Photo */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} className="mr-2" />
                    {t('profile.upload_profile_photo')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Combined Professional & Booking Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('profile.matched_professional')}</span>
                  <Badge variant={bookingStatus === 'confirmed' ? 'default' : 'secondary'}>
                    {bookingStatus === 'confirmed' ? t('profile.confirmed') : t('profile.pending')}
                  </Badge>
                </CardTitle>
                <CardDescription>Your matched professional and booking interface</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Professional Info */}
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
                  </div>
                </div>

                {/* Booking Interface */}
                <div className="border-t pt-4">
                  <div className="flex items-center mb-4">
                    <Calendar className="mr-2" size={20} />
                    <h4 className="font-medium">{t('profile.book_session')}</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">{t('profile.select_date')}</h5>
                      <div className="space-y-2">
                        {['2025-07-15', '2025-07-16', '2025-07-17'].map((date) => (
                          <div
                            key={date}
                            className={`p-3 rounded border cursor-pointer transition-colors ${
                              selectedDate === date 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedDate(date)}
                          >
                            <div className="text-sm font-medium">
                              {new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">{t('profile.select_time')}</h5>
                      <div className="space-y-1">
                        {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time) => (
                          <div
                            key={time}
                            className={`flex justify-between py-2 px-3 rounded border cursor-pointer transition-colors ${
                              selectedTime === time 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedTime(time)}
                          >
                            <span>{time}</span>
                            <span className="text-primary">
                              {selectedTime === time ? '✓' : '○'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => {
                      setBookingStatus('confirmed');
                      // Here you would normally make an API call
                    }}
                    disabled={bookingStatus === 'confirmed'}
                  >
                    {bookingStatus === 'confirmed' ? (
                      <>
                        <CheckCircle className="mr-2" size={16} />
                        Session Confirmed for {selectedDate} at {selectedTime}
                      </>
                    ) : (
                      t('profile.confirm_booking')
                    )}
                  </Button>
                </div>
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
                <TooltipProvider>
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-primary">
                        {(() => {
                          const scores = Object.values(dashboardData.ximaScores) as number[];
                          const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                          return Math.round(average * 10) / 10;
                        })()}/10
                      </div>
                      <div className="text-sm text-muted-foreground">{t('profile.xima_score')}</div>
                    </div>
                    
                    {Object.entries(dashboardData.ximaScores).map(([skill, score]) => (
                      <div key={skill} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <span className="text-sm font-medium">{t(`profile.${skill}`)}</span>
                                <Info size={14} className="text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{getSkillTooltip(skill)}</p>
                            </TooltipContent>
                          </Tooltip>
                          <span className="text-sm font-bold">{Number(score)}/10</span>
                        </div>
                        <Progress value={((score as number) / 10) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
                
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
                  <Button 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => navigate('/development-plan')}
                  >
                    {t('profile.view_full_plan')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.your_mentor')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.mentor.name ? (
                    <>
                      <div className="flex items-center space-x-3 mb-3">
                        {dashboardData.mentor.ximatar ? (
                          <div className="w-12 h-12">
                            <XimatarDisplay 
                              ximatar={dashboardData.mentor.ximatar} 
                              size="sm" 
                              showDescription={false} 
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">AR</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{dashboardData.mentor.name}</div>
                          <div className="text-xs text-muted-foreground">{dashboardData.mentor.title}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Status: {dashboardData.mentor.status} • Last message: {dashboardData.mentor.lastMessage}
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate('/xima-chat')}
                      >
                        {t('profile.message_mentor')}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium mb-2">{t('profile.discover_mentor')}</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Connect with a mentor who complements your skills
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/xima-chat')}
                      >
                        {t('profile.discover_mentor')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CV vs Assessment Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.cv_assessment_comparison')}</CardTitle>
            <CardDescription>
              Assessment completed | 12/07/2025 | 
              <Button variant="link" className="p-0 h-auto text-primary ml-1">
                {t('profile.view_full_comparison')}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3 text-blue-600">{t('profile.baseline_cv')}</h4>
                <div className="space-y-3">
                  {Object.entries(dashboardData.baselineScores).map(([skill, score]) => (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{t(`profile.${skill}`)}</span>
                        <span>{Number(score)}/10</span>
                      </div>
                      <Progress value={((score as number) / 10) * 100} className="h-2 bg-blue-100">
                        <div className="bg-blue-500 h-full transition-all" style={{width: `${((score as number) / 10) * 100}%`}} />
                      </Progress>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3 text-green-600">{t('profile.complete_assessment')}</h4>
                <div className="space-y-3">
                  {Object.entries(dashboardData.ximaScores).map(([skill, score]) => {
                    const baseScore = dashboardData.baselineScores[skill] as number;
                    const delta = (score as number) - baseScore;
                    return (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{t(`profile.${skill}`)}</span>
                          <div className="flex items-center gap-1">
                            <span>{Number(score)}/10</span>
                            {delta !== 0 && (
                              <span className={`text-xs ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({delta > 0 ? '+' : ''}{delta})
                              </span>
                            )}
                          </div>
                        </div>
                        <Progress value={((score as number) / 10) * 100} className="h-2 bg-green-100">
                          <div className="bg-green-500 h-full transition-all" style={{width: `${((score as number) / 10) * 100}%`}} />
                        </Progress>
                      </div>
                    );
                  })}
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