import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, TrendingUp, Award } from 'lucide-react';
import { GrowthTestResult } from '@/hooks/useGrowthHub';

interface GrowthTestResultModalProps {
  result: GrowthTestResult;
  onClose: () => void;
}

const PILLAR_LABELS: Record<string, string> = {
  drive: 'Drive',
  computational_power: 'Comp. Power',
  communication: 'Communication',
  creativity: 'Creativity',
  knowledge: 'Knowledge',
};

const GrowthTestResultModal: React.FC<GrowthTestResultModalProps> = ({ result, onClose }) => {
  const passed = result.passed;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {passed ? <CheckCircle className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-destructive" />}
            {passed ? 'Test Passed!' : 'Not quite — try again!'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Score */}
          <div className="text-center">
            <div className={`text-5xl font-bold ${passed ? 'text-green-600' : 'text-destructive'}`}>
              {result.total_score}<span className="text-lg text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{passed ? 'Great job!' : 'Score 60+ to earn growth points'}</p>
          </div>

          {/* Pillar deltas */}
          {passed && result.pillar_deltas && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <TrendingUp className="h-4 w-4" /> Pillar Growth Earned
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.pillar_deltas).filter(([, v]) => v > 0).map(([pillar, delta]) => (
                  <Badge key={pillar} className="bg-green-600 text-white gap-1">
                    <Award className="h-3 w-3" />
                    {PILLAR_LABELS[pillar] || pillar} +{delta}
                  </Badge>
                ))}
              </div>
              {result.delta_reasoning && (
                <p className="text-xs text-green-700 mt-1">{result.delta_reasoning}</p>
              )}
            </div>
          )}

          {/* Per-question feedback */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Question Feedback</h3>
            {result.per_question.map((pq, i) => (
              <div key={pq.question_id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Q{i + 1}</span>
                  <Badge variant={pq.score >= 12 ? 'default' : pq.score >= 8 ? 'secondary' : 'destructive'} className="text-xs">
                    {pq.score}/20
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pq.feedback}</p>
              </div>
            ))}
          </div>

          {/* Overall feedback */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm">{result.overall_feedback}</p>
          </div>

          {result.next_recommendation && (
            <p className="text-xs text-muted-foreground">📌 {result.next_recommendation}</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrowthTestResultModal;
