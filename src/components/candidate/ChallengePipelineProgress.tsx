import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, ArrowRight, Compass } from 'lucide-react';
import { 
  CandidateLevelProgress, 
  CHALLENGE_LEVELS, 
  ChallengeLevel 
} from '@/lib/challenges/challengeLevels';

interface ChallengePipelineProgressProps {
  progress: CandidateLevelProgress;
  className?: string;
}

/**
 * Candidate-facing progress indicator for the challenge pipeline
 * Shows current level only - does not expose future levels or locked content
 * Language emphasizes learning and exploration, NOT testing
 */
export const ChallengePipelineProgress: React.FC<ChallengePipelineProgressProps> = ({
  progress,
  className,
}) => {
  const { t } = useTranslation();

  const getStepStatus = (level: ChallengeLevel) => {
    if (progress.completedLevels.includes(level)) {
      return 'completed';
    }
    if (progress.currentLevel === level) {
      return 'current';
    }
    return 'locked';
  };

  const getStepIcon = (level: ChallengeLevel) => {
    const status = getStepStatus(level);
    
    if (status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (status === 'current') {
      return <Compass className="h-5 w-5 text-primary animate-pulse" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground/30" />;
  };

  const levels: ChallengeLevel[] = [1, 2, 3];
  const showUpToLevel = progress.currentLevel || 1;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {levels.map((level, index) => {
            const status = getStepStatus(level);
            const isVisible = level <= showUpToLevel || progress.completedLevels.includes(level);
            
            return (
              <React.Fragment key={level}>
                {/* Step */}
                <div 
                  className={`flex flex-col items-center gap-1.5 ${
                    !isVisible ? 'opacity-30' : ''
                  }`}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${status === 'completed' 
                      ? 'border-green-500 bg-green-500/10' 
                      : status === 'current'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted-foreground/20 bg-muted/50'
                    }
                  `}>
                    {getStepIcon(level)}
                  </div>
                  
                  <span className={`text-xs font-medium text-center max-w-[80px] ${
                    status === 'current' 
                      ? 'text-primary' 
                      : status === 'completed'
                      ? 'text-green-600'
                      : 'text-muted-foreground/50'
                  }`}>
                    {isVisible 
                      ? t(CHALLENGE_LEVELS[level].labelKey)
                      : t('levels.locked')
                    }
                  </span>
                </div>

                {/* Connector */}
                {index < levels.length - 1 && (
                  <div className="flex-1 flex items-center justify-center px-2">
                    <div className={`h-0.5 flex-1 ${
                      progress.completedLevels.includes(level)
                        ? 'bg-green-500'
                        : 'bg-muted-foreground/20'
                    }`} />
                    <ArrowRight className={`h-4 w-4 mx-1 ${
                      progress.completedLevels.includes(level)
                        ? 'text-green-500'
                        : 'text-muted-foreground/30'
                    }`} />
                    <div className={`h-0.5 flex-1 ${
                      progress.completedLevels.includes((level + 1) as ChallengeLevel)
                        ? 'bg-green-500'
                        : 'bg-muted-foreground/20'
                    }`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Encouraging message */}
        <p className="text-sm text-center text-muted-foreground mt-4">
          {progress.completedLevels.length === 0 && t('levels.candidate_msg_start')}
          {progress.completedLevels.length === 1 && t('levels.candidate_msg_progress')}
          {progress.completedLevels.length === 2 && t('levels.candidate_msg_almost')}
          {progress.completedLevels.length === 3 && t('levels.candidate_msg_complete')}
        </p>
      </CardContent>
    </Card>
  );
};
