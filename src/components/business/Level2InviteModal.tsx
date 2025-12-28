import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Target, Calendar, Plus, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getChallengeLevel } from '@/lib/challenges/challengeLevels';

interface Level2Challenge {
  id: string;
  title: string;
  updated_at: string;
}

interface Level2InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  hiringGoalId: string;
  candidateProfileId: string;
  candidateName: string;
  onInviteSent?: () => void;
}

export const Level2InviteModal: React.FC<Level2InviteModalProps> = ({
  open,
  onOpenChange,
  businessId,
  hiringGoalId,
  candidateProfileId,
  candidateName,
  onInviteSent,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Level2Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');

  // Fetch active Level 2 challenges for this hiring goal
  useEffect(() => {
    async function fetchLevel2Challenges() {
      if (!open || !businessId || !hiringGoalId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('business_challenges')
          .select('id, title, updated_at, rubric')
          .eq('business_id', businessId)
          .eq('hiring_goal_id', hiringGoalId)
          .in('status', ['active', 'published']);

        if (error) throw error;

        // Filter to only Level 2 challenges (custom/role-specific)
        const level2Challenges = (data || []).filter(c => {
          const level = getChallengeLevel({ rubric: c.rubric as { type?: string } | null });
          return level === 2;
        });

        setChallenges(level2Challenges);
        if (level2Challenges.length > 0) {
          setSelectedChallengeId(level2Challenges[0].id);
        }
      } catch (err) {
        console.error('Error fetching Level 2 challenges:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLevel2Challenges();
  }, [open, businessId, hiringGoalId]);

  const handleSendInvite = async () => {
    if (!selectedChallengeId) return;

    setSending(true);
    try {
      // Create the Level 2 invitation
      // DB trigger will validate pipeline prerequisites (L1 submitted + proceed_level2 review)
      const { error } = await supabase
        .from('challenge_invitations')
        .insert({
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          challenge_id: selectedChallengeId,
          candidate_profile_id: candidateProfileId,
          status: 'invited',
          sent_via: ['in_app'],
        });

      if (error) {
        // Handle pipeline_locked error from DB trigger
        if (error.message?.includes('pipeline_locked')) {
          toast({
            title: t('business.level2.pipeline_locked'),
            description: t('business.level2.pipeline_locked_desc'),
            variant: 'destructive',
          });
        } else if (error.code === '23505') {
          toast({
            title: t('business.level2.already_invited'),
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: t('business.level2.invite_sent'),
        description: t('business.level2.invite_sent_desc', { name: candidateName }),
      });

      onOpenChange(false);
      onInviteSent?.();
    } catch (err) {
      console.error('Error sending Level 2 invite:', err);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCreateChallenge = () => {
    onOpenChange(false);
    navigate(`/business/challenges/new?type=custom&goalId=${hiringGoalId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('business.level2.choose_challenge')}
          </DialogTitle>
          <DialogDescription>
            {t('business.level2.choose_challenge_desc', { name: candidateName })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {t('business.level2.no_challenges')}
              </p>
              <Button onClick={handleCreateChallenge}>
                <Plus className="h-4 w-4 mr-2" />
                {t('business.level2.create_challenge')}
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={selectedChallengeId}
              onValueChange={setSelectedChallengeId}
              className="space-y-3 max-h-[300px] overflow-y-auto"
            >
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedChallengeId === challenge.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedChallengeId(challenge.id)}
                >
                  <RadioGroupItem value={challenge.id} id={challenge.id} className="mt-0.5" />
                  <Label htmlFor={challenge.id} className="flex-1 cursor-pointer">
                    <div className="font-medium text-foreground">{challenge.title}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar size={12} />
                      {t('business.level2.updated')}: {format(new Date(challenge.updated_at), 'MMM d, yyyy')}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t('common.cancel')}
          </Button>
          {challenges.length > 0 && (
            <Button onClick={handleSendInvite} disabled={!selectedChallengeId || sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('business.level2.send_invite')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
