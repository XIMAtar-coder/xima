import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSSEStream, SSE_SUPABASE_URL, type SSEEvent } from './useSSEStream';

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

/* ----------------------------------------------------------------- */
/* Streaming variant                                                  */
/* ----------------------------------------------------------------- */

export interface UseL2ConverseStreamOptions {
  /** Called for each incoming token; UI appends to the in-progress counterpart bubble. */
  onToken?: (delta: string) => void;
  /**
   * Called once with the authoritative final payload (server-persisted).
   * UI MUST replace the accumulated text with payload.reply (== final_text)
   * because server-side sanitize/fallback may have rewritten it.
   */
  onFinal?: (payload: L2ConverseResponse) => void;
  onError?: (err: L2ConverseError) => void;
}

export function useL2ConverseStream(opts: UseL2ConverseStreamOptions = {}) {
  const [pending, setPending] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const finalRef = useRef<L2ConverseResponse | null>(null);
  const sawErrorRef = useRef(false);

  const handleEvent = useCallback((e: SSEEvent) => {
    if (!e.data || e.data === '[DONE]') return;
    if (e.event === 'delta') {
      try {
        const j = JSON.parse(e.data);
        const text = typeof j?.text === 'string' ? j.text : '';
        if (text) optsRef.current.onToken?.(text);
      } catch { /* ignore */ }
    } else if (e.event === 'meta') {
      try {
        const j = JSON.parse(e.data);
        finalRef.current = j as L2ConverseResponse;
      } catch { /* ignore */ }
    } else if (e.event === 'error') {
      sawErrorRef.current = true;
      try {
        const j = JSON.parse(e.data);
        const code = j?.error_code;
        if (code === 'TURN_INDEX_MISMATCH') {
          optsRef.current.onError?.({ kind: 'turn_mismatch', expected: j?.details?.expected ?? 0, got: j?.details?.got ?? 0 });
        } else if (code === 'ALREADY_SUBMITTED') {
          optsRef.current.onError?.({ kind: 'already_submitted' });
        } else if (code === 'CONVERSATION_DONE') {
          optsRef.current.onError?.({ kind: 'conversation_done' });
        } else {
          optsRef.current.onError?.({ kind: 'network', message: j?.message || code || 'error' });
        }
      } catch {
        optsRef.current.onError?.({ kind: 'network', message: 'error' });
      }
    }
  }, []);

  const { send: sseSend, stop, streaming } = useSSEStream({
    onEvent: handleEvent,
    onJsonFallback: (json) => {
      // Back-compat: edge replied JSON instead of SSE.
      const j = json as L2ConverseResponse;
      if (j && typeof j.reply === 'string') {
        finalRef.current = j;
      }
    },
    onDone: () => {
      setPending(false);
      if (!sawErrorRef.current && finalRef.current) {
        optsRef.current.onFinal?.(finalRef.current);
      }
    },
    onError: (err) => {
      setPending(false);
      sawErrorRef.current = true;
      optsRef.current.onError?.({ kind: 'network', message: err.message });
    },
  });

  const send = useCallback(async (args: SendArgs): Promise<void> => {
    finalRef.current = null;
    sawErrorRef.current = false;
    setPending(true);
    await sseSend({
      url: `${SSE_SUPABASE_URL}/functions/v1/l2-converse`,
      body: {
        challenge_id: args.challengeId,
        invitation_id: args.invitationId,
        latest_candidate_message: args.latestCandidateMessage,
        turn_index: args.turnIndex,
        stream: true,
      },
    });
  }, [sseSend]);

  return { send, stop, streaming, pending };
}
