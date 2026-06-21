import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useL2ConverseStream, type L2ConverseResponse } from '@/hooks/useL2Converse';
import { L2MessageBubble } from './L2MessageBubble';
import { L2TypingIndicator } from './L2TypingIndicator';
import {
  L2DraftPayload,
  L2SimulationConfig,
  MAX_CANDIDATE_TURNS,
  TranscriptEntry,
} from './types';

type Props = {
  challengeId: string;
  invitationId: string;
  simulation: L2SimulationConfig;
  initialDraft: L2DraftPayload;
  refreshDraft: () => Promise<L2DraftPayload>;
  submitting: boolean;
  onSubmit: (final: L2DraftPayload) => Promise<void>;
};

export function L2ChatScreen({
  challengeId,
  invitationId,
  simulation,
  initialDraft,
  refreshDraft,
  submitting,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const counterpartName = simulation.counterpart?.name || 'Counterpart';
  const openingLine = simulation.counterpart?.opening_line || '';

  // Seed transcript: prefer server draft; otherwise show opener as turn=-1.
  const seedTranscript = useMemo<TranscriptEntry[]>(() => {
    if (initialDraft.transcript && initialDraft.transcript.length > 0) {
      return initialDraft.transcript;
    }
    return openingLine ? [{ role: 'counterpart', text: openingLine, turn: -1 }] : [];
  }, [initialDraft.transcript, openingLine]);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>(seedTranscript);
  const [curveballFired, setCurveballFired] = useState<boolean>(!!initialDraft.curveball_fired);
  const [done, setDone] = useState<boolean>(!!initialDraft.done);
  const [reason, setReason] = useState<'concludi_signal' | 'max_turns' | null>(
    initialDraft.reason ?? null
  );
  const [input, setInput] = useState('');
  // Live, in-progress counterpart bubble while tokens are streaming.
  const [streamingReply, setStreamingReply] = useState<string>('');
  const lastSentTextRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const turnIndex = useMemo(
    () => transcript.filter((e) => e.role === 'candidate').length,
    [transcript]
  );

  const handleResync = useCallback(async () => {
    const fresh = await refreshDraft();
    setTranscript(
      fresh.transcript && fresh.transcript.length > 0
        ? fresh.transcript
        : openingLine
        ? [{ role: 'counterpart', text: openingLine, turn: -1 }]
        : []
    );
    setCurveballFired(!!fresh.curveball_fired);
    setDone(!!fresh.done);
    setReason(fresh.reason ?? null);
    setStreamingReply('');
    if (lastSentTextRef.current) setInput(lastSentTextRef.current);
  }, [openingLine, refreshDraft]);

  const { send, stop, pending } = useL2ConverseStream({
    onToken: (delta) => {
      setStreamingReply((cur) => cur + delta);
    },
    onFinal: (payload: L2ConverseResponse) => {
      // Authoritative server text — replaces the streamed buffer (sanitize/fallback).
      const reply: TranscriptEntry = {
        role: 'counterpart',
        text: payload.reply,
        turn: payload.turn_index,
        ...(payload.curveball_fired_this_turn ? { curveball: true } : {}),
        ...(payload.degraded ? { degraded: true } : {}),
      };
      setTranscript((cur) => [...cur, reply]);
      setStreamingReply('');
      setCurveballFired(payload.curveball_fired);
      setDone(payload.done);
      setReason(payload.reason);
    },
    onError: async (err) => {
      // Drop the optimistic candidate bubble (the one we appended before sending).
      setStreamingReply('');
      setTranscript((cur) => {
        // remove last entry only if it's our optimistic candidate turn at turnIndex
        const last = cur[cur.length - 1];
        if (last && last.role === 'candidate' && last.text === lastSentTextRef.current) {
          return cur.slice(0, -1);
        }
        return cur;
      });

      if (err.kind === 'turn_mismatch' || err.kind === 'conversation_done' || err.kind === 'already_submitted') {
        await handleResync();
        if (err.kind !== 'turn_mismatch') setDone(true);
        return;
      }
      toast({
        title: t('candidate.l2_conversation.send_failed', 'Non sono riuscito a inviare'),
        description: t('candidate.l2_conversation.send_failed_hint', 'Riprova tra qualche secondo.'),
        variant: 'destructive',
      });
      setInput(lastSentTextRef.current);
    },
  });

  // Abort any live stream on unmount / route change.
  useEffect(() => () => { stop(); }, [stop]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length, pending, streamingReply]);

  const reachedMax = turnIndex >= MAX_CANDIDATE_TURNS;
  const composerDisabled = done || reachedMax || pending || submitting;

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || composerDisabled) return;

      const sentTurnIndex = turnIndex;
      lastSentTextRef.current = text;
      const optimistic: TranscriptEntry = {
        role: 'candidate',
        text,
        turn: sentTurnIndex,
      };
      setTranscript((cur) => [...cur, optimistic]);
      setInput('');
      setStreamingReply('');

      await send({
        challengeId: challengeId,
        invitationId: invitationId,
        latestCandidateMessage: text,
        turnIndex: sentTurnIndex,
      });
    },
    [challengeId, composerDisabled, input, invitationId, send, turnIndex]
  );

  const handleConcludi = useCallback(() => {
    const seed = (input.trim() ? input.trim() + ' ' : '') + 'concludi';
    setInput(seed);
  }, [input]);

  const handleSubmit = useCallback(async () => {
    const finalPayload: L2DraftPayload = {
      format: 'l2_conversation',
      opening_line: openingLine,
      transcript,
      curveball_fired: curveballFired,
      last_turn_index: Math.max(-1, turnIndex - 1),
      ...(done ? { done: true, reason: reason ?? 'concludi_signal' } : {}),
    };
    try {
      await onSubmit(finalPayload);
    } catch (e: any) {
      toast({
        title: t('candidate.l2_conversation.submit_failed', 'Errore nell\'invio finale'),
        description: e?.message || '',
        variant: 'destructive',
      });
    }
  }, [curveballFired, done, onSubmit, openingLine, reason, t, transcript, turnIndex]);

  const canFinish = done || turnIndex >= 1;

  return (
    <Card>
      <CardContent className="py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('candidate.l2_conversation.thread_label', 'Conversazione')}
            </p>
            <p className="text-sm text-foreground">
              {t('candidate.l2_conversation.with', 'Con {{name}}', { name: counterpartName })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.min(turnIndex, MAX_CANDIDATE_TURNS)} / {MAX_CANDIDATE_TURNS}
          </p>
        </div>

        {/* Thread */}
        <div
          ref={scrollRef}
          className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 pb-2"
        >
          {transcript.map((entry, i) => (
            <L2MessageBubble
              key={`${entry.role}-${entry.turn}-${i}`}
              entry={entry}
              counterpartName={counterpartName}
            />
          ))}
          {streamingReply && (
            <L2MessageBubble
              key="streaming-counterpart"
              entry={{ role: 'counterpart', text: streamingReply, turn: turnIndex }}
              counterpartName={counterpartName}
            />
          )}
          {pending && !streamingReply && <L2TypingIndicator counterpartName={counterpartName} />}
        </div>

        {/* Composer (hidden once done) */}
        {!done && !reachedMax && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t(
                'candidate.l2_conversation.composer_placeholder',
                'Scrivi la tua risposta a {{name}}…',
                { name: counterpartName }
              )}
              rows={3}
              disabled={composerDisabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleConcludi}
                disabled={composerDisabled}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {t('candidate.l2_conversation.want_to_conclude', 'Voglio concludere')}
              </button>
              <Button onClick={() => handleSend()} disabled={composerDisabled || !input.trim()}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('candidate.l2_conversation.send', 'Invia')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Done banner */}
        {(done || reachedMax) && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            {reason === 'max_turns' || (reachedMax && !done)
              ? t(
                  'candidate.l2_conversation.done_max',
                  'Avete raggiunto la fine della conversazione. Quando sei pronto, invia il tutto.'
                )
              : t(
                  'candidate.l2_conversation.done_concludi',
                  'La conversazione si è chiusa. Quando sei pronto, invia il tutto.'
                )}
          </div>
        )}

        {/* Termina e invia */}
        <div className="flex items-center justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!canFinish || submitting || pending}
            variant={done ? 'default' : 'outline'}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('candidate.l2_conversation.finish_submit', 'Termina e invia')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
