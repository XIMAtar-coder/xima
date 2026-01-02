/**
 * XIMA Signals Interpretation Panel
 * Decision intelligence for business review
 * Qualitative, not evaluative. Patterns, not scores.
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Target, 
  ArrowRightLeft, 
  Anchor, 
  Rocket,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { getFullInterpretation, SignalInterpretation, CompanyContext } from '@/lib/signals/interpretSignals';

interface XimaInterpretationPanelProps {
  signals: SignalsPayload;
  level?: 1 | 2;
  context?: CompanyContext;
  className?: string;
}

const signalIcons: Record<string, React.ReactNode> = {
  decision_structure: <Brain className="h-4 w-4" />,
  ownership_agency: <Target className="h-4 w-4" />,
  tradeoff_awareness: <ArrowRightLeft className="h-4 w-4" />,
  context_fidelity: <Anchor className="h-4 w-4" />,
  execution_readiness: <Rocket className="h-4 w-4" />,
};

function StatusIndicator({ status }: { status: 'clear' | 'partial' | 'fragmented' }) {
  const { t } = useTranslation();
  
  const configs = {
    clear: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
      label: t('interpretation.status_clear'),
    },
    partial: {
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      label: t('interpretation.status_partial'),
    },
    fragmented: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-muted text-muted-foreground border-border',
      label: t('interpretation.status_fragmented'),
    },
  };
  
  const config = configs[status];
  
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function ConfidenceDot({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: 'bg-muted-foreground/30',
    medium: 'bg-amber-500',
    high: 'bg-green-500',
  };
  
  return (
    <span 
      className={`inline-block h-2 w-2 rounded-full ${colors[confidence]}`}
      title={`Confidence: ${confidence}`}
    />
  );
}

function SignalRow({ signal }: { signal: SignalInterpretation }) {
  const { t } = useTranslation();
  
  return (
    <div className="py-3 border-b border-border/50 last:border-0 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-primary">
            {signalIcons[signal.id]}
          </span>
          <span className="text-sm font-medium">
            {t(signal.label)}
          </span>
          <ConfidenceDot confidence={signal.confidence} />
        </div>
        <StatusIndicator status={signal.status} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
        {signal.explanation}
      </p>
      <p className="text-xs text-muted-foreground/70 italic pl-6">
        {signal.evidence}
      </p>
    </div>
  );
}

export function XimaInterpretationPanel({ 
  signals, 
  level = 1,
  context,
  className = '' 
}: XimaInterpretationPanelProps) {
  const { t } = useTranslation();
  const interpretation = getFullInterpretation(signals, level);
  
  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          {t('interpretation.panel_title')}
          <Badge variant="outline" className="ml-auto text-[10px]">
            {t(`interpretation.level_${level}`)}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('interpretation.panel_description')}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/30">
          {interpretation.signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}