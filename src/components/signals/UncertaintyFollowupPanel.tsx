/**
 * Uncertainty & Follow-up Panel
 * Surfaces what cannot be inferred and suggests clarifying questions
 * Decision support, not judgement
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  HelpCircle, 
  MessageSquarePlus,
  ChevronRight,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { SignalsPayload } from '@/lib/signals/computeSignals';
import { 
  getFullInterpretation, 
  UncertaintyItem, 
  FollowupQuestion,
} from '@/lib/signals/interpretSignals';

interface UncertaintyFollowupPanelProps {
  signals: SignalsPayload;
  level?: 1 | 2;
  onSelectQuestion?: (question: string) => void;
  className?: string;
}

function UncertaintyRow({ item }: { item: UncertaintyItem }) {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-start gap-2 py-2">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium">{t(item.gap)}</p>
        <p className="text-xs text-muted-foreground">{t(item.reason)}</p>
      </div>
    </div>
  );
}

function QuestionSuggestion({ 
  item, 
  onSelect 
}: { 
  item: FollowupQuestion; 
  onSelect?: (question: string) => void;
}) {
  const { t } = useTranslation();
  const translatedQuestion = t(item.question);
  
  return (
    <button
      onClick={() => onSelect?.(translatedQuestion)}
      className="w-full text-left p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm">{translatedQuestion}</p>
          <p className="text-xs text-muted-foreground mt-1">{t(item.context)}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </button>
  );
}

export function UncertaintyFollowupPanel({ 
  signals, 
  level = 1,
  onSelectQuestion,
  className = '' 
}: UncertaintyFollowupPanelProps) {
  const { t } = useTranslation();
  const interpretation = getFullInterpretation(signals, level);
  
  const hasUncertainties = interpretation.uncertainties.length > 0;
  const hasQuestions = interpretation.suggestedQuestions.length > 0;
  
  if (!hasUncertainties && !hasQuestions) {
    return null;
  }
  
  return (
    <Card className={`border-amber-500/20 bg-amber-500/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          {t('interpretation.uncertainty_title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('interpretation.uncertainty_description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remaining Uncertainties */}
        {hasUncertainties && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              {t('interpretation.remaining_gaps')}
            </p>
            <div className="divide-y divide-border/30">
              {interpretation.uncertainties.map((item, index) => (
                <UncertaintyRow key={index} item={item} />
              ))}
            </div>
          </div>
        )}
        
        {/* Suggested Follow-up Questions */}
        {hasQuestions && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t('interpretation.suggested_questions')}
              </p>
            </div>
            <div className="space-y-2">
              {interpretation.suggestedQuestions.map((item, index) => (
                <QuestionSuggestion 
                  key={index} 
                  item={item} 
                  onSelect={onSelectQuestion}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}