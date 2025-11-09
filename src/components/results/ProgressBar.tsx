import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProgressBarProps {
  progress: number;
  steps?: {
    label: string;
    completed: boolean;
  }[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, steps }) => {
  const { t } = useTranslation();

  const defaultSteps = [
    { label: t('progress.assessment_complete'), completed: progress >= 50 },
    { label: t('progress.cv_uploaded'), completed: progress >= 75 },
    { label: t('progress.professional_selected'), completed: progress === 100 }
  ];

  const displaySteps = steps || defaultSteps;

  return (
    <div className="space-y-4 p-6 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold">{t('progress.journey_progress')}</h4>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>
      
      <div className="space-y-2">
        {displaySteps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            {step.completed ? (
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
            ) : (
              <Circle size={20} className="text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-sm ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
