/**
 * Decision Confidence Panel - What's clear, uncertain, and what to test next
 * Helps businesses understand their signal strength for decision-making
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, HelpCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { computeQualitativeSignals } from '@/lib/signals/qualitativeSignals';

interface DecisionConfidencePanelProps {
  signals: SignalsPayload;
  className?: string;
}

interface ConfidenceAnalysis {
  clear: string[];
  uncertain: string[];
  nextSteps: {
    type: 'followup' | 'next_level' | 'stop';
    suggestion: string;
    reason: string;
  };
}

/**
 * Analyze signals to determine what's clear vs uncertain
 */
function analyzeConfidence(signals: SignalsPayload): ConfidenceAnalysis {
  const qualitative = computeQualitativeSignals(signals);
  const { framing, execution_bias, impact_thinking, decision_quality, flags, confidence, overall } = signals;
  
  const clear: string[] = [];
  const uncertain: string[] = [];
  
  // Analyze each dimension
  if (framing >= 65) {
    clear.push('Strong problem structuring ability');
  } else if (framing <= 40) {
    uncertain.push('Problem structuring approach needs more signal');
  }
  
  if (execution_bias >= 65) {
    clear.push('Clear bias toward action and ownership');
  } else if (execution_bias <= 35) {
    uncertain.push('Initiative and ownership style unclear');
  }
  
  if (impact_thinking >= 60) {
    clear.push('Outcome-oriented thinking');
  } else if (impact_thinking <= 40) {
    uncertain.push('Impact orientation needs more context');
  }
  
  if (decision_quality >= 65) {
    clear.push('Sound reasoning and prioritization logic');
  } else if (decision_quality <= 40) {
    uncertain.push('Decision-making patterns require more data');
  }
  
  // Check flags for additional clarity
  if (flags.includes('uses_metrics')) {
    clear.push('Quantitative thinking demonstrated');
  }
  if (flags.includes('clear_tradeoffs')) {
    clear.push('Explicit trade-off reasoning');
  }
  if (flags.includes('bias_to_action')) {
    clear.push('Strong execution orientation');
  }
  
  // Check for uncertainty indicators
  if (flags.includes('vague_language')) {
    uncertain.push('Communication specificity could improve');
  }
  if (flags.includes('weak_assumptions')) {
    uncertain.push('Assumption-making approach unclear');
  }
  if (flags.includes('short_approach')) {
    uncertain.push('Depth of thinking needs more evidence');
  }
  
  // Always add some uncertainty for common areas
  if (uncertain.length === 0) {
    uncertain.push('Technical execution depth');
    uncertain.push('Collaboration under pressure');
  }
  if (uncertain.length === 1) {
    uncertain.push('Long-term strategic thinking');
  }
  
  // Determine next step recommendation
  let nextSteps: ConfidenceAnalysis['nextSteps'];
  
  if (overall >= 65 && confidence === 'high') {
    nextSteps = {
      type: 'next_level',
      suggestion: 'Proceed to next challenge level',
      reason: 'Strong signals across dimensions with high confidence'
    };
  } else if (overall >= 50 && (uncertain.length >= 2 || confidence !== 'high')) {
    nextSteps = {
      type: 'followup',
      suggestion: 'Request clarification on specific areas',
      reason: 'Good potential but some areas need more signal'
    };
  } else if (overall < 45 && confidence === 'low') {
    nextSteps = {
      type: 'stop',
      suggestion: 'Consider closing this application',
      reason: 'Limited signals suggest potential misalignment'
    };
  } else {
    nextSteps = {
      type: 'followup',
      suggestion: 'Ask a targeted follow-up question',
      reason: 'Additional context would help decision quality'
    };
  }
  
  return { clear, uncertain, nextSteps };
}

export function DecisionConfidencePanel({ signals, className = '' }: DecisionConfidencePanelProps) {
  const { t } = useTranslation();
  const analysis = analyzeConfidence(signals);
  
  const nextStepIcon = {
    followup: <HelpCircle className="h-3.5 w-3.5" />,
    next_level: <ArrowRight className="h-3.5 w-3.5" />,
    stop: <CheckCircle className="h-3.5 w-3.5" />,
  };
  
  const nextStepColor = {
    followup: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    next_level: 'bg-green-500/10 text-green-600 border-green-500/30',
    stop: 'bg-muted text-muted-foreground border-border',
  };
  
  return (
    <Card className={`border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {t('signals.decision_confidence_title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('signals.decision_confidence_description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What's Clear */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-semibold text-green-600">
              {t('signals.whats_clear')}
            </span>
          </div>
          <ul className="space-y-1.5">
            {analysis.clear.slice(0, 4).map((item, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* What's Uncertain */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600">
              {t('signals.whats_uncertain')}
            </span>
          </div>
          <ul className="space-y-1.5">
            {analysis.uncertain.slice(0, 3).map((item, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* What to Test Next */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {t('signals.what_to_test_next')}
            </span>
          </div>
          <div className={`p-3 rounded-lg border ${nextStepColor[analysis.nextSteps.type]}`}>
            <div className="flex items-center gap-2 mb-1">
              {nextStepIcon[analysis.nextSteps.type]}
              <span className="text-sm font-medium">
                {analysis.nextSteps.suggestion}
              </span>
            </div>
            <p className="text-xs opacity-80">
              {analysis.nextSteps.reason}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
