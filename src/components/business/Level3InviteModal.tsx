import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Loader2, 
  Clock, 
  Video,
  Mic,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';

interface Level3InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  hiringGoalId: string;
  candidateProfileId: string;
  candidateName: string;
  onInviteSent?: () => void;
}

// Level 3 challenge templates
const LEVEL_3_TEMPLATES = [
  {
    id: 'video_pitch',
    titleKey: 'level3.templates.video_pitch.title',
    descriptionKey: 'level3.templates.video_pitch.description',
    icon: Video,
    timeboxMinutes: 30,
    deliverableType: 'video',
  },
  {
    id: 'async_presentation',
    titleKey: 'level3.templates.async_presentation.title',
    descriptionKey: 'level3.templates.async_presentation.description',
    icon: Mic,
    timeboxMinutes: 45,
    deliverableType: 'presentation',
  },
  {
    id: 'written_narrative',
    titleKey: 'level3.templates.written_narrative.title',
    descriptionKey: 'level3.templates.written_narrative.description',
    icon: MessageCircle,
    timeboxMinutes: 40,
    deliverableType: 'narrative',
  },
];

export const Level3InviteModal: React.FC<Level3InviteModalProps> = ({
  open,
  onOpenChange,
  businessId,
  hiringGoalId,
  candidateProfileId,
  candidateName,
  onInviteSent,
}) => {
  const { t } = useTranslation();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('video_pitch');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId('video_pitch');
      setCustomTitle('');
      setCustomDescription('');
    }
  }, [open]);

  const selectedTemplate = LEVEL_3_TEMPLATES.find(t => t.id === selectedTemplateId);

  const createChallengeAndInvite = async () => {
    if (!selectedTemplate) return;

    setCreatingChallenge(true);
    try {
      const title = customTitle.trim() || t(selectedTemplate.titleKey);
      const description = customDescription.trim() || t(selectedTemplate.descriptionKey);

      // Create the Level 3 challenge
      const { data: newChallenge, error: createError } = await supabase
        .from('business_challenges')
        .insert([{
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          title,
          description,
          rubric: {
            level: 3,
            type: 'standing_presence',
            deliverable_type: selectedTemplate.deliverableType,
            timebox_minutes: selectedTemplate.timeboxMinutes,
            company_context_ref: {
              business_id: businessId,
              hiring_goal_id: hiringGoalId,
            },
          },
          time_estimate_minutes: selectedTemplate.timeboxMinutes,
          status: 'active',
        }])
        .select('id')
        .single();

      if (createError) throw createError;

      // Send the invitation
      await sendInvitation(newChallenge.id);
    } catch (err) {
      console.error('Error creating Level 3 challenge:', err);
      toast({
        title: t('common.error'),
        description: t('level3.create_failed'),
        variant: 'destructive',
      });
    } finally {
      setCreatingChallenge(false);
    }
  };

  const sendInvitation = async (challengeId: string) => {
    setSending(true);
    try {
      // Check for existing invitation
      const { data: existingInvitation } = await supabase
        .from('challenge_invitations')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('hiring_goal_id', hiringGoalId)
        .eq('challenge_id', challengeId)
        .eq('candidate_profile_id', candidateProfileId)
        .not('status', 'in', '("withdrawn","expired","cancelled")')
        .maybeSingle();

      if (existingInvitation) {
        toast({
          title: t('business.level3.already_invited'),
        });
        onOpenChange(false);
        onInviteSent?.();
        return;
      }

      // Create new invitation
      const { error } = await supabase
        .from('challenge_invitations')
        .insert({
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          challenge_id: challengeId,
          candidate_profile_id: candidateProfileId,
          status: 'invited',
          sent_via: ['in_app'],
        });

      if (error) {
        if (error.message?.includes('pipeline_locked')) {
          toast({
            title: t('business.level3.pipeline_locked'),
            description: t('business.level3.pipeline_locked_desc'),
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: t('business.level3.invite_sent'),
        description: t('business.level3.invite_sent_desc', { name: candidateName }),
      });

      onOpenChange(false);
      onInviteSent?.();
    } catch (err) {
      console.error('Error sending Level 3 invite:', err);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const isProcessing = sending || creatingChallenge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('level3.modal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('level3.modal.description', { name: candidateName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('level3.select_format')}</Label>
            <div className="space-y-2">
              {LEVEL_3_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplateId === template.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {selectedTemplateId === template.id && (
                              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            )}
                            <h4 className="font-medium text-sm">{t(template.titleKey)}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {t(template.descriptionKey)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {template.timeboxMinutes}m
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Optional Custom Title */}
          <div className="space-y-2">
            <Label htmlFor="custom-title" className="text-sm">
              {t('level3.custom_title_label')} <span className="text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Input
              id="custom-title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={selectedTemplate ? t(selectedTemplate.titleKey) : ''}
            />
          </div>

          {/* Optional Custom Description */}
          <div className="space-y-2">
            <Label htmlFor="custom-desc" className="text-sm">
              {t('level3.custom_description_label')} <span className="text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="custom-desc"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder={selectedTemplate ? t(selectedTemplate.descriptionKey) : ''}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            {t('common.cancel')}
          </Button>
          <Button onClick={createChallengeAndInvite} disabled={isProcessing}>
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('level3.send_invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
