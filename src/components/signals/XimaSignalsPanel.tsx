/**
 * XIMA Signals Panel - Business view for reviewing candidate signals
 * Descriptive, not evaluative. Patterns, not scores.
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass, Lightbulb, ArrowRightLeft } from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { computeQualitativeSignals, QualitativeSignal } from '@/lib/signals/qualitativeSignals';

interface XimaSignalsPanelProps {
  signals: SignalsPayload;
  className?: string;
}

function ConfidenceBadge({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const { t } = useTranslation();
  
  const styles = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-secondary text-secondary-foreground',
    high: 'bg-primary/10 text-primary',
  };
  
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[confidence]}`}>
      {t(`signals.confidence_${confidence}`)}
    </Badge>
  );
}

function SignalCard({ signal }: { signal: QualitativeSignal }) {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          {t(signal.label)}
        </span>
        <ConfidenceBadge confidence={signal.confidence} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {signal.interpretation}
      </p>
    </div>
  );
}

export function XimaSignalsPanel({ signals, className = '' }: XimaSignalsPanelProps) {
  const { t } = useTranslation();
  const qualitative = computeQualitativeSignals(signals);
  
  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          {t('signals.panel_title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {t('signals.panel_description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signal Cards Grid */}
        <div className="grid gap-3">
          {qualitative.signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
        
        {/* Contextual Summary */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('signals.contextual_summary')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            {qualitative.contextualSummary}
          </p>
        </div>
        
        {/* Observed Tradeoffs */}
        {qualitative.observedTradeoffs.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('signals.observed_tradeoffs')}
              </span>
            </div>
            <ul className="space-y-1">
              {qualitative.observedTradeoffs.map((tradeoff, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary">•</span>
                  {tradeoff}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
