/**
 * XIMA Premium Signals Panel - Advanced insights for paying businesses
 * Shows teaser/locked state for non-paying, full content for paying
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Sparkles, TrendingUp, Shield, Target } from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';

interface PremiumSignalsPanelProps {
  signals: SignalsPayload;
  isPremium?: boolean; // For now, always false until premium logic is added
  className?: string;
}

interface PremiumSignal {
  id: string;
  icon: React.ReactNode;
  label: string;
  interpretation: string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Compute premium signals from raw signals
 * These are advanced interpretations not shown in standard panel
 */
function computePremiumSignals(signals: SignalsPayload): PremiumSignal[] {
  const { framing, execution_bias, impact_thinking, decision_quality, flags, overall } = signals;
  
  const premiumSignals: PremiumSignal[] = [];
  
  // Decision Consistency - How aligned reasoning is across answers
  const consistency = Math.abs(framing - decision_quality) < 15 && Math.abs(execution_bias - impact_thinking) < 20;
  premiumSignals.push({
    id: 'decision_consistency',
    icon: <Target className="h-4 w-4" />,
    label: 'signals.premium.decision_consistency',
    interpretation: consistency
      ? 'Reasoning patterns show strong internal consistency across response sections.'
      : 'Some variation in reasoning depth across different response areas.',
    confidence: consistency ? 'high' : 'medium',
  });
  
  // Learning Velocity - Signs of reflection and iteration
  const hasReflection = flags.includes('clear_tradeoffs') || decision_quality >= 60;
  premiumSignals.push({
    id: 'learning_velocity',
    icon: <TrendingUp className="h-4 w-4" />,
    label: 'signals.premium.learning_velocity',
    interpretation: hasReflection
      ? 'Shows signs of self-reflection and iterative thinking in approach.'
      : 'Approach is direct; explicit reflection markers not detected.',
    confidence: hasReflection ? 'medium' : 'low',
  });
  
  // Risk Awareness - How risks are identified vs ignored
  const hasRiskAwareness = flags.includes('clear_tradeoffs') && framing >= 55;
  premiumSignals.push({
    id: 'risk_awareness',
    icon: <Shield className="h-4 w-4" />,
    label: 'signals.premium.risk_awareness',
    interpretation: hasRiskAwareness
      ? 'Demonstrates explicit consideration of risks and constraints.'
      : 'Risk considerations may be implicit rather than explicit.',
    confidence: hasRiskAwareness ? 'high' : 'low',
  });
  
  // Strategic Depth - Ability to connect to second-order effects
  const hasStrategicDepth = impact_thinking >= 65 && framing >= 55;
  premiumSignals.push({
    id: 'strategic_depth',
    icon: <Sparkles className="h-4 w-4" />,
    label: 'signals.premium.strategic_depth',
    interpretation: hasStrategicDepth
      ? 'Connects immediate actions to broader implications and second-order effects.'
      : 'Focus is primarily on immediate actions and direct outcomes.',
    confidence: hasStrategicDepth ? 'high' : 'medium',
  });
  
  return premiumSignals;
}

function LockedSignalCard({ signal }: { signal: PremiumSignal }) {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm flex items-center justify-center">
        <Lock className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <div className="flex items-center gap-2 opacity-30">
        {signal.icon}
        <span className="text-sm font-medium blur-[2px]">{t(signal.label)}</span>
      </div>
      <p className="text-xs mt-1 blur-[3px] opacity-30">
        {signal.interpretation.slice(0, 40)}...
      </p>
    </div>
  );
}

function PremiumSignalCard({ signal }: { signal: PremiumSignal }) {
  const { t } = useTranslation();
  
  const confidenceStyles = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-amber-500/10 text-amber-600',
    high: 'bg-green-500/10 text-green-600',
  };
  
  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-600">
          {signal.icon}
          <span className="text-sm font-medium">{t(signal.label)}</span>
        </div>
        <Badge variant="outline" className={`text-[9px] h-4 ${confidenceStyles[signal.confidence]}`}>
          {t(`signals.confidence_${signal.confidence}`)}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {signal.interpretation}
      </p>
    </div>
  );
}

export function PremiumSignalsPanel({ signals, isPremium = false, className = '' }: PremiumSignalsPanelProps) {
  const { t } = useTranslation();
  const premiumSignals = computePremiumSignals(signals);
  
  return (
    <Card className={`border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            {t('signals.premium.title')}
          </CardTitle>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
            XIMA Premium
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isPremium ? t('signals.premium.description') : t('signals.premium.teaser')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPremium ? (
          // Full premium content
          premiumSignals.map((signal) => (
            <PremiumSignalCard key={signal.id} signal={signal} />
          ))
        ) : (
          // Locked/teaser state
          <>
            {premiumSignals.slice(0, 2).map((signal) => (
              <LockedSignalCard key={signal.id} signal={signal} />
            ))}
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                {t('signals.premium.unlock_cta')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
