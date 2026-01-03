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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Loader2, 
  Clock, 
  Video,
  Building2,
  Briefcase,
  User,
  MessageSquare,
} from 'lucide-react';
import { useBusinessLocale, BusinessLocale } from '@/hooks/useBusinessLocale';

interface Level3InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  hiringGoalId: string;
  candidateProfileId: string;
  candidateName: string;
  companyName?: string;
  roleTitle?: string;
  onInviteSent?: () => void;
}

const DURATION_OPTIONS = [
  { value: 4, label: '4 min' },
  { value: 5, label: '5 min' },
  { value: 6, label: '6 min' },
];

const PROMPT_COUNT_OPTIONS = [
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

export const Level3InviteModal: React.FC<Level3InviteModalProps> = ({
  open,
  onOpenChange,
  businessId,
  hiringGoalId,
  candidateProfileId,
  candidateName,
  companyName,
  roleTitle,
  onInviteSent,
}) => {
  const { t } = useTranslation();
  const { locale } = useBusinessLocale();
  
  const [duration, setDuration] = useState(5);
  const [promptCount, setPromptCount] = useState(4);
  const [sending, setSending] = useState(false);
  const [contextData, setContextData] = useState<{ companyName: string; roleTitle: string } | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setDuration(5);
      setPromptCount(4);
    }
  }, [open]);

  // Fetch context data if not provided
  useEffect(() => {
    if (!open) return;
    
    if (companyName && roleTitle) {
      setContextData({ companyName, roleTitle });
      return;
    }

    async function fetchContext() {
      try {
        const [{ data: businessProfile }, { data: goalData }] = await Promise.all([
          supabase.from('business_profiles').select('company_name').eq('user_id', businessId).single(),
          supabase.from('hiring_goal_drafts').select('role_title').eq('id', hiringGoalId).single(),
        ]);

        setContextData({
          companyName: businessProfile?.company_name || 'Company',
          roleTitle: goalData?.role_title || 'Role',
        });
      } catch (err) {
        console.error('Error fetching context:', err);
        setContextData({ companyName: 'Company', roleTitle: 'Role' });
      }
    }

    fetchContext();
  }, [open, businessId, hiringGoalId, companyName, roleTitle]);

  const createChallengeAndInvite = async () => {
    setSending(true);
    try {
      const title = t('level3.standing.title');
      const description = t('level3.standing.description');

      // Create the Level 3 Standing challenge
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
            deliverable_type: 'video',
            duration_minutes: duration,
            prompt_count: promptCount,
            locale,
            company_context: contextData,
          },
          time_estimate_minutes: duration,
          status: 'active',
        }])
        .select('id')
        .single();

      if (createError) throw createError;

      // Check for existing invitation
      const { data: existingInvitation } = await supabase
        .from('challenge_invitations')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('hiring_goal_id', hiringGoalId)
        .eq('challenge_id', newChallenge.id)
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
          challenge_id: newChallenge.id,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            {t('level3.standing.modal_title')}
          </DialogTitle>
          <DialogDescription>
            {t('level3.standing.modal_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Summary */}
          <Card className="bg-muted/30">
            <CardContent className="py-3 px-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{candidateName}</span>
              </div>
              {contextData && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{contextData.companyName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{contextData.roleTitle}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* What is Standing */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">{t('level3.standing.what_title')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t('level3.standing.what_description')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {t('level3.standing.duration_label')}
              </Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {t('level3.standing.prompts_label')}
              </Label>
              <Select value={promptCount.toString()} onValueChange={(v) => setPromptCount(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_COUNT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label} {t('level3.standing.prompts_suffix')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="text-xs text-muted-foreground text-center py-2 border-t">
            {t('level3.standing.summary', { duration, promptCount })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t('level3.standing.not_now')}
          </Button>
          <Button onClick={createChallengeAndInvite} disabled={sending || !contextData}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Video className="h-4 w-4 mr-2" />
            {t('level3.standing.send_invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
