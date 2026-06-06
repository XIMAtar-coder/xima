import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_L2_PAYLOAD, L2DraftPayload } from '@/components/candidate/l2converse/types';

type LoadResult = {
  loading: boolean;
  submissionId: string | null;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  initialPayload: L2DraftPayload;
};

/**
 * Loads the single challenge_submissions row for the invitation. The server
 * (l2-converse) owns draft writes; this hook only:
 *  - hydrates initial transcript on mount (draft or submitted)
 *  - exposes refresh() so the chat can resync after a 409 TURN_INDEX_MISMATCH
 *  - exposes submit() that flips status='submitted' and copies draft → submitted_payload
 */
export function useL2ConverseDraft(invitationId: string) {
  const [state, setState] = useState<LoadResult>({
    loading: true,
    submissionId: null,
    status: 'draft',
    submittedAt: null,
    initialPayload: EMPTY_L2_PAYLOAD,
  });
  const submissionIdRef = useRef<string | null>(null);
  const statusRef = useRef<'draft' | 'submitted'>('draft');

  const hydrate = useCallback(async () => {
    const { data } = await supabase
      .from('challenge_submissions')
      .select('id, status, submitted_at, draft_payload, submitted_payload')
      .eq('invitation_id', invitationId)
      .maybeSingle();
    if (!data) {
      setState({
        loading: false,
        submissionId: null,
        status: 'draft',
        submittedAt: null,
        initialPayload: EMPTY_L2_PAYLOAD,
      });
      return;
    }
    submissionIdRef.current = data.id;
    statusRef.current = (data.status as 'draft' | 'submitted') || 'draft';
    const raw =
      data.status === 'submitted' ? data.submitted_payload : data.draft_payload;
    const payload =
      raw && typeof raw === 'object' && (raw as any).format === 'l2_conversation'
        ? ({ ...EMPTY_L2_PAYLOAD, ...(raw as any) } as L2DraftPayload)
        : EMPTY_L2_PAYLOAD;
    setState({
      loading: false,
      submissionId: data.id,
      status: statusRef.current,
      submittedAt: data.submitted_at,
      initialPayload: payload,
    });
  }, [invitationId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrate();
      if (cancelled) {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  /** Re-fetch the authoritative draft from the server (used on 409 resync). */
  const refresh = useCallback(async (): Promise<L2DraftPayload> => {
    const { data } = await supabase
      .from('challenge_submissions')
      .select('id, status, draft_payload')
      .eq('invitation_id', invitationId)
      .maybeSingle();
    if (data) {
      submissionIdRef.current = data.id;
      statusRef.current = (data.status as 'draft' | 'submitted') || 'draft';
    }
    const raw = data?.draft_payload;
    const payload =
      raw && typeof raw === 'object' && (raw as any).format === 'l2_conversation'
        ? ({ ...EMPTY_L2_PAYLOAD, ...(raw as any) } as L2DraftPayload)
        : EMPTY_L2_PAYLOAD;
    return payload;
  }, [invitationId]);

  /**
   * Flip status='submitted'. Copies the current draft payload into submitted_payload
   * with format='l2_conversation'. This UPDATE fires the existing emit_feed_signal
   * trigger downstream.
   */
  const submit = useCallback(
    async (payload: L2DraftPayload) => {
      // Need an existing submission row — l2-converse always creates one on turn_index=0.
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
      setState((s) => ({ ...s, status: 'submitted', submittedAt: now, initialPayload: payload }));
      return { submittedAt: now };
    },
    [invitationId]
  );

  return { ...state, refresh, submit };
}
