import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { DayGesture, DayItem, DebriefEntry } from './types';
import { VoiceDictateButton } from '@/components/candidate/audio/VoiceDictateButton';
import { AriaSpeakButton } from '@/components/candidate/audio/AriaSpeakButton';

type Props = {
  guideName: string;
  focusItem: DayItem | null;
  chosenGesture: DayGesture | null;
  onComplete: (debrief: DebriefEntry[]) => void;
};

export function GuideDebrief({ guideName, focusItem, chosenGesture, onComplete }: Props) {
  const [answer, setAnswer] = useState('');
  const [ack, setAck] = useState(false);

  const question = focusItem && chosenGesture
    ? `Su «${focusItem.source}» hai scelto ${chosenGesture.emoji} ${chosenGesture.label}. Cosa ti ha guidato?`
    : `Tornando alla tua giornata, cosa ti ha guidato di più nelle scelte?`;

  const canSubmit = answer.trim().length >= 20 && !ack;

  const handleSubmit = () => {
    setAck(true);
    const entry: DebriefEntry = { q: question, a: answer.trim() };
    setTimeout(() => onComplete([entry]), 1100);
  };

  const appendDictated = (text: string) => {
    setAnswer((prev) => (prev.trim().length > 0 ? `${prev} ${text}` : text));
  };

  return (
    <Card>
      <CardContent className="py-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{guideName}</p>
              <AriaSpeakButton text={question} messageKey={`debrief:${focusItem?.id ?? 'q'}`} />
            </div>
            <p className="text-foreground leading-relaxed">{question}</p>
          </div>
        </div>

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Una o due frasi, di getto…"
          rows={3}
          disabled={ack}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">{answer.trim().length} caratteri · min. 20</p>
          <VoiceDictateButton onAppend={appendDictated} disabled={ack} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          L'audio viene trascritto e poi eliminato — conserviamo solo le parole.
        </p>

        {!ack ? (
          <Button onClick={handleSubmit} disabled={!canSubmit}>Continua</Button>
        ) : (
          <p className="text-sm text-primary">Grazie, lo annoto.</p>
        )}
      </CardContent>
    </Card>
  );
}
