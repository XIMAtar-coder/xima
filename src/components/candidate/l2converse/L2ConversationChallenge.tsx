import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useL2ConverseDraft } from '@/hooks/useL2ConverseDraft';
import { L2Intro } from './L2Intro';
import { L2ChatScreen } from './L2ChatScreen';
import { L2ResolveScreen } from './L2ResolveScreen';
import type { L2ChallengeConfig, L2DraftPayload } from './types';

type Step = 'intro' | 'chat' | 'resolve';

type Props = {
  invitationId: string;
  challengeId: string;
  config: L2ChallengeConfig;
};

export function L2ConversationChallenge({ invitationId, challengeId, config }: Props) {
  const navigate = useNavigate();
  const draft = useL2ConverseDraft(invitationId);
  const [step, setStep] = useState<Step>('intro');
  const [submitting, setSubmitting] = useState(false);

  const simulation = config.l2_simulation;

  useEffect(() => {
    if (draft.loading) return;
    if (draft.status === 'submitted') {
      setStep('resolve');
      return;
    }
    // Resume into chat if there's any prior transcript.
    if (draft.initialPayload.transcript && draft.initialPayload.transcript.length > 0) {
      setStep('chat');
    }
  }, [draft.loading, draft.status, draft.initialPayload]);

  if (!simulation || !simulation.counterpart) {
    return (
      <div className="container max-w-3xl py-8">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Conversazione non ancora preparata. Riprova più tardi.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (draft.loading) {
    return (
      <div className="container max-w-3xl py-8">
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (final: L2DraftPayload) => {
    setSubmitting(true);
    try {
      await draft.submit(final);
      setStep('resolve');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {step === 'intro' && (
        <L2Intro simulation={simulation} onStart={() => setStep('chat')} />
      )}

      {step === 'chat' && (
        <L2ChatScreen
          challengeId={challengeId}
          invitationId={invitationId}
          simulation={simulation}
          initialDraft={draft.initialPayload}
          refreshDraft={draft.refresh}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}

      {step === 'resolve' && (
        <L2ResolveScreen
          counterpartName={simulation.counterpart.name || 'Counterpart'}
          onBack={() => navigate('/profile')}
        />
      )}
    </div>
  );
}
