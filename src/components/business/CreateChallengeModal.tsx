import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, Loader2 } from 'lucide-react';

interface CreateChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiringGoalId: string;
  businessId: string;
  defaultTitle?: string;
  defaultDescription?: string;
  onChallengeCreated: (challengeId: string, challengeTitle: string) => void;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  open,
  onOpenChange,
  hiringGoalId,
  businessId,
  defaultTitle = '',
  defaultDescription = '',
  onChallengeCreated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with new defaults
  React.useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
    }
  }, [open, defaultTitle, defaultDescription]);

  const handleActivate = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: t('common.error'),
        description: t('business_challenge.fill_required'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('business_challenges')
        .insert({
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          title: title.trim(),
          description: description.trim(),
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: t('business_challenge.activated'),
        description: t('business_challenge.activated_desc'),
      });

      // Return both id and title so parent can update state properly
      onChallengeCreated(data.id, title.trim());
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating challenge:', err);
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {t('business_challenge.create_title')}
          </DialogTitle>
          <DialogDescription>
            {t('business_challenge.create_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="challenge-title">{t('business_challenge.title_label')}</Label>
            <Input
              id="challenge-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('business_challenge.title_placeholder')}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge-description">{t('business_challenge.description_label')}</Label>
            <Textarea
              id="challenge-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('business_challenge.description_placeholder')}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/1000
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleActivate} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                {t('business_challenge.activate_button')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
