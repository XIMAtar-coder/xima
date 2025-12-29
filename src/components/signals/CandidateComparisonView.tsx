/**
 * Candidate Comparison View - Pattern-based side-by-side comparison
 * NO scores, NO rankings, NO better/worse labels
 * Uses contrast language to highlight differences in styles
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, X, Scale } from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { computeQualitativeSignals, QualitativeSignal } from '@/lib/signals/qualitativeSignals';

interface CandidateForComparison {
  id: string;
  name: string;
  signals: SignalsPayload;
  avatarUrl?: string;
}

interface CandidateComparisonViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: CandidateForComparison[];
  onRemoveCandidate: (id: string) => void;
}

const SIGNAL_IDS = [
  'decision_framing',
  'agency_ownership',
  'ambiguity_handling',
  'impact_orientation',
  'communication_clarity',
] as const;

/**
 * Generate contrast language between two candidates for a signal
 */
function generateContrastPhrase(
  signalId: string,
  candidateA: { name: string; signals: SignalsPayload },
  candidateB: { name: string; signals: SignalsPayload }
): string {
  const qualA = computeQualitativeSignals(candidateA.signals);
  const qualB = computeQualitativeSignals(candidateB.signals);
  
  const signalA = qualA.signals.find(s => s.id === signalId);
  const signalB = qualB.signals.find(s => s.id === signalId);
  
  if (!signalA || !signalB) return '';
  
  // Get raw scores for comparison patterns
  const scores = {
    decision_framing: { a: candidateA.signals.framing, b: candidateB.signals.framing },
    agency_ownership: { a: candidateA.signals.execution_bias, b: candidateB.signals.execution_bias },
    ambiguity_handling: { 
      a: (candidateA.signals.framing + candidateA.signals.decision_quality) / 2,
      b: (candidateB.signals.framing + candidateB.signals.decision_quality) / 2
    },
    impact_orientation: { a: candidateA.signals.impact_thinking, b: candidateB.signals.impact_thinking },
    communication_clarity: { a: candidateA.signals.decision_quality, b: candidateB.signals.decision_quality },
  };
  
  const scoreData = scores[signalId as keyof typeof scores] || { a: 50, b: 50 };
  const diff = scoreData.a - scoreData.b;
  
  const nameA = candidateA.name.split(' ')[0];
  const nameB = candidateB.name.split(' ')[0];
  
  // Generate contrast based on signal type and difference
  if (Math.abs(diff) < 10) {
    return `Both ${nameA} and ${nameB} show similar patterns in this area`;
  }
  
  const contrastPhrases: Record<string, { higher: string; lower: string }> = {
    decision_framing: {
      higher: `${nameA} invests more time in upfront structuring`,
      lower: `${nameB} moves toward solutions more quickly`,
    },
    agency_ownership: {
      higher: `${nameA} demonstrates stronger initiative-taking`,
      lower: `${nameB} shows a more measured approach`,
    },
    ambiguity_handling: {
      higher: `${nameA} appears more comfortable with uncertainty`,
      lower: `${nameB} may prefer clearer guidance`,
    },
    impact_orientation: {
      higher: `${nameA} emphasizes outcomes more explicitly`,
      lower: `${nameB} focuses more on tasks and activities`,
    },
    communication_clarity: {
      higher: `${nameA} structures responses more explicitly`,
      lower: `${nameB} uses a more concise style`,
    },
  };
  
  const phrases = contrastPhrases[signalId];
  if (!phrases) return '';
  
  return diff > 0 
    ? `${phrases.higher}; ${phrases.lower}`
    : `${phrases.lower.replace(nameB, nameA).replace(nameA, nameB)}; ${phrases.higher.replace(nameA, nameB)}`;
}

function CandidateColumn({ candidate, onRemove }: { candidate: CandidateForComparison; onRemove: () => void }) {
  const qualitative = computeQualitativeSignals(candidate.signals);
  
  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-t-lg border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={candidate.avatarUrl} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm truncate">{candidate.name}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Signal Interpretations */}
      <div className="space-y-3 p-3">
        {qualitative.signals.map((signal) => (
          <div key={signal.id} className="space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {signal.interpretation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonRow({ 
  signalId, 
  label, 
  candidates 
}: { 
  signalId: string; 
  label: string;
  candidates: CandidateForComparison[];
}) {
  const { t } = useTranslation();
  
  // Get interpretations for each candidate
  const interpretations = candidates.map(c => {
    const qual = computeQualitativeSignals(c.signals);
    const signal = qual.signals.find(s => s.id === signalId);
    return {
      name: c.name,
      interpretation: signal?.interpretation || '',
      confidence: signal?.confidence || 'low',
    };
  });
  
  // Generate contrast phrase if 2 candidates
  const contrastPhrase = candidates.length === 2
    ? generateContrastPhrase(signalId, candidates[0], candidates[1])
    : null;
  
  return (
    <div className="border-b border-border/30 pb-4 last:border-0">
      <div className="text-sm font-medium text-foreground mb-3">{t(label)}</div>
      
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
        {interpretations.map((interp, idx) => (
          <div key={idx} className="p-3 bg-muted/20 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {interp.name}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[9px] h-4 ${
                  interp.confidence === 'high' ? 'bg-primary/10 text-primary' :
                  interp.confidence === 'medium' ? 'bg-secondary text-secondary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}
              >
                {t(`signals.confidence_${interp.confidence}`)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {interp.interpretation}
            </p>
          </div>
        ))}
      </div>
      
      {/* Contrast phrase for 2 candidates */}
      {contrastPhrase && (
        <div className="mt-3 px-3 py-2 bg-primary/5 rounded-md border border-primary/10">
          <p className="text-xs text-primary/80 italic">
            {contrastPhrase}
          </p>
        </div>
      )}
    </div>
  );
}

export function CandidateComparisonView({ 
  open, 
  onOpenChange, 
  candidates,
  onRemoveCandidate,
}: CandidateComparisonViewProps) {
  const { t } = useTranslation();
  
  const signalLabels: Record<string, string> = {
    decision_framing: 'signals.decision_framing',
    agency_ownership: 'signals.agency_ownership',
    ambiguity_handling: 'signals.ambiguity_handling',
    impact_orientation: 'signals.impact_orientation',
    communication_clarity: 'signals.communication_clarity',
  };
  
  if (candidates.length < 2) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t('signals.compare_title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('signals.compare_description')}
          </p>
        </DialogHeader>
        
        {/* Framing Notice */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground text-center">
              {t('signals.compare_disclaimer')}
            </p>
          </CardContent>
        </Card>
        
        {/* Comparison Grid */}
        <div className="space-y-4 mt-4">
          {SIGNAL_IDS.map((signalId) => (
            <ComparisonRow
              key={signalId}
              signalId={signalId}
              label={signalLabels[signalId]}
              candidates={candidates}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
