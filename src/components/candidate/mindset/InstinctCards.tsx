import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstinctCard, InstinctChoice } from './types';

type Props = {
  cards: InstinctCard[];
  onComplete: (choices: InstinctChoice[], litFacets: string[]) => void;
  onProgress: (choices: InstinctChoice[], litFacets: string[]) => void;
};

export function InstinctCards({ cards, onComplete, onProgress }: Props) {
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<InstinctChoice[]>([]);
  const [litFacets, setLitFacets] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [barKey, setBarKey] = useState(0);

  const card = cards[index];

  useEffect(() => {
    setBarKey((k) => k + 1);
  }, [index]);

  const pick = (choice: 'a' | 'b') => {
    if (!card) return;
    const facet = choice === 'a' ? card.a.facet : card.b.facet;
    const next: InstinctChoice = { card_id: card.id, choice, facet };
    const nextChoices = [...choices, next];
    const nextLit = litFacets.includes(facet) ? litFacets : [...litFacets, facet];
    setChoices(nextChoices);
    setLitFacets(nextLit);
    setFlash(facet);
    onProgress(nextChoices, nextLit);
    setTimeout(() => {
      setFlash(null);
      if (index + 1 >= cards.length) {
        onComplete(nextChoices, nextLit);
      } else {
        setIndex(index + 1);
      }
    }, 900);
  };

  const progressPct = useMemo(
    () => Math.round((index / Math.max(cards.length, 1)) * 100),
    [index, cards.length]
  );

  if (!card) return null;

  return (
    <Card>
      <CardContent className="py-8 space-y-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Istinto {index + 1} di {cards.length}</span>
          <span>{progressPct}%</span>
        </div>

        {/* Urgency bar - non-blocking visual */}
        <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
          <div
            key={barKey}
            className="h-full bg-primary/60 origin-left animate-[mindset-urgency_6s_linear_forwards]"
          />
        </div>

        <h3 className="text-xl font-semibold text-foreground leading-snug">{card.prompt}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto min-h-[120px] py-6 px-5 text-left whitespace-normal text-base hover:bg-primary/5 hover:border-primary/50 transition-all"
            onClick={() => pick('a')}
            disabled={!!flash}
          >
            {card.a.label}
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-[120px] py-6 px-5 text-left whitespace-normal text-base hover:bg-primary/5 hover:border-primary/50 transition-all"
            onClick={() => pick('b')}
            disabled={!!flash}
          >
            {card.b.label}
          </Button>
        </div>

        {flash && (
          <div className="flex justify-center">
            <Badge className="bg-primary/15 text-primary border-primary/30 animate-in fade-in zoom-in">
              ✨ Sfaccettatura accesa: {flash}
            </Badge>
          </div>
        )}

        {litFacets.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            {litFacets.map((f) => (
              <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
            ))}
          </div>
        )}
      </CardContent>

      <style>{`
        @keyframes mindset-urgency {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </Card>
  );
}
