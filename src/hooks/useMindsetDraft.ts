import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_MINDSET_PAYLOAD, MindsetPayload } from '@/components/candidate/mindset/types';

type LoadResult = {
  loading: boolean;
  submissionId: string | null;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  initialPayload: MindsetPayload;
};

export function useMindsetDraft(invitationId: string) {
  const [state, setState] = useState<LoadResult>({
    loading: true,
    submissionId: null,
    status: 'draft',
    submittedAt: null,
    initialPayload: EMPTY_MINDSET_PAYLOAD,
  });
  const submissionIdRef = useRef<string | null>(null);
  const statusRef = useRef<'draft' | 'submitted'>('draft');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('challenge_submissions')
        .select('id, status, submitted_at, draft_payload, submitted_payload')
        .eq('invitation_id', invitationId)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      submissionIdRef.current = data.id;
      statusRef.current = (data.status as 'draft' | 'submitted') || 'draft';
      const raw =
        data.status === 'submitted' ? data.submitted_payload : data.draft_payload;
      const payload =
        raw && typeof raw === 'object' && (raw as any).format === 'mindset'
          ? ({ ...EMPTY_MINDSET_PAYLOAD, ...(raw as any) } as MindsetPayload)
          : EMPTY_MINDSET_PAYLOAD;
      setState({
        loading: false,
        submissionId: data.id,
        status: (data.status as 'draft' | 'submitted') || 'draft',
        submittedAt: data.submitted_at,
        initialPayload: payload,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const upsertDraft = useCallback(
    async (payload: MindsetPayload) => {
      if (statusRef.current === 'submitted') return;
      const { data: invitation } = await supabase
        .from('challenge_invitations')
        .select('id, business_id, hiring_goal_id, challenge_id, candidate_profile_id')
        .eq('id', invitationId)
        .single();
      if (!invitation) return;
      if (submissionIdRef.current) {
        await supabase
          .from('challenge_submissions')
          .update({ draft_payload: payload as any })
          .eq('id', submissionIdRef.current);
      } else {
        const { data } = await supabase
          .from('challenge_submissions')
          .upsert(
            {
              invitation_id: invitation.id,
              candidate_profile_id: invitation.candidate_profile_id,
              business_id: invitation.business_id,
              hiring_goal_id: invitation.hiring_goal_id,
              challenge_id: invitation.challenge_id,
              draft_payload: payload as any,
              status: 'draft',
              signals_version: 'v1',
            },
            { onConflict: 'invitation_id' }
          )
          .select('id')
          .single();
        if (data?.id) submissionIdRef.current = data.id;
      }
    },
    [invitationId]
  );

  const saveDraftDebounced = useCallback(
    (payload: MindsetPayload) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        upsertDraft(payload).catch((e) => console.error('[mindset] draft save error', e));
      }, 1200);
    },
    [upsertDraft]
  );

  const submit = useCallback(
    async (payload: MindsetPayload, challengeId: string) => {
      const { data: invitation, error: invErr } = await supabase
        .from('challenge_invitations')
        .select('id, business_id, hiring_goal_id, challenge_id, candidate_profile_id')
        .eq('id', invitationId)
        .single();
      if (invErr || !invitation) throw invErr || new Error('Invitation not found');

      const now = new Date().toISOString();
      const submissionData = {
        invitation_id: invitation.id,
        candidate_profile_id: invitation.candidate_profile_id,
        business_id: invitation.business_id,
        hiring_goal_id: invitation.hiring_goal_id,
        challenge_id: invitation.challenge_id,
        status: 'submitted',
        submitted_payload: payload as any,
        draft_payload: payload as any,
        submitted_at: now,
        signals_version: 'v1',
      };

      if (submissionIdRef.current) {
        const { error } = await supabase
          .from('challenge_submissions')
          .update(submissionData as any)
          .eq('id', submissionIdRef.current);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('challenge_submissions')
          .upsert(submissionData as any, { onConflict: 'invitation_id' });
        if (error) throw error;
      }

      await supabase
        .from('challenge_invitations')
        .update({ status: 'submitted', responded_at: now })
        .eq('id', invitationId);

      statusRef.current = 'submitted';

      // Fire-and-forget scoring; never block candidate
      try {
        const { data: { user } } = await supabase.auth.getUser();
        supabase.functions
          .invoke('analyze-open-answer', {
            body: {
              challenge_id: challengeId,
              user_id: user?.id,
              language: 'it',
              scoring_context: 'l1_challenge',
              format: 'mindset',
              mindset_payload: {
                instinct_choices: payload.instinct_choices,
                day_log: payload.day_log,
                debrief: payload.debrief,
              },
            },
          })
          .then(async ({ data, error }) => {
            if (error || !data) return;
            await supabase
              .from('challenge_submissions')
              .update({ signals_payload: data as any })
              .eq('invitation_id', invitationId);
          })
          .catch(() => {});
      } catch {
        /* ignore */
      }

      return { submittedAt: now };
    },
    [invitationId]
  );

  return { ...state, saveDraftDebounced, submit };
}
