import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SendArgs = {
  challengeId: string;
  invitationId: string;
  latestCandidateMessage: string;
  turnIndex: number;
};

export type L2ConverseResponse = {
  reply: string;
  turn_index: number;
  curveball_fired: boolean;
  curveball_fired_this_turn: boolean;
  done: boolean;
  reason: 'concludi_signal' | 'max_turns' | null;
  degraded: boolean;
  correlation_id: string;
};

export type L2ConverseError =
  | { kind: 'turn_mismatch'; expected: number; got: number }
  | { kind: 'already_submitted' }
  | { kind: 'conversation_done' }
  | { kind: 'network'; message: string };

/**
 * Thin client wrapper for the l2-converse edge function.
 * Server is the source of truth for transcript; this hook just relays the call
 * and surfaces structured errors so the chat component can resync on 409s.
 */
export function useL2Converse() {
  const [pending, setPending] = useState(false);

  const send = useCallback(
    async (
      args: SendArgs
    ): Promise<
      { ok: true; data: L2ConverseResponse } | { ok: false; error: L2ConverseError }
    > => {
      setPending(true);
      try {
        const { data, error } = await supabase.functions.invoke('l2-converse', {
          body: {
            challenge_id: args.challengeId,
            invitation_id: args.invitationId,
            latest_candidate_message: args.latestCandidateMessage,
            turn_index: args.turnIndex,
          },
        });

        // supabase-js surfaces non-2xx as `error` with a context.response we can read.
        if (error) {
          // Try to extract body from the underlying Response
          let parsed: any = null;
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              parsed = await ctx.json();
            } else if (ctx && typeof ctx.text === 'function') {
              parsed = JSON.parse(await ctx.text());
            }
          } catch {
            /* ignore */
          }
          const code = parsed?.error_code || parsed?.code;
          if (code === 'TURN_INDEX_MISMATCH') {
            return {
              ok: false,
              error: {
                kind: 'turn_mismatch',
                expected: parsed?.details?.expected ?? parsed?.expected ?? 0,
                got: parsed?.details?.got ?? parsed?.got ?? args.turnIndex,
              },
            };
          }
          if (code === 'ALREADY_SUBMITTED') return { ok: false, error: { kind: 'already_submitted' } };
          if (code === 'CONVERSATION_DONE') return { ok: false, error: { kind: 'conversation_done' } };
          return { ok: false, error: { kind: 'network', message: error.message || 'network' } };
        }

        return { ok: true, data: data as L2ConverseResponse };
      } catch (e: any) {
        return { ok: false, error: { kind: 'network', message: e?.message || 'network' } };
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { send, pending };
}
