/**
 * XIMA Premium: Consistency Guard Panel
 * Shows consistency checks, potential risks, and suggested next questions
 * Computed from existing signals + submission
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, AlertTriangle, HelpCircle, 
  CheckCircle2, XCircle, Crown, Lock,
  Lightbulb
} from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';

interface ConsistencyGuardPanelProps {
  signals: SignalsPayload | null;
  submissionText?: string;
  isPremium?: boolean;
  className?: string;
}

interface ConsistencyAnalysis {
  checks: Array<{
    label: string;
    status: 'pass' | 'flag' | 'warn';
    detail: string;
  }>;
  risks: string[];
  suggestedQuestions: string[];
}

/**
 * Analyze submission signals for consistency patterns and risks
 */
function analyzeConsistency(signals: SignalsPayload | null): ConsistencyAnalysis {
  if (!signals) {
    return { checks: [], risks: [], suggestedQuestions: [] };
  }

  const checks: ConsistencyAnalysis['checks'] = [];
  const risks: string[] = [];
  const suggestedQuestions: string[] = [];

  const { framing, decision_quality, execution_bias, impact_thinking, confidence, flags, overall } = signals;

  // Check 1: Framing vs Decision alignment
  const framingDecisionGap = Math.abs(framing - decision_quality);
  if (framingDecisionGap < 15) {
    checks.push({
      label: 'premium.guard.framing_decision',
      status: 'pass',
      detail: 'premium.guard.framing_decision_pass',
    });
  } else if (framingDecisionGap < 30) {
    checks.push({
      label: 'premium.guard.framing_decision',
      status: 'warn',
      detail: 'premium.guard.framing_decision_warn',
    });
  } else {
    checks.push({
      label: 'premium.guard.framing_decision',
      status: 'flag',
      detail: 'premium.guard.framing_decision_flag',
    });
    risks.push('premium.guard.risk_inconsistent_reasoning');
  }

  // Check 2: Execution vs Impact balance
  const executionImpactGap = Math.abs(execution_bias - impact_thinking);
  if (executionImpactGap < 20) {
    checks.push({
      label: 'premium.guard.execution_impact',
      status: 'pass',
      detail: 'premium.guard.execution_impact_pass',
    });
  } else {
    checks.push({
      label: 'premium.guard.execution_impact',
      status: execution_bias > impact_thinking ? 'warn' : 'flag',
      detail: execution_bias > impact_thinking 
        ? 'premium.guard.execution_impact_tactical'
        : 'premium.guard.execution_impact_strategic',
    });
    if (execution_bias > impact_thinking + 25) {
      risks.push('premium.guard.risk_tactical_bias');
    }
  }

  // Check 3: Confidence calibration
  if (confidence === 'high' && overall < 55) {
    checks.push({
      label: 'premium.guard.confidence_calibration',
      status: 'flag',
      detail: 'premium.guard.confidence_overconfident',
    });
    risks.push('premium.guard.risk_overconfidence');
    suggestedQuestions.push('premium.guard.question_confidence');
  } else if (confidence === 'low' && overall >= 65) {
    checks.push({
      label: 'premium.guard.confidence_calibration',
      status: 'warn',
      detail: 'premium.guard.confidence_underconfident',
    });
    suggestedQuestions.push('premium.guard.question_self_doubt');
  } else {
    checks.push({
      label: 'premium.guard.confidence_calibration',
      status: 'pass',
      detail: 'premium.guard.confidence_calibrated',
    });
  }

  // Check 4: Flag patterns
  if (flags.includes('vague_framing') && flags.includes('no_tradeoffs')) {
    checks.push({
      label: 'premium.guard.depth_check',
      status: 'flag',
      detail: 'premium.guard.depth_shallow',
    });
    risks.push('premium.guard.risk_surface_level');
    suggestedQuestions.push('premium.guard.question_depth');
  } else if (flags.includes('clear_tradeoffs')) {
    checks.push({
      label: 'premium.guard.depth_check',
      status: 'pass',
      detail: 'premium.guard.depth_good',
    });
  }

  // Add general suggested questions based on gaps
  if (framing < 50) {
    suggestedQuestions.push('premium.guard.question_framing');
  }
  if (impact_thinking < 50) {
    suggestedQuestions.push('premium.guard.question_impact');
  }

  // Limit to top 3 questions
  return {
    checks,
    risks: risks.slice(0, 3),
    suggestedQuestions: suggestedQuestions.slice(0, 3),
  };
}

function LockedPanel() {
  const { t } = useTranslation();
  
  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-[2px] flex items-center justify-center z-10">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 text-amber-500/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">{t('premium.guard.locked_title')}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          >
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            {t('signals.premium.unlock_cta')}
          </Button>
        </div>
      </div>
      <CardHeader className="pb-3 opacity-30">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t('premium.guard.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 opacity-30">
        <div className="h-10 bg-muted/50 rounded blur-[2px]" />
        <div className="h-10 bg-muted/50 rounded blur-[2px]" />
        <div className="h-10 bg-muted/50 rounded blur-[2px]" />
      </CardContent>
    </Card>
  );
}

export function ConsistencyGuardPanel({
  signals,
  isPremium = false,
  className = '',
}: ConsistencyGuardPanelProps) {
  const { t } = useTranslation();

  if (!isPremium) {
    return <LockedPanel />;
  }

  const analysis = analyzeConsistency(signals);

  if (analysis.checks.length === 0) {
    return null;
  }

  const statusIcons = {
    pass: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    flag: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  };

  const statusColors = {
    pass: 'border-green-500/30 bg-green-500/5',
    warn: 'border-amber-500/30 bg-amber-500/5',
    flag: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('premium.guard.title')}
          </CardTitle>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
            XIMA Premium
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('premium.guard.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consistency Checks */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('premium.guard.consistency_checks')}
          </h4>
          {analysis.checks.map((check, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg border ${statusColors[check.status]}`}
            >
              <div className="flex items-start gap-2">
                {statusIcons[check.status]}
                <div className="flex-1">
                  <p className="text-xs font-medium">{t(check.label)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t(check.detail)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Potential Risks */}
        {analysis.risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              {t('premium.guard.potential_risks')}
            </h4>
            <ul className="space-y-1.5">
              {analysis.risks.map((risk, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {t(risk)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Next Questions */}
        {analysis.suggestedQuestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3" />
              {t('premium.guard.suggested_questions')}
            </h4>
            <ul className="space-y-1.5">
              {analysis.suggestedQuestions.map((question, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2 p-2 rounded bg-muted/50">
                  <HelpCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{t(question)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
