import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lightbulb, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Rubric } from '@/lib/scoring/openResponse';

interface OpenAnswerScoreProps {
  openKey: 'open1' | 'open2';
  rubric: Rubric;
  answer: string;
}

export const OpenAnswerScore: React.FC<OpenAnswerScoreProps> = ({ openKey, rubric, answer }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const isMinimal = wordCount < 50;

  // Determine score color based on total
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-400';
  };

  return (
    <Card className="p-4 space-y-3 bg-card border-border/50">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-foreground">
            {t('assessment.open_question')} {openKey === 'open1' ? '1' : '2'}
          </h4>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(rubric.total)}`}>
              {rubric.total}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {t('open_scoring.why')}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isMinimal && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
          {t('open_scoring.consider_elaborating')}
        </p>
      )}

      {expanded && (
        <div className="space-y-4 pt-3 border-t border-border/50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* AI Explanation - Primary feedback */}
          {rubric.steveJobsExplanation && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <p className="text-xs font-semibold text-primary">
                  {t('open_scoring.expert_insight')}
                </p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {rubric.steveJobsExplanation}
              </p>
            </div>
          )}

          {/* Improvement Suggestions */}
          {rubric.improvementSuggestions && rubric.improvementSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-amber-500" />
                <p className="text-xs font-semibold text-muted-foreground">
                  {t('open_scoring.suggestions')}
                </p>
              </div>
              <ul className="space-y-2">
                {rubric.improvementSuggestions.map((suggestion, idx) => (
                  <li 
                    key={idx} 
                    className="text-sm text-foreground/90 leading-relaxed pl-4 border-l-2 border-amber-400/50"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Score Breakdown - Collapsible detail */}
          <details className="group">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
              <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
              {t('open_scoring.rubric_breakdown')}
            </summary>
            <div className="grid gap-2 mt-3 pl-4">
              <RubricItem
                label={t('open_scoring.rubric.length')}
                score={rubric.length}
                max={20}
              />
              <RubricItem
                label={t('open_scoring.rubric.relevance')}
                score={rubric.relevance}
                max={25}
              />
              <RubricItem
                label={t('open_scoring.rubric.structure')}
                score={rubric.structure}
                max={20}
              />
              <RubricItem
                label={t('open_scoring.rubric.specificity')}
                score={rubric.specificity}
                max={20}
              />
              <RubricItem
                label={t('open_scoring.rubric.action')}
                score={rubric.action}
                max={15}
              />
            </div>
          </details>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
            {t('open_scoring.note')}
          </p>
        </div>
      )}
    </Card>
  );
};

interface RubricItemProps {
  label: string;
  score: number;
  max: number;
}

const RubricItem: React.FC<RubricItemProps> = ({ label, score, max }) => {
  const percentage = (score / max) * 100;
  
  // Color based on percentage
  const getBarColor = () => {
    if (percentage >= 80) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 60) return 'from-primary to-primary/80';
    if (percentage >= 40) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
