import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

type Props = {
  guideName: string;
  intro: string;
  onStart: () => void;
};

export function MindsetIntro({ guideName, intro, onStart }: Props) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">La tua guida</p>
            <h2 className="text-xl font-semibold text-foreground">{guideName}</h2>
          </div>
        </div>
        <p className="text-foreground leading-relaxed whitespace-pre-line">{intro}</p>
        <p className="text-sm text-muted-foreground italic">
          Non ci sono risposte giuste. Segui l'istinto — lo useremo per accendere le tue sfaccettature.
        </p>
        <div className="pt-2">
          <Button onClick={onStart} size="lg">Inizia</Button>
        </div>
      </CardContent>
    </Card>
  );
}
