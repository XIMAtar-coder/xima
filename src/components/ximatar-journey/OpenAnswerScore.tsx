import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lightbulb, Sparkles, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Rubric } from '@/lib/scoring/openResponse';

interface FieldAverages {
  open1: { avg_score: number; count: number; rubric_averages: Record<string, number> | null };
  open2: { avg_score: number; count: number; rubric_averages: Record<string, number> | null };
  total_responses: number;
}

interface OpenAnswerScoreProps {
  openKey: 'open1' | 'open2';
  rubric: Rubric;
  answer: string;
  fieldKey?: string;
}

export const OpenAnswerScore: React.FC<OpenAnswerScoreProps> = ({ openKey, rubric, answer, fieldKey }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [fieldAverages, setFieldAverages] = useState<FieldAverages | null>(null);

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const isMinimal = wordCount < 50;

  // Fetch field averages for comparison
  useEffect(() => {
    if (fieldKey) {
      supabase.functions.invoke('get-field-averages', {
        body: { field_key: fieldKey }
      }).then(({ data, error }) => {
        if (!error && data) {
          setFieldAverages(data as FieldAverages);
        }
      });
    }
  }, [fieldKey]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-400';
  };

  // Get comparison data
  const avgData = fieldAverages?.[openKey];
  const avgScore = avgData?.avg_score ?? 65;
  const difference = rubric.total - avgScore;
  const percentile = avgData?.count ? Math.min(99, Math.max(1, Math.round(50 + difference * 2))) : null;

  const getDifferenceInfo = () => {
    if (difference > 10) return { icon: TrendingUp, color: 'text-emerald-500', label: t('open_scoring.above_average') };
    if (difference < -10) return { icon: TrendingDown, color: 'text-amber-500', label: t('open_scoring.below_average') };
    return { icon: Minus, color: 'text-muted-foreground', label: t('open_scoring.at_average') };
  };

  const diffInfo = getDifferenceInfo();

  return (
    <Card className="p-4 space-y-3 bg-card border-border/50">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-foreground">
            {t('ximatarJourney.open_question_label')} {openKey === 'open1' ? '1' : '2'}
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(rubric.total)}`}>
                {rubric.total}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            
            {/* Comparison indicator */}
            {avgData && avgData.count > 0 && (
              <div className={`flex items-center gap-1 text-xs ${diffInfo.color}`}>
                <diffInfo.icon size={14} />
                <span className="font-medium">
                  {difference > 0 ? '+' : ''}{difference}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {t('ximatarJourney.open_score_why')}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Comparison bar */}
      {avgData && avgData.count > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{t('open_scoring.compared_to_peers', { count: avgData.count })}</span>
            </div>
            {percentile && (
              <span className="font-medium text-foreground">
                {t('open_scoring.percentile', { value: percentile })}
              </span>
            )}
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Average marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
              style={{ left: `${avgScore}%` }}
            />
            {/* User's score bar */}
            <div 
              className={`h-full bg-gradient-to-r ${rubric.total >= avgScore ? 'from-primary to-emerald-400' : 'from-amber-400 to-primary'} transition-all duration-500`}
              style={{ width: `${rubric.total}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{t('open_scoring.your_score')}</span>
            <span>{t('open_scoring.field_average')}: {avgScore}</span>
          </div>
        </div>
      )}

      {isMinimal && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
          {t('open_scoring.consider_elaborating')}
        </p>
      )}

      {expanded && (
        <div className="space-y-4 pt-3 border-t border-border/50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* AI Explanation */}
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

          {/* Score Breakdown with comparison */}
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
                avgScore={avgData?.rubric_averages?.length}
              />
              <RubricItem
                label={t('open_scoring.rubric.relevance')}
                score={rubric.relevance}
                max={25}
                avgScore={avgData?.rubric_averages?.relevance}
              />
              <RubricItem
                label={t('open_scoring.rubric.structure')}
                score={rubric.structure}
                max={20}
                avgScore={avgData?.rubric_averages?.structure}
              />
              <RubricItem
                label={t('open_scoring.rubric.specificity')}
                score={rubric.specificity}
                max={20}
                avgScore={avgData?.rubric_averages?.specificity}
              />
              <RubricItem
                label={t('open_scoring.rubric.action')}
                score={rubric.action}
                max={15}
                avgScore={avgData?.rubric_averages?.action}
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
  avgScore?: number;
}

const RubricItem: React.FC<RubricItemProps> = ({ label, score, max, avgScore }) => {
  const { t } = useTranslation();
  const percentage = (score / max) * 100;
  const avgPercentage = avgScore ? (avgScore / max) * 100 : null;
  
  const getBarColor = () => {
    if (percentage >= 80) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 60) return 'from-primary to-primary/80';
    if (percentage >= 40) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };

  const diff = avgScore ? score - avgScore : null;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{score}/{max}</span>
          {diff !== null && (
            <span className={`text-[10px] ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(0)} {t('open_scoring.vs_avg')}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        {/* Average marker */}
        {avgPercentage !== null && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
            style={{ left: `${avgPercentage}%` }}
          />
        )}
        <div 
          className={`h-full bg-gradient-to-r ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
