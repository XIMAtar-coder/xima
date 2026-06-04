import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMindsetDraft } from '@/hooks/useMindsetDraft';
import { MindsetIntro } from './MindsetIntro';
import { InstinctCards } from './InstinctCards';
import { LivingDay } from './LivingDay';
import { GuideDebrief } from './GuideDebrief';
import { ResolveScreen } from './ResolveScreen';
import {
  DayGesture,
  DayItem,
  DebriefEntry,
  DayLogEntry,
  InstinctChoice,
  MindsetConfig,
  MindsetPayload,
  EMPTY_MINDSET_PAYLOAD,
} from './types';

type Step = 'intro' | 'instinct' | 'day' | 'debrief' | 'resolve';

type Props = {
  invitationId: string;
  challengeId: string;
  config: MindsetConfig;
};

export function MindsetChallenge({ invitationId, challengeId, config }: Props) {
  const navigate = useNavigate();
  const draft = useMindsetDraft(invitationId);
  const [step, setStep] = useState<Step>('intro');
  const [payload, setPayload] = useState<MindsetPayload>(EMPTY_MINDSET_PAYLOAD);
  const [submitting, setSubmitting] = useState(false);

  const guideName = config.guide?.name || 'Aria';
  const intro = config.guide?.intro || 'Ciao, sono qui per accompagnarti. Rispondi di getto: nessuna risposta è giusta o sbagliata.';
  const instinctCards = config.instinct_cards || [];
  const dayItems = config.day?.items || [];
  const gestures: DayGesture[] = config.day?.gestures || [];
  const clock = config.day?.clock || '09:00';

  // Hydrate from draft when loaded
  useEffect(() => {
    if (draft.loading) return;
    setPayload(draft.initialPayload);
    if (draft.status === 'submitted') {
      setStep('resolve');
      return;
    }
    // Pick the furthest step the draft already reached
    const p = draft.initialPayload;
    if (p.debrief.length > 0) setStep('resolve');
    else if (p.day_log.length >= dayItems.length && dayItems.length > 0) setStep('debrief');
    else if (p.instinct_choices.length >= instinctCards.length && instinctCards.length > 0) setStep('day');
    else if (p.instinct_choices.length > 0) setStep('instinct');
    // else keep 'intro'
  }, [draft.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next: MindsetPayload) => {
    setPayload(next);
    draft.saveDraftDebounced(next);
  };

  const focusItem: DayItem | null = useMemo(() => {
    const id = config.guide?.debrief_focus;
    if (!id) return dayItems[0] || null;
    return dayItems.find((i) => i.id === id) || dayItems[0] || null;
  }, [config.guide?.debrief_focus, dayItems]);

  const chosenGesture: DayGesture | null = useMemo(() => {
    if (!focusItem) return null;
    const log = payload.day_log.find((l) => l.item_id === focusItem.id);
    if (!log) return null;
    return gestures.find((g) => g.id === log.gesture) || null;
  }, [focusItem, payload.day_log, gestures]);

  const handleInstinctProgress = (choices: InstinctChoice[], litFacets: string[]) => {
    update({ ...payload, instinct_choices: choices, lit_facets: litFacets });
  };
  const handleInstinctComplete = (choices: InstinctChoice[], litFacets: string[]) => {
    update({ ...payload, instinct_choices: choices, lit_facets: litFacets });
    setStep('day');
  };

  const handleDayProgress = (log: DayLogEntry[]) => {
    update({ ...payload, day_log: log });
  };
  const handleDayComplete = (log: DayLogEntry[]) => {
    update({ ...payload, day_log: log });
    setStep('debrief');
  };

  const handleDebriefComplete = async (debrief: DebriefEntry[]) => {
    const finalPayload: MindsetPayload = { ...payload, debrief };
    setPayload(finalPayload);
    setSubmitting(true);
    try {
      await draft.submit(finalPayload, challengeId);
      setStep('resolve');
    } catch (e: any) {
      console.error('[mindset] submit error', e);
      toast({
        title: 'Errore',
        description: e?.message || 'Non sono riuscito a salvare. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {step === 'intro' && (
        <MindsetIntro guideName={guideName} intro={intro} onStart={() => setStep('instinct')} />
      )}

      {step === 'instinct' && instinctCards.length > 0 && (
        <InstinctCards
          cards={instinctCards}
          onProgress={handleInstinctProgress}
          onComplete={handleInstinctComplete}
        />
      )}

      {step === 'day' && dayItems.length > 0 && (
        <LivingDay
          clock={clock}
          items={dayItems}
          gestures={gestures}
          onProgress={handleDayProgress}
          onComplete={handleDayComplete}
        />
      )}

      {step === 'debrief' && (
        <>
          <GuideDebrief
            guideName={guideName}
            focusItem={focusItem}
            chosenGesture={chosenGesture}
            onComplete={handleDebriefComplete}
          />
          {submitting && (
            <p className="text-center text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
              Salvataggio…
            </p>
          )}
        </>
      )}

      {step === 'resolve' && (
        <ResolveScreen
          guideName={guideName}
          litFacets={payload.lit_facets}
          resolveLine={config.guide?.resolve_line}
          onBack={() => navigate('/profile')}
        />
      )}
    </div>
  );
}
