import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

  return (
    <Card className="p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">{t('assessment.open_question')} {openKey === 'open1' ? '1' : '2'}</h4>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#2C6CFF]">{rubric.total}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-[#2C6CFF] hover:underline"
        >
          {t('open_scoring.why')}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isMinimal && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t('open_scoring.consider_elaborating')}
        </p>
      )}

      {expanded && (
        <div className="space-y-4 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t('open_scoring.rubric_breakdown')}
          </p>
          
          <div className="grid gap-2">
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

          {rubric.steveJobsExplanation && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-semibold text-[#2C6CFF]">
                {t('open_scoring.expert_insight')}
              </p>
              <p className="text-sm italic text-foreground leading-relaxed">
                "{rubric.steveJobsExplanation}"
              </p>
            </div>
          )}

          {rubric.improvementSuggestions && rubric.improvementSuggestions.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {t('open_scoring.suggestions')}
              </p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-foreground">
                {rubric.improvementSuggestions.map((suggestion, idx) => (
                  <li key={idx} className="leading-relaxed">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-2 border-t">
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
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#2C6CFF] to-[#22D3EE] transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
