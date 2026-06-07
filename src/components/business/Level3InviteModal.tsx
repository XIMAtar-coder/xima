import React, { useEffect, useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Video,
  Building2,
  Briefcase,
  User,
} from 'lucide-react';

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

// Stage F: per-goal L3 resolution. We no longer hard-code a global
// Standing Video challenge id. resolveOrCreateL3Challenge() finds the
// (business_id, hiring_goal_id) L3 challenge or lazily creates one that
// matches the row shape `StandingVideoSession` and the pipeline trigger
// expect (level=3, rubric.type='standing_presence').

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
  const { t, i18n } = useTranslation();

  const [sending, setSending] = useState(false);
  const [contextData, setContextData] = useState<{ companyName: string; roleTitle: string } | null>(null);

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

  // Resolve the (business_id, hiring_goal_id) L3 challenge using
  // authoritative-level-first detection. If none exists, lazily create one
  // that matches the canonical Standing Video row shape verbatim so the
  // candidate router (level === 3 → /candidate/challenges/:invitationId/standing)
  // and the pipeline trigger (rubric.type === 'standing_presence') both work.
  const resolveOrCreateL3ChallengeId = async (): Promise<string> => {
    const { data: candidates, error: fetchErr } = await supabase
      .from('business_challenges')
      .select('id, level, rubric, title, created_at')
      .eq('business_id', businessId)
      .eq('hiring_goal_id', hiringGoalId)
      .in('status', ['active', 'published'])
      .order('created_at', { ascending: false });
    if (fetchErr) throw fetchErr;

    const l3s = (candidates || []).filter((c) => {
      if (c.level === 3) return true;
      if (c.level === 1 || c.level === 2) return false;
      const r = (c.rubric as { type?: string; level?: string } | null) ?? {};
      return r.type === 'standing_presence' || r.type === 'video' || r.level === '3';
    });

    if (l3s.length > 0) {
      if (l3s.length > 1) {
        console.warn(
          `[Level3InviteModal] Multiple L3 challenges for goal ${hiringGoalId}; using most recent.`,
          l3s.map((c) => c.id),
        );
      }
      return l3s[0].id;
    }

    // Lazy create — replicates row 9ae27a4a verbatim except for IDs and context.
    const ctx = contextData ?? { companyName: companyName || 'Company', roleTitle: roleTitle || 'Role' };
    const { data: created, error: createErr } = await supabase
      .from('business_challenges')
      .insert({
        business_id: businessId,
        hiring_goal_id: hiringGoalId,
        title: 'Standing Video',
        description:
          'A short, guided video session to evaluate communication and professional presence.',
        status: 'active',
        level: 3,
        is_public: true,
        is_template: false,
        generation_status: 'draft',
        time_estimate_minutes: 5,
        success_criteria: [],
        rubric: {
          type: 'standing_presence',
          deliverable_type: 'video',
          duration_minutes: 5,
          prompt_count: 4,
          level: 3,
          locale: i18n.language || 'en',
          company_context: { companyName: ctx.companyName, roleTitle: ctx.roleTitle },
        },
      })
      .select('id')
      .single();
    if (createErr) throw createErr;
    if (import.meta.env.DEV) {
      console.log('[Level3InviteModal] Auto-created L3 challenge', created.id, 'for goal', hiringGoalId);
    }
    return created.id;
  };

  const sendInvitation = async () => {
    setSending(true);
    try {
      // Write order:
      // 1) resolve-or-create the L3 challenge for this goal
      // 2) upsert the proceed_level3 review onto the SUBMITTED L2 invitation (Gate B)
      // 3) insert the L3 invitation (trigger checks Gate A + Gate B)
      let l3ChallengeId: string;
      try {
        l3ChallengeId = await resolveOrCreateL3ChallengeId();
      } catch (resolveErr) {
        console.error('[Level3InviteModal] L3 resolve/create failed:', resolveErr);
        toast({
          title: t('business.level3.challenge_setup_failed', 'Could not prepare the Standing Video challenge'),
          description: (resolveErr as Error).message,
          variant: 'destructive',
        });
        return;
      }

      // Submission-gated atomic upsert of the proceed_level3 review.
      // Mirrors trigger Gate B: only record advancement when the candidate has
      // an L2 challenge_invitations row with a SUBMITTED submission for the
      // same (business, hiring_goal). Authoritative-level-first detector so
      // a future rubric drift can't misclassify the L2 row.
      try {
        // L2 = the active/published challenge for this goal whose level=2 (or,
        // for legacy rows with level NULL, NOT L1 and NOT L3 by rubric/title).
        const { data: candidateL2Challenges } = await supabase
          .from('business_challenges')
          .select('id, level, rubric, title')
          .eq('business_id', businessId)
          .eq('hiring_goal_id', hiringGoalId)
          .in('status', ['active', 'published']);

        const l2Challenge = (candidateL2Challenges || []).find((c) => {
          if (c.level === 2) return true;
          if (c.level === 1 || c.level === 3) return false;
          // Fallback heuristic only when level column is null.
          const r = (c.rubric as { type?: string; isXimaCore?: unknown; level?: string } | null) ?? {};
          const title = (c.title || '').toLowerCase();
          const isL1 = r.type === 'xima_core' || r.isXimaCore === true || r.level === '1' || title.includes('xima core');
          const isL3 = r.type === 'standing_presence' || r.type === 'video' || r.level === '3';
          return !isL1 && !isL3;
        });

        if (l2Challenge?.id) {
          const { data: l2Inv } = await supabase
            .from('challenge_invitations')
            .select('id, challenge_submissions!inner(id, status)')
            .eq('business_id', businessId)
            .eq('hiring_goal_id', hiringGoalId)
            .eq('candidate_profile_id', candidateProfileId)
            .eq('challenge_id', l2Challenge.id)
            .eq('challenge_submissions.status', 'submitted')
            .maybeSingle();

          if (l2Inv?.id) {
            const { error: reviewErr } = await supabase
              .from('challenge_reviews')
              .upsert({
                business_id: businessId,
                challenge_id: l2Challenge.id,
                invitation_id: l2Inv.id,
                candidate_profile_id: candidateProfileId,
                decision: 'proceed_level3',
              }, { onConflict: 'invitation_id' });

            if (reviewErr) {
              console.error('[Level3InviteModal] proceed_level3 review upsert failed:', reviewErr);
              toast({
                title: t('business.level3.review_failed'),
                description: reviewErr.message,
                variant: 'destructive',
              });
              return;
            }
            if (import.meta.env.DEV) {
              console.log('[Level3InviteModal] proceed_level3 review upserted for invitation', l2Inv.id);
            }
          } else if (import.meta.env.DEV) {
            console.log('[Level3InviteModal] No submitted L2 found — skipping review upsert; Gate A will enforce.');
          }
        }
      } catch (preErr) {
        // Non-fatal — fall through and let Gate A/B return the canonical error.
        console.error('[Level3InviteModal] Pre-flight review upsert errored:', preErr);
      }

      // Already-active L3 invitation check (for THIS challenge id).
      const { data: existingInvitation } = await supabase
        .from('challenge_invitations')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('hiring_goal_id', hiringGoalId)
        .eq('challenge_id', l3ChallengeId)
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

      // Create the L3 invitation on the seeded Standing Video challenge.
      const { error } = await supabase
        .from('challenge_invitations')
        .insert({
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          challenge_id: l3ChallengeId,
          candidate_profile_id: candidateProfileId,
          status: 'invited',
          sent_via: ['in_app'],
        });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('pipeline_locked')) {
          if (msg.includes('Level 2 submission required')) {
            toast({
              title: t('business.level3.gate_a_failed'),
              description: t('business.level3.gate_a_failed_desc'),
              variant: 'destructive',
            });
          } else if (msg.includes('Proceed to Level 3')) {
            toast({
              title: t('business.level3.gate_b_failed'),
              description: t('business.level3.gate_b_failed_desc'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('business.level3.pipeline_locked'),
              description: t('business.level3.pipeline_locked_desc'),
              variant: 'destructive',
            });
          }
        } else if (error.code === '23505') {
          toast({ title: t('business.level3.already_invited') });
          onOpenChange(false);
          onInviteSent?.();
        } else {
          console.error('[Level3InviteModal] invite insert failed', error);
          toast({
            title: t('common.error'),
            description: msg,
            variant: 'destructive',
          });
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
      toast({ title: t('common.error'), variant: 'destructive' });
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t('level3.standing.not_now')}
          </Button>
          <Button onClick={sendInvitation} disabled={sending || !contextData}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Video className="h-4 w-4 mr-2" />
            {t('level3.standing.send_invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
