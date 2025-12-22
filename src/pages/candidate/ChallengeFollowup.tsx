import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, CheckCircle, ArrowLeft, Building2 } from 'lucide-react';

interface FollowupData {
  id: string;
  invitation_id: string;
  candidate_profile_id: string;
  business_id: string;
  question: string;
  answer: string | null;
  asked_at: string;
  answered_at: string | null;
}

interface InvitationInfo {
  id: string;
  hiring_goal: {
    role_title: string | null;
  } | null;
  business_profile: {
    company_name: string;
  } | null;
  challenge: {
    title: string;
  } | null;
}

export default function ChallengeFollowup() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [followup, setFollowup] = useState<FollowupData | null>(null);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (!invitationId) return;

    async function fetchFollowup() {
      setLoading(true);
      
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast({ title: t('common.error'), variant: 'destructive' });
        navigate('/profile');
        return;
      }

      // Fetch followup
      const { data: followupData, error } = await supabase
        .from('challenge_followups')
        .select('*')
        .eq('invitation_id', invitationId)
        .eq('candidate_profile_id', profile.id)
        .maybeSingle();

      if (error || !followupData) {
        toast({ title: t('followup.not_found'), variant: 'destructive' });
        navigate('/profile');
        return;
      }

      setFollowup(followupData as FollowupData);
      if (followupData.answer) {
        setAnswer(followupData.answer);
      }

      // Fetch invitation info for context
      const { data: invData } = await supabase
        .from('challenge_invitations')
        .select(`
          id,
          hiring_goal_id,
          challenge_id
        `)
        .eq('id', invitationId)
        .single();

      if (invData) {
        // Fetch related data
        const [goalRes, challengeRes, businessRes] = await Promise.all([
          invData.hiring_goal_id 
            ? supabase.from('hiring_goal_drafts').select('role_title').eq('id', invData.hiring_goal_id).single()
            : null,
          invData.challenge_id
            ? supabase.from('business_challenges').select('title, business_id').eq('id', invData.challenge_id).single()
            : null,
          supabase.from('business_profiles').select('company_name').eq('user_id', followupData.business_id).single()
        ]);

        setInvitation({
          id: invData.id,
          hiring_goal: goalRes?.data || null,
          challenge: challengeRes?.data || null,
          business_profile: businessRes?.data || null
        });
      }

      setLoading(false);
    }

    fetchFollowup();
  }, [invitationId, navigate, t]);

  const handleSubmit = async () => {
    if (!followup || !answer.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('challenge_followups')
        .update({
          answer: answer.trim(),
          answered_at: new Date().toISOString()
        })
        .eq('id', followup.id);

      if (error) throw error;

      // Optionally notify business
      await supabase.from('notifications').insert({
        recipient_id: followup.business_id,
        type: 'challenge',
        title: t('followup.answer_received_title'),
        message: t('followup.answer_received_message'),
        related_id: followup.invitation_id
      });

      setFollowup(prev => prev ? { ...prev, answer: answer.trim(), answered_at: new Date().toISOString() } : null);
      toast({ title: t('followup.answer_submitted') });
    } catch (error) {
      console.error('Error submitting followup answer:', error);
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-2xl py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!followup) {
    return (
      <MainLayout>
        <div className="container max-w-2xl py-12 text-center text-muted-foreground">
          {t('followup.not_found')}
        </div>
      </MainLayout>
    );
  }

  const isAnswered = !!followup.answered_at;

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/profile')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Context Header */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{invitation?.business_profile?.company_name || t('followup.company')}</p>
                <p className="text-sm text-muted-foreground">
                  {invitation?.hiring_goal?.role_title || invitation?.challenge?.title || t('followup.challenge')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Followup Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                {t('followup.title')}
              </CardTitle>
              {isAnswered ? (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('followup.answered')}
                </Badge>
              ) : (
                <Badge variant="outline">{t('followup.pending')}</Badge>
              )}
            </div>
            <CardDescription>
              {t('followup.asked_on', { date: new Date(followup.asked_at).toLocaleDateString() })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question */}
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <p className="text-sm font-medium text-muted-foreground mb-1">{t('followup.question_label')}</p>
              <p className="text-foreground">{followup.question}</p>
            </div>

            {/* Answer Section */}
            {isAnswered ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('followup.your_answer')}</p>
                <div className="bg-background rounded-lg p-4 border">
                  <p className="whitespace-pre-wrap">{followup.answer}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('followup.answered_on', { date: new Date(followup.answered_at!).toLocaleDateString() })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">{t('followup.your_answer')}</p>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t('followup.answer_placeholder')}
                    rows={5}
                    className="resize-none"
                  />
                </div>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!answer.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {t('followup.submit_answer')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
