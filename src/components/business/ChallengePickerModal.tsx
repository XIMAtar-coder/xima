import React, { useState } from 'react';
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
import { Target, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Challenge {
  id: string;
  title: string;
  updated_at: string;
}

interface ChallengePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenges: Challenge[];
  selectedCount: number;
  onConfirm: (challengeId: string) => void;
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
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(
    challenges[0]?.id || ''
  );

  const handleConfirm = () => {
    if (selectedChallengeId) {
      onConfirm(selectedChallengeId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('business.invite.choose_challenge')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('business.invite.choose_challenge_desc', { count: selectedCount })}
          </p>

          <RadioGroup
            value={selectedChallengeId}
            onValueChange={setSelectedChallengeId}
            className="space-y-3"
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
                    {t('business.invite.updated')}: {format(new Date(challenge.updated_at), 'MMM d, yyyy')}
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
