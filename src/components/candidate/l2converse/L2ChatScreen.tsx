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
  const { send, pending } = useL2Converse();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive next expected candidate turn_index from transcript (= candidate replies so far).
  const turnIndex = useMemo(
    () => transcript.filter((e) => e.role === 'candidate').length,
    [transcript]
  );

  useEffect(() => {
    // Auto-scroll to bottom when transcript grows.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length, pending]);

  const reachedMax = turnIndex >= MAX_CANDIDATE_TURNS;
  const composerDisabled = done || reachedMax || pending || submitting;

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || composerDisabled) return;

      const sentTurnIndex = turnIndex;
      // Optimistic candidate bubble
      const optimistic: TranscriptEntry = {
        role: 'candidate',
        text,
        turn: sentTurnIndex,
      };
      setTranscript((cur) => [...cur, optimistic]);
      setInput('');

      const result = await send({
        challengeId,
        invitationId,
        latestCandidateMessage: text,
        turnIndex: sentTurnIndex,
      });

      if (result.ok !== true) {
        // Drop the optimistic candidate bubble in all error cases.
        setTranscript((cur) => cur.filter((e) => e !== optimistic));
        const err = (result as { ok: false; error: import('@/hooks/useL2Converse').L2ConverseError }).error;

        if (err.kind === 'turn_mismatch') {
          // Silent resync from server-of-truth draft.
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
          // Restore the candidate's typed text so they can retry.
          setInput(text);
          return;
        }
        if (err.kind === 'conversation_done' || err.kind === 'already_submitted') {
          const fresh = await refreshDraft();
          setTranscript(fresh.transcript || []);
          setDone(true);
          return;
        }
        toast({
          title: t('candidate.l2_conversation.send_failed', 'Non sono riuscito a inviare'),
          description: t('candidate.l2_conversation.send_failed_hint', 'Riprova tra qualche secondo.'),
          variant: 'destructive',
        });
        setInput(text);
        return;
      }

      // Append counterpart reply (server already persisted the full transcript).
      const data = (result as { ok: true; data: import('@/hooks/useL2Converse').L2ConverseResponse }).data;
      const reply: TranscriptEntry = {
        role: 'counterpart',
        text: data.reply,
        turn: sentTurnIndex,
        ...(data.curveball_fired_this_turn ? { curveball: true } : {}),
        ...(data.degraded ? { degraded: true } : {}),
      };
      setTranscript((cur) => [...cur, reply]);
      setCurveballFired(data.curveball_fired);
      setDone(data.done);
      setReason(data.reason);
    },
    [
      challengeId,
      composerDisabled,
      input,
      invitationId,
      openingLine,
      refreshDraft,
      send,
      t,
      turnIndex,
    ]
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
          {pending && <L2TypingIndicator counterpartName={counterpartName} />}
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
