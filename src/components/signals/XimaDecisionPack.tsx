/**
 * XIMA Decision Pack - Premium business layer for decision-ready insights
 * Consolidates L1 + L2 signals into executive summary format
 * Qualitative only - no scores, no rankings, no pass/fail
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  AlertTriangle, 
  ArrowRight, 
  Lock, 
  CheckCircle,
  HelpCircle,
  Target,
  Zap,
} from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { interpretSignals, CompanyContext } from '@/lib/signals/interpretSignals';
import { computeQualitativeSignals } from '@/lib/signals/qualitativeSignals';

interface ConsolidatedSignal {
  id: string;
  label: string;
  status: 'clear' | 'partial' | 'fragmented';
  confidence: 'low' | 'medium' | 'high';
  source: 'L1' | 'L2' | 'both';
}

interface RiskItem {
  risk: string;
  context: string;
}

interface XimaDecisionPackProps {
  signals: SignalsPayload;
  level2Payload?: Record<string, any> | null;
  companyContext?: CompanyContext;
  isPremium: boolean;
  className?: string;
}

function generateExecutiveSummary(
  signals: SignalsPayload, 
  level2Payload: Record<string, any> | null | undefined,
  context?: CompanyContext
): string {
  const insights = interpretSignals(signals, context);
  const qualitative = computeQualitativeSignals(signals);
  
  const roleTitle = context?.roleTitle || 'this role';
  const companyName = context?.companyName || 'the organization';
  
  // Build executive summary based on signal patterns
  const parts: string[] = [];
  
  // Opening statement based on decision profile
  parts.push(insights.decisionProfile);
  
  // Strengths summary
  if (insights.strengths.length > 0) {
    parts.push(`Key strengths include: ${insights.strengths.join('; ')}.`);
  }
  
  // Level 2 specific insights if available
  if (level2Payload) {
    const hasConcreteDeliverables = level2Payload.concrete_deliverables?.length > 50;
    const hasToolsMethods = level2Payload.tools_methods?.length > 30;
    
    if (hasConcreteDeliverables && hasToolsMethods) {
      parts.push(`The candidate has articulated concrete deliverables and specific tools/methods for ${roleTitle}.`);
    } else if (hasConcreteDeliverables) {
      parts.push(`Concrete deliverables are outlined, though methodology could be more specific.`);
    }
  }
  
  // Role fit hint
  parts.push(insights.roleFitHint);
  
  return parts.join(' ');
}

function consolidateSignals(
  signals: SignalsPayload,
  level2Payload?: Record<string, any> | null
): ConsolidatedSignal[] {
  const qualitative = computeQualitativeSignals(signals);
  const consolidated: ConsolidatedSignal[] = [];
  
  // Map qualitative signals to consolidated format
  qualitative.signals.forEach(sig => {
    const statusMap: Record<string, 'clear' | 'partial' | 'fragmented'> = {
      'strong': 'clear',
      'moderate': 'partial', 
      'developing': 'fragmented',
    };
    
    consolidated.push({
      id: sig.id,
      label: sig.label,
      status: statusMap[sig.interpretation.toLowerCase().includes('strong') ? 'strong' : 
               sig.interpretation.toLowerCase().includes('developing') ? 'developing' : 'moderate'] || 'partial',
      confidence: sig.confidence,
      source: level2Payload ? 'both' : 'L1',
    });
  });
  
  // Add L2-specific signals if available
  if (level2Payload) {
    const hasApproach = level2Payload.approach?.length > 50;
    const hasDeliverables = level2Payload.concrete_deliverables?.length > 50;
    const hasRisks = level2Payload.risks_failures?.length > 30;
    
    consolidated.push({
      id: 'technical_approach',
      label: 'decision_pack.signal_technical_approach',
      status: hasApproach ? 'clear' : 'partial',
      confidence: hasApproach ? 'high' : 'medium',
      source: 'L2',
    });
    
    consolidated.push({
      id: 'execution_clarity',
      label: 'decision_pack.signal_execution_clarity',
      status: hasDeliverables ? 'clear' : hasRisks ? 'partial' : 'fragmented',
      confidence: hasDeliverables && hasRisks ? 'high' : 'medium',
      source: 'L2',
    });
  }
  
  return consolidated;
}

function analyzeRiskRadar(
  signals: SignalsPayload,
  level2Payload?: Record<string, any> | null
): RiskItem[] {
  const risks: RiskItem[] = [];
  const insights = interpretSignals(signals);
  
  // Add risks from signal interpretation
  insights.risks.forEach(risk => {
    risks.push({
      risk,
      context: 'Identified from decision patterns in the submission.',
    });
  });
  
  // L2-specific risk analysis
  if (level2Payload) {
    if (!level2Payload.risks_failures || level2Payload.risks_failures.length < 30) {
      risks.push({
        risk: 'Limited risk anticipation in role-based response',
        context: 'Candidate may benefit from more explicit failure mode analysis.',
      });
    }
  }
  
  // Check for confidence mismatch
  if (signals.flags.includes('confidence_mismatch')) {
    risks.push({
      risk: 'Self-assessment may not align with demonstrated capability',
      context: 'Consider probing specific examples in follow-up.',
    });
  }
  
  return risks.slice(0, 3);
}

function getSuggestedNextAction(
  signals: SignalsPayload,
  level2Payload?: Record<string, any> | null
): { action: string; rationale: string } {
  const hasL2 = !!level2Payload;
  const overallStrength = signals.overall >= 55;
  const hasFlags = signals.flags.length > 2;
  
  if (!hasL2) {
    if (overallStrength) {
      return {
        action: 'decision_pack.action_proceed_l2',
        rationale: 'decision_pack.action_proceed_l2_rationale',
      };
    }
    return {
      action: 'decision_pack.action_clarify',
      rationale: 'decision_pack.action_clarify_rationale',
    };
  }
  
  // Has L2 submission
  if (overallStrength && !hasFlags) {
    return {
      action: 'decision_pack.action_interview',
      rationale: 'decision_pack.action_interview_rationale',
    };
  }
  
  return {
    action: 'decision_pack.action_review',
    rationale: 'decision_pack.action_review_rationale',
  };
}

function StatusBadge({ status }: { status: 'clear' | 'partial' | 'fragmented' }) {
  const { t } = useTranslation();
  
  const config = {
    clear: { 
      icon: CheckCircle, 
      className: 'bg-green-500/10 text-green-600 border-green-500/30',
      label: 'decision_pack.status_clear',
    },
    partial: { 
      icon: HelpCircle, 
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      label: 'decision_pack.status_partial',
    },
    fragmented: { 
      icon: AlertTriangle, 
      className: 'bg-muted text-muted-foreground border-muted',
      label: 'decision_pack.status_fragmented',
    },
  };
  
  const { icon: Icon, className, label } = config[status];
  
  return (
    <Badge variant="outline" className={`text-[10px] ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {t(label)}
    </Badge>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const { t } = useTranslation();
  
  const dots = {
    low: 1,
    medium: 2,
    high: 3,
  };
  
  return (
    <div className="flex items-center gap-1" title={t(`signals.confidence_${confidence}`)}>
      {[1, 2, 3].map(i => (
        <span 
          key={i} 
          className={`w-1.5 h-1.5 rounded-full ${
            i <= dots[confidence] ? 'bg-primary' : 'bg-muted'
          }`} 
        />
      ))}
    </div>
  );
}

function LockedDecisionPack() {
  const { t } = useTranslation();
  
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          {t('decision_pack.title')}
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {t('decision_pack.premium_badge')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-6">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            {t('decision_pack.locked_description')}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 mb-4">
            <li>• {t('decision_pack.feature_executive_summary')}</li>
            <li>• {t('decision_pack.feature_signal_matrix')}</li>
            <li>• {t('decision_pack.feature_risk_radar')}</li>
            <li>• {t('decision_pack.feature_next_action')}</li>
          </ul>
          <Button variant="outline" size="sm" disabled>
            <Lock className="h-3 w-3 mr-1" />
            {t('decision_pack.upgrade_cta')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function XimaDecisionPack({
  signals,
  level2Payload,
  companyContext,
  isPremium,
  className = '',
}: XimaDecisionPackProps) {
  const { t } = useTranslation();
  
  if (!isPremium) {
    return <LockedDecisionPack />;
  }
  
  const executiveSummary = generateExecutiveSummary(signals, level2Payload, companyContext);
  const consolidatedSignals = consolidateSignals(signals, level2Payload);
  const riskRadar = analyzeRiskRadar(signals, level2Payload);
  const nextAction = getSuggestedNextAction(signals, level2Payload);
  
  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t('decision_pack.title')}
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/30 text-[10px]">
            {t('decision_pack.premium_badge')}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('decision_pack.subtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Executive Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('decision_pack.executive_summary')}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/50">
            {executiveSummary}
          </p>
        </div>
        
        {/* Consolidated Signal Matrix */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('decision_pack.signal_matrix')}
            </span>
            {level2Payload && (
              <Badge variant="outline" className="text-[9px] ml-auto">
                L1 + L2
              </Badge>
            )}
          </div>
          <div className="grid gap-2">
            {consolidatedSignals.slice(0, 5).map(signal => (
              <div 
                key={signal.id}
                className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground">{t(signal.label)}</span>
                  {signal.source !== 'both' && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1">
                      {signal.source}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator confidence={signal.confidence} />
                  <StatusBadge status={signal.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Risk Radar */}
        {riskRadar.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                {t('decision_pack.risk_radar')}
              </span>
            </div>
            <div className="space-y-2">
              {riskRadar.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-2 rounded bg-amber-500/5 border border-amber-500/20"
                >
                  <p className="text-xs font-medium text-foreground">{item.risk}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.context}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Suggested Next Action */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('decision_pack.suggested_action')}
            </span>
          </div>
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
            <p className="text-sm font-medium text-foreground">
              {t(nextAction.action)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t(nextAction.rationale)}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            {t('decision_pack.action_disclaimer')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
