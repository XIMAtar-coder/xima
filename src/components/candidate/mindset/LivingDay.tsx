import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { DayGesture, DayItem, DayLogEntry } from './types';

type Props = {
  clock: string;
  items: DayItem[];
  gestures: DayGesture[];
  onComplete: (log: DayLogEntry[]) => void;
  onProgress: (log: DayLogEntry[]) => void;
};

export function LivingDay({ clock, items, gestures, onComplete, onProgress }: Props) {
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<DayLogEntry[]>([]);

  const item = items[index];
  if (!item) return null;

  const pick = (gesture: DayGesture) => {
    const next: DayLogEntry = { item_id: item.id, gesture: gesture.id };
    const nextLog = [...log, next];
    setLog(nextLog);
    onProgress(nextLog);
    if (index + 1 >= items.length) {
      onComplete(nextLog);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <Card>
      <CardContent className="py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Lunedì</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-lg font-semibold text-foreground tabular-nums">{clock}</span>
            </div>
          </div>
          <Badge variant="outline">{index + 1} / {items.length}</Badge>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/60 p-5 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.source}</p>
          <p className="text-foreground leading-relaxed whitespace-pre-line">{item.body}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Come reagisci?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {gestures.map((g) => (
              <Button
                key={g.id}
                variant="outline"
                onClick={() => pick(g)}
                className="h-auto py-4 px-4 justify-start text-left whitespace-normal hover:bg-primary/5 hover:border-primary/50"
              >
                <span className="text-xl mr-3" aria-hidden>{g.emoji}</span>
                <span className="text-sm">{g.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
