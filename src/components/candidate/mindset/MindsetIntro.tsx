import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Building2, Target, Euro, TrendingUp } from 'lucide-react';
import { AriaSpeakButton } from '@/components/candidate/audio/AriaSpeakButton';
import type { IntroContext } from './types';
import { labelForCcnl } from '@/lib/business/ccnl';

type Props = {
  guideName: string;
  intro: string;
  introContext?: IntroContext;
  onStart: () => void;
};

function formatRal(min?: number | null, max?: number | null, currency = 'EUR'): string | null {
  if (!min && !max) return null;
  const sym = currency === 'EUR' ? '€' : currency + ' ';
  const fmt = (n: number) => n.toLocaleString('it-IT');
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
  if (min) return `da ${sym}${fmt(min)}`;
  return `fino a ${sym}${fmt(max!)}`;
}

export function MindsetIntro({ guideName, intro, introContext, onStart }: Props) {
  const ral = formatRal(introContext?.compensation?.ral_min, introContext?.compensation?.ral_max, introContext?.compensation?.currency);
  const ccnl = labelForCcnl(introContext?.compensation?.ccnl);
  const hasComp = ral || (introContext?.compensation?.ccnl ?? null);
  const growthLine =
    introContext?.growth_line ||
    'Completare questa sfida arricchisce il tuo XIMAtar e rende il tuo profilo più rilevante per le aziende.';

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-10 space-y-6">
        {/* Aria's greeting */}
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">La tua guida</p>
              <h2 className="text-xl font-semibold text-foreground">{guideName}</h2>
              <AriaSpeakButton text={intro} messageKey="intro-greeting" />
            </div>
            <p className="text-foreground leading-relaxed whitespace-pre-line mt-2">{intro}</p>
            <p className="text-xs text-muted-foreground italic mt-2">
              Non ci sono risposte giuste. Segui l'istinto — lo useremo per accendere le tue sfaccettature.
            </p>
          </div>
        </div>

        {/* Company context — sector only, NEVER the name */}
        {introContext?.company_descriptor && (
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Contesto azienda</span>
              <Badge variant="outline" className="ml-auto text-[10px]">Valutazione alla cieca</Badge>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{introContext.company_descriptor}</p>
          </div>
        )}

        {/* Role */}
        {(introContext?.role_title || introContext?.role_summary) && (
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>L'obiettivo</span>
            </div>
            {introContext.role_title && (
              <p className="text-base font-semibold text-foreground">{introContext.role_title}</p>
            )}
            {introContext.role_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">{introContext.role_summary}</p>
            )}
          </div>
        )}

        {/* Pay transparency */}
        {hasComp && (
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>Trasparenza retributiva</span>
            </div>
            <p className="text-sm text-foreground">
              {ral && <span className="font-semibold">RAL {ral}</span>}
              {ral && introContext?.compensation?.ccnl && <span className="text-muted-foreground"> · </span>}
              {introContext?.compensation?.ccnl && <span>CCNL {ccnl}</span>}
            </p>
          </div>
        )}

        {/* Qualitative growth incentive — NO numbers */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">{growthLine}</p>
        </div>

        <div className="pt-2">
          <Button onClick={onStart} size="lg">Inizia</Button>
        </div>
      </CardContent>
    </Card>
  );
}
