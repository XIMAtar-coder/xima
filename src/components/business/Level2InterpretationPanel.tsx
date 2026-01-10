import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Wrench, 
  Scale, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  XCircle,
  Sparkles,
  Clock,
  Globe,
  RefreshCw,
} from 'lucide-react';
import type { Level2SignalsPayload } from '@/lib/signals/computeLevel2Signals';
import { useBusinessLocale } from '@/hooks/useBusinessLocale';

interface Level2InterpretationPanelProps {
  signals: Level2SignalsPayload;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

// Status to icon mapping
const StatusIcon = ({ status }: { status: 'clear' | 'partial' | 'fragmented' }) => {
  if (status === 'clear') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'partial') return <HelpCircle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
};

const StatusBadge = ({ status }: { status: 'clear' | 'partial' | 'fragmented' }) => {
  const { t } = useTranslation();
  
  const variants = {
    clear: 'bg-green-500/10 text-green-600 border-green-500/30',
    partial: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    fragmented: 'bg-red-400/10 text-red-500 border-red-400/30',
  };

  return (
    <Badge variant="outline" className={`text-xs ${variants[status]}`}>
      {t(`interpretation.status.${status}`)}
    </Badge>
  );
};

/**
 * Displays AI-generated interpretation for Level 2 hard skill submissions.
 * Shows qualitative assessments - NO SCORES.
 * Includes language mismatch detection with regenerate option.
 */
export function Level2InterpretationPanel({ signals, onRegenerate, isRegenerating }: Level2InterpretationPanelProps) {
  const { t } = useTranslation();
  const { locale } = useBusinessLocale();

  // Language names for display
  const languageNames: Record<string, string> = {
    en: 'English',
    it: 'Italiano',
    es: 'Español',
  };

  // Check if content was generated in a different language
  const generatedLocale = signals.generatedLocale || 'en';
  const hasLanguageMismatch = generatedLocale !== locale;

  const signalItems = [
    {
      id: 'hardSkillClarity',
      icon: Target,
      label: t('business.level2_interpretation.hard_skill_clarity'),
      status: signals.hardSkillClarity,
      explanation: signals.hardSkillExplanation,
    },
    {
      id: 'toolMethodMaturity',
      icon: Wrench,
      label: t('business.level2_interpretation.tool_method_maturity'),
      status: signals.toolMethodMaturity,
      explanation: signals.toolMethodExplanation,
    },
    {
      id: 'decisionQuality',
      icon: Scale,
      label: t('business.level2_interpretation.decision_quality'),
      status: signals.decisionQualityUnderConstraints,
      explanation: signals.decisionExplanation,
    },
    {
      id: 'riskAwareness',
      icon: AlertTriangle,
      label: t('business.level2_interpretation.risk_awareness'),
      status: signals.riskAwareness,
      explanation: signals.riskExplanation,
    },
    {
      id: 'executionRealism',
      icon: CheckCircle,
      label: t('business.level2_interpretation.execution_realism'),
      status: signals.executionRealism,
      explanation: signals.executionExplanation,
    },
  ];

  const readinessColors = {
    ready: 'bg-green-500/10 text-green-600 border-green-500/30',
    needs_clarification: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    insufficient: 'bg-red-400/10 text-red-500 border-red-400/30',
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return null;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('business.level2_interpretation.title')}
          </CardTitle>
          <Badge variant="outline" className={readinessColors[signals.overallReadiness]}>
            {t(`business.level2_interpretation.readiness.${signals.overallReadiness}`)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground mt-1">
            {t('business.level2_interpretation.subtitle')}
          </p>
          {signals.generatedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('business.level2_interpretation.generated_at')}: {formatDate(signals.generatedAt)}
            </span>
          )}
        </div>
        
        {/* Language mismatch warning */}
        {hasLanguageMismatch && onRegenerate && (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mt-2">
            <div className="flex items-center gap-2 text-amber-600 text-xs">
              <Globe className="h-4 w-4" />
              <span>{t('business.level2_interpretation.language_mismatch')}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {t('business.level2_interpretation.regenerate_in_language', { language: languageNames[locale] })}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p>{signals.summary}</p>
        </div>

        {/* Signal Items */}
        <div className="space-y-3">
          {signalItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{item.label}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{item.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flags */}
        {signals.flags.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('business.level2_interpretation.observed_patterns')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {signals.flags.map(flag => (
                <Badge key={flag} variant="secondary" className="text-[10px]">
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground italic">
          {t('business.level2_interpretation.footer_note')}
        </p>
      </CardFooter>
    </Card>
  );
}
