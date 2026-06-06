import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sparkles, User } from 'lucide-react';
import type { L2SimulationConfig } from './types';

type Props = {
  simulation: L2SimulationConfig;
  /** Optional context band (RAL / role) reused from parent. */
  contextSlot?: React.ReactNode;
  onStart: () => void;
};

export function L2Intro({ simulation, contextSlot, onStart }: Props) {
  const { t } = useTranslation();
  const name = simulation.counterpart?.name || 'Counterpart';
  const role = simulation.counterpart?.role || '';
  const scenario = typeof simulation.scenario === 'string' ? simulation.scenario : '';

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-10 space-y-6">
        {/* Header — frame as a conversation, not a test */}
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              {t('candidate.l2_conversation.intro_kicker', 'Una conversazione, non un test')}
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              {t('candidate.l2_conversation.intro_title', 'Parli con {{name}}', { name })}
            </h2>
          </div>
        </div>

        {/* Counterpart card */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{t('candidate.l2_conversation.counterpart_label', 'Il tuo interlocutore')}</span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {t('candidate.l2_conversation.blind_badge', 'Valutazione alla cieca')}
            </Badge>
          </div>
          <p className="text-base font-semibold text-foreground">{name}</p>
          {role && <p className="text-sm text-muted-foreground leading-relaxed">{role}</p>}
        </div>

        {/* Scenario — the full scene-set string */}
        {scenario && (
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('candidate.l2_conversation.scenario_label', 'La situazione')}
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{scenario}</p>
          </div>
        )}

        {/* Optional RAL / role context reused from parent flow */}
        {contextSlot}

        {/* Qualitative framing — no score language */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">
            {t(
              'candidate.l2_conversation.frame_line',
              'Non è un test con punteggio — è un confronto. Il tuo XIMAtar si affina ascoltandoti.'
            )}
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={onStart} size="lg">
            {t('candidate.l2_conversation.intro_cta', 'Inizia la conversazione')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
