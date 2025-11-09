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

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const assessmentData = useSupabaseAssessmentData();
  const { matches, loading: jobsLoading } = useJobMatches(user);
  
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Fetch matched professional from bookings
  useEffect(() => {
    const fetchProfessional = async () => {
      if (!user?.id) return;
      
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          *,
          professionals (*)
        `)
        .eq('seeker_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (booking) {
        setBookingData(booking);
        if (booking.professionals) {
          setProfessionalData(booking.professionals);
        }
      }
    };
    
    fetchProfessional();
  }, [user]);

  const handleBookingConfirm = async () => {
    if (!bookingData || !selectedDate || !selectedTime) return;

    const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour

    await supabase
      .from('bookings')
      .update({
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        status: 'confirmed'
      })
      .eq('id', bookingData.id);
    
    // Refresh booking data
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingData.id)
      .single();
    
    if (updatedBooking) {
      setBookingData(updatedBooking);
    }
  };

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
        {/* Header */}
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold flex items-center gap-3 font-heading">
              <Sparkles className="text-primary" />
              {t('profile.page_title', { name: user?.name || t('profile.user') })}
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
            
            {/* Job Matches */}
            {!jobsLoading && matches.length > 0 && (
              <Card className="fade-in">
                <CardHeader>
                  <CardTitle>{t('profile.job_matches')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobMatchesBlock />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pillar Scores / CV Comparison */}
            <CVComparisonCard 
              cvPillars={assessmentData.cvPillars}
              assessmentPillars={assessmentData.pillars}
            />
            
            {/* Matched Professional & Booking */}
            <Card className="fade-in">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('profile.matched_professional')}</span>
                  {bookingData && (
                    <Badge variant={bookingData.status === 'confirmed' ? 'default' : 'secondary'}>
                      {t(`profile.booking_${bookingData.status}`)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {professionalData ? (
                  <>
                    {/* Professional Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-10 h-10 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{professionalData.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{professionalData.title}</p>
                        {professionalData.specialties && professionalData.specialties.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {professionalData.specialties.slice(0, 3).map((specialty: string) => (
                              <Badge key={specialty} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {professionalData.locale_bio?.it && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                            {professionalData.locale_bio.it}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Booking Interface */}
                    {bookingData && bookingData.status !== 'confirmed' && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-primary" size={20} />
                          <h4 className="font-medium">{t('profile.book_session')}</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              {t('profile.select_date')}
                            </label>
                            <input
                              type="date"
                              className="w-full p-2 border rounded bg-background"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              {t('profile.select_time')}
                            </label>
                            <select
                              className="w-full p-2 border rounded bg-background"
                              value={selectedTime}
                              onChange={(e) => setSelectedTime(e.target.value)}
                            >
                              <option value="">Select time</option>
                              <option value="09:00">09:00</option>
                              <option value="10:00">10:00</option>
                              <option value="11:00">11:00</option>
                              <option value="14:00">14:00</option>
                              <option value="15:00">15:00</option>
                              <option value="16:00">16:00</option>
                            </select>
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={handleBookingConfirm}
                          disabled={!selectedDate || !selectedTime}
                        >
                          {t('profile.confirm_booking')}
                        </Button>
                      </div>
                    )}

                    {bookingData && bookingData.status === 'confirmed' && (
                      <div className="border-t pt-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            {t('profile.booking_confirmed_message')}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {new Date(bookingData.starts_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">{t('profile.no_professional_matched')}</p>
                    <Button onClick={() => navigate('/risultati')}>
                      <ArrowRight className="mr-2" />
                      {t('profile.complete_assessment')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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

        {/* Job Matches - Full Width */}
        {!jobsLoading && matches.length > 0 && (
          <Card className="fade-in">
            <CardHeader>
              <CardTitle>{t('profile.recommended_opportunities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <JobMatchesBlock />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
