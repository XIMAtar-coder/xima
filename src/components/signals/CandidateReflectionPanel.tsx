/**
 * Candidate Reflection Panel - Self-reflection view after challenge submission
 * Reframed signals for candidate's personal insight
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageCircle } from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { getCandidateReflectionSignals, QualitativeSignal } from '@/lib/signals/qualitativeSignals';

interface CandidateReflectionPanelProps {
  signals: SignalsPayload;
  className?: string;
}

function ReflectionSignalCard({ signal }: { signal: QualitativeSignal }) {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {t(signal.label)}
      </span>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {signal.interpretation}
      </p>
    </div>
  );
}

export function CandidateReflectionPanel({ signals, className = '' }: CandidateReflectionPanelProps) {
  const { t } = useTranslation();
  const reflection = getCandidateReflectionSignals(signals);
  
  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          {t('signals.reflection_title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {t('signals.reflection_description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contextual Summary - Primary */}
        <div className="p-4 rounded-lg bg-background border border-primary/20">
          <p className="text-sm text-foreground leading-relaxed">
            {reflection.contextualSummary}
          </p>
        </div>
        
        {/* Signal Details */}
        <div className="grid gap-2">
          {reflection.signals.slice(0, 3).map((signal) => (
            <ReflectionSignalCard key={signal.id} signal={signal} />
          ))}
        </div>
        
        {/* Reflection Prompt */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
            <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                {t('signals.reflection_prompt')}
              </p>
              <p className="text-[11px] text-muted-foreground italic">
                {t('signals.reflection_prompt_helper')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
