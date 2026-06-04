import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Sparkles } from 'lucide-react';

type Props = {
  guideName: string;
  litFacets: string[];
  resolveLine?: string;
  onBack: () => void;
};

export function ResolveScreen({ guideName, litFacets, resolveLine, onBack }: Props) {
  const line =
    resolveLine ||
    'Ho visto come reagisci. Ora il tuo XIMAtar sta prendendo forma — ogni sfaccettatura accesa è un pezzo di te.';

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{guideName}</p>
            <h2 className="text-xl font-semibold text-foreground">Resoconto</h2>
          </div>
        </div>

        <p className="text-foreground leading-relaxed">{line}</p>

        {litFacets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Sfaccettature accese</p>
            <div className="flex flex-wrap gap-2">
              {litFacets.map((f) => (
                <Badge key={f} className="bg-primary/15 text-primary border-primary/30">
                  ✨ {f}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/60 bg-card/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>XIMAtar in fase di affinamento</span>
          </div>
          <Progress value={33} className="h-2" />
          <p className="text-xs text-muted-foreground">L1 ✓ — i prossimi livelli si sbloccheranno quando l'azienda riguarderà il tuo profilo.</p>
        </div>

        <div className="pt-2">
          <Button onClick={onBack} variant="outline">Torna al profilo</Button>
        </div>
      </CardContent>
    </Card>
  );
}
