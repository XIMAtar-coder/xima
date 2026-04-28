import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Target, Calendar, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export interface Challenge {
  id: string;
  title: string;
  updated_at: string;
  hiring_goal_id?: string;
  goal_title?: string;
  end_at?: string | null;
  level?: number | null;
  rubric?: any;
}

interface ChallengePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenges: Challenge[];
  selectedCount: number;
  onConfirm: (challengeId: string, hiringGoalId?: string) => void;
  loading?: boolean;
}

export const ChallengePickerModal: React.FC<ChallengePickerModalProps> = ({
  open,
  onOpenChange,
  challenges,
  selectedCount,
  onConfirm,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');

  // Reset selection when modal opens with new challenges
  useEffect(() => {
    if (open && challenges.length > 0) {
      setSelectedChallengeId(challenges[0].id);
    }
  }, [open, challenges]);

  const handleConfirm = () => {
    if (selectedChallengeId) {
      const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);
      onConfirm(selectedChallengeId, selectedChallenge?.hiring_goal_id);
    }
  };

  const getLevelLabel = (challenge: Challenge) => {
    const level = challenge.rubric?.level || challenge.level;
    if (level === 1) return t('business.shortlist.invite_level_picker.l1', 'L1 — Behavioural');
    if (level === 2) return t('business.shortlist.invite_level_picker.l2', 'L2 — Technical');
    if (level === 3) return t('business.shortlist.invite_level_picker.l3', 'L3 — Video');
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('business.shortlist.invite_level_picker.title', t('business.invite.choose_challenge'))}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('business.invite.choose_challenge_desc', { count: selectedCount })}
          </p>

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
                  <div className="font-medium text-foreground">{getLevelLabel(challenge) || challenge.title}</div>
                  {getLevelLabel(challenge) && (
                    <div className="text-xs text-muted-foreground mt-0.5">{challenge.title}</div>
                  )}
                  {challenge.goal_title && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Briefcase size={12} />
                      {challenge.goal_title}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar size={12} />
                    {challenge.end_at 
                      ? `${t('business.invite.ends')}: ${format(new Date(challenge.end_at), 'MMM d, yyyy')}`
                      : `${t('business.invite.updated')}: ${format(new Date(challenge.updated_at), 'MMM d, yyyy')}`
                    }
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedChallengeId || loading}>
            {loading ? t('common.loading') : t('business.invite.confirm_invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
