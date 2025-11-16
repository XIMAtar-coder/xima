import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface OpenAnswerListProps {
  openAnswers?: Array<{
    question: string;
    answer: string;
    score?: number;
  }>;
}

export const OpenAnswerList: React.FC<OpenAnswerListProps> = ({ openAnswers }) => {
  const { t } = useTranslation();

  if (!openAnswers || openAnswers.length === 0) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <FileText className="text-primary" />
          {t('profile.open_answers', 'Your Open Answers')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {openAnswers.map((item, index) => (
          <div key={index} className="space-y-2 pb-6 border-b last:border-b-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                {item.question}
              </h4>
              {item.score !== undefined && (
                <span className="text-xs font-medium text-primary px-2 py-1 bg-primary/10 rounded">
                  {item.score}/100
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
