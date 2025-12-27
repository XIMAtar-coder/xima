import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Circle, CircleDot, HelpCircle } from 'lucide-react';
import { 
  CandidateLevelProgress, 
  CHALLENGE_LEVELS, 
  ChallengeLevel,
  getUncertaintyIndicator 
} from '@/lib/challenges/challengeLevels';

interface CandidateLevelBadgeProps {
  progress: CandidateLevelProgress;
  compact?: boolean;
  showUncertainty?: boolean;
}

export const CandidateLevelBadge: React.FC<CandidateLevelBadgeProps> = ({
  progress,
  compact = false,
  showUncertainty = false,
}) => {
  const { t } = useTranslation();
  const uncertainty = getUncertaintyIndicator(progress);

  const getLevelIcon = (level: ChallengeLevel) => {
    if (progress.completedLevels.includes(level)) {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    }
    if (progress.currentLevel === level) {
      return <CircleDot className="h-3.5 w-3.5 text-primary" />;
    }
    return <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />;
  };

  const getCurrentLevelLabel = () => {
    if (progress.currentLevel) {
      return t(CHALLENGE_LEVELS[progress.currentLevel].labelKey);
    }
    return t('levels.not_started');
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="text-xs gap-1 cursor-help"
            >
              L{progress.currentLevel || 0}
              {progress.completedLevels.length > 0 && (
                <span className="text-green-500">
                  ({progress.completedLevels.length}/3)
                </span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{t('levels.pipeline_progress')}</p>
              <div className="flex items-center gap-2">
                {([1, 2, 3] as ChallengeLevel[]).map((level) => (
                  <div key={level} className="flex items-center gap-1">
                    {getLevelIcon(level)}
                    <span className="text-xs">{level}</span>
                  </div>
                ))}
              </div>
              {showUncertainty && (
                <p className="text-xs text-muted-foreground">
                  {t(uncertainty.key)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {/* Level progress indicators */}
      <div className="flex items-center gap-3">
        {([1, 2, 3] as ChallengeLevel[]).map((level) => (
          <div 
            key={level}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
              progress.completedLevels.includes(level)
                ? 'bg-green-500/10 text-green-600'
                : progress.currentLevel === level
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            {getLevelIcon(level)}
            <span className="font-medium">
              {t(CHALLENGE_LEVELS[level].labelKey)}
            </span>
          </div>
        ))}
      </div>

      {/* Uncertainty indicator */}
      {showUncertainty && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>{t(uncertainty.key)}</span>
        </div>
      )}
    </div>
  );
};
