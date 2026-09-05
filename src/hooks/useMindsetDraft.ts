import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_MINDSET_PAYLOAD, MindsetPayload } from '@/components/candidate/mindset/types';
import { log } from '@/lib/log';
import i18n from '@/i18n';

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
      submissionIdRef.current = data.id as string;
      statusRef.current = (data.status as 'draft' | 'submitted') || 'draft';
      const raw =
        data.status === 'submitted' ? data.submitted_payload : data.draft_payload;
      const payload =
        raw && typeof raw === 'object' && (raw as any).format === 'mindset'
          ? ({ ...EMPTY_MINDSET_PAYLOAD, ...(raw as any) } as MindsetPayload)
          : EMPTY_MINDSET_PAYLOAD;
      setState({
        loading: false,
        submissionId: data.id as string,
        status: (data.status as 'draft' | 'submitted') || 'draft',
        submittedAt: data.submitted_at ?? null,
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
            } as any,
            { onConflict: 'invitation_id' }
          )
          .select('id')
          .single();
        if (data?.id) submissionIdRef.current = data.id as string;
      }
    },
    [invitationId]
  );

  const saveDraftDebounced = useCallback(
    (payload: MindsetPayload) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        upsertDraft(payload).catch((e) => log.error('[mindset] draft save error', e));
      }, 1200);
    },
    [upsertDraft]
  );

  /**
   * Ask the scorer to grade a payload. Fire-and-forget: the candidate is never
   * blocked on it, and the edge function persists signals_payload itself.
   * Exposed so the resolve screen can retry when the first attempt failed —
   * until 2026-09-06 a server-side error here left the submission unscored
   * with no way for anyone to try again.
   */
  const requestScoring = useCallback(async (payload: MindsetPayload, challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.functions.invoke('analyze-open-answer', {
        body: {
          challenge_id: challengeId,
          invitation_id: invitationId,
          user_id: user?.id,
          // The candidate's own language — the reflection they get back is
          // written in it. This used to be hardcoded to Italian.
          language: (i18n.language || 'en').slice(0, 2),
          scoring_context: 'l1_challenge',
          format: 'mindset',
          mindset_payload: {
            instinct_choices: payload.instinct_choices,
            day_log: payload.day_log,
            debrief: payload.debrief,
          },
        },
      });
    } catch {
      /* the resolve screen polls for the result and offers a retry */
    }
  }, [invitationId]);

  /** Re-run scoring for the already-submitted payload. */
  const rescore = useCallback(async (challengeId: string) => {
    const payload = state.initialPayload;
    if (!payload || state.status !== 'submitted') return;
    await requestScoring(payload, challengeId);
  }, [requestScoring, state.initialPayload, state.status]);

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

      const { error: invitationStatusError } = await supabase
        .from('challenge_invitations')
        .update({ status: 'submitted', responded_at: now })
        .eq('id', invitationId);
      // Surfaced, not swallowed: this write failed silently for months,
      // leaving businesses unable to see who had responded.
      if (invitationStatusError) {
        log.error('Failed to mark invitation as submitted', invitationStatusError);
      }

      statusRef.current = 'submitted';

      void requestScoring(payload, challengeId);

      return { submittedAt: now };
    },
    [invitationId]
  );

  return { ...state, saveDraftDebounced, submit, rescore };
}
