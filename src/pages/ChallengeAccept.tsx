import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Target, Building2, CheckCircle2, XCircle, Clock, ArrowRight, Loader2, AlertTriangle, CalendarClock } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { getChallengeTimeInfo } from '@/utils/challengeTimeUtils';

interface InvitationDetails {
  id: string;
  status: string;
  created_at: string;
  company_name: string;
  role_title: string | null;
  task_description: string | null;
  challenge_title: string | null;
  challenge_start_at: string | null;
  challenge_end_at: string | null;
  challenge_status: string | null;
}

const ChallengeAccept = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      // Fetch invitation by token with challenge info
      const { data: invData, error: invError } = await supabase
        .from('challenge_invitations')
        .select('id, status, created_at, business_id, hiring_goal_id, challenge_id')
        .eq('invite_token', token)
        .single();

      if (invError || !invData) {
        setError('Invitation not found or expired');
        setLoading(false);
        return;
      }

      // Fetch company, role, and challenge details
      const [businessResult, goalResult, challengeResult] = await Promise.all([
        supabase
          .from('business_profiles')
          .select('company_name')
          .eq('user_id', invData.business_id)
          .single(),
        supabase
          .from('hiring_goal_drafts')
          .select('role_title, task_description')
          .eq('id', invData.hiring_goal_id)
          .single(),
        invData.challenge_id 
          ? supabase
              .from('business_challenges')
              .select('title, start_at, end_at, status')
              .eq('id', invData.challenge_id)
              .single()
          : Promise.resolve({ data: null })
      ]);

      setInvitation({
        id: invData.id,
        status: invData.status,
        created_at: invData.created_at,
        company_name: businessResult.data?.company_name || 'Company',
        role_title: goalResult.data?.role_title || null,
        task_description: goalResult.data?.task_description || null,
        challenge_title: challengeResult.data?.title || null,
        challenge_start_at: challengeResult.data?.start_at || null,
        challenge_end_at: challengeResult.data?.end_at || null,
        challenge_status: challengeResult.data?.status || null
      });
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation || !isAuthenticated) {
      if (!isAuthenticated) {
        // Redirect to login with return URL
        navigate(`/login?redirect=/challenge/accept?token=${token}`);
        return;
      }
      return;
    }

    setProcessing(true);
    try {
      // Get user's profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('challenge_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast({
        title: t('challenge_invitation.accepted_title'),
        description: t('challenge_invitation.accepted_desc')
      });

      // Redirect to challenge page (placeholder for now)
      navigate('/profile', { 
        state: { 
          showChallengeSuccess: true,
          companyName: invitation.company_name 
        }
      });
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      // Get user's profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      const { error: updateError } = await supabase
        .from('challenge_invitations')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast({
        title: t('challenge_invitation.declined_title'),
        description: t('challenge_invitation.declined_desc')
      });

      navigate('/profile');
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card className="border-destructive/50">
            <CardContent className="p-8 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t('challenge_invitation.error_title')}
              </h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => navigate('/')}>
                {t('challenge_invitation.go_home')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!invitation) return null;

  // Already responded
  if (invitation.status !== 'invited') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card>
            <CardContent className="p-8 text-center">
              {invitation.status === 'accepted' ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {t('challenge_invitation.already_accepted')}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('challenge_invitation.already_accepted_desc', { company: invitation.company_name })}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {t('challenge_invitation.already_declined')}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('challenge_invitation.already_declined_desc')}
                  </p>
                </>
              )}
              <Button onClick={() => navigate('/profile')}>
                {t('challenge_invitation.go_profile')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Compute time status for the challenge
  const timeInfo = invitation.challenge_start_at && invitation.challenge_end_at
    ? getChallengeTimeInfo(invitation.challenge_start_at, invitation.challenge_end_at, invitation.challenge_status || 'active')
    : null;

  const isExpired = timeInfo?.timeStatus === 'expired';
  const isUpcoming = timeInfo?.timeStatus === 'upcoming';

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto mt-8 px-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {t('challenge_invitation.title')}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {t('challenge_invitation.subtitle')}
                </CardDescription>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Expired banner */}
            {isExpired && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">{t('challenge_invitation.expired_title')}</p>
                    <p className="text-sm text-muted-foreground">{t('challenge_invitation.expired_desc')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Challenge title if available */}
            {invitation.challenge_title && (
              <div className="text-center">
                <Badge variant="secondary" className="text-base px-4 py-1">
                  {invitation.challenge_title}
                </Badge>
              </div>
            )}

            {/* Company info */}
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
              <Building2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-lg">
                  {invitation.company_name}
                </h3>
                {invitation.role_title && (
                  <Badge variant="outline" className="mt-1">
                    {invitation.role_title}
                  </Badge>
                )}
              </div>
            </div>

            {/* Task description */}
            {invitation.task_description && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t('challenge_invitation.what_they_need')}
                </h4>
                <p className="text-foreground whitespace-pre-line">
                  {invitation.task_description}
                </p>
              </div>
            )}

            {/* Challenge deadline */}
            {timeInfo && invitation.challenge_end_at && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isExpired ? 'bg-destructive/10' : timeInfo.isExpiringSoon ? 'bg-amber-500/10' : 'bg-muted/50'}`}>
                <CalendarClock className={`h-5 w-5 ${isExpired ? 'text-destructive' : timeInfo.isExpiringSoon ? 'text-amber-500' : 'text-primary'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {isExpired 
                      ? t('challenge_invitation.deadline_passed')
                      : t('challenge_invitation.deadline', { date: new Date(invitation.challenge_end_at).toLocaleDateString() })}
                  </p>
                  {timeInfo.remainingText && !isExpired && (
                    <p className="text-xs text-muted-foreground">{timeInfo.remainingText}</p>
                  )}
                </div>
                {timeInfo.isExpiringSoon && !isExpired && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    {t('challenge_invitation.expiring_soon')}
                  </Badge>
                )}
              </div>
            )}

            {/* Timing */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={16} />
              <span>
                {t('challenge_invitation.invited_on', {
                  date: new Date(invitation.created_at).toLocaleDateString()
                })}
              </span>
            </div>

            {/* Login prompt for unauthenticated users */}
            {!isAuthenticated && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('challenge_invitation.login_required')}
                  </p>
                  <Button onClick={() => navigate(`/login?redirect=/challenge/accept?token=${token}`)}>
                    {t('common.login')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Action buttons */}
            {isAuthenticated && !isExpired && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleAccept}
                  disabled={processing}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      {t('challenge_invitation.accept')}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={processing}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  {t('challenge_invitation.decline')}
                </Button>
              </div>
            )}

            {/* Expired - no actions */}
            {isAuthenticated && isExpired && (
              <div className="pt-4 border-t border-border text-center">
                <Button onClick={() => navigate('/profile')} variant="outline">
                  {t('challenge_invitation.go_profile')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ChallengeAccept;
