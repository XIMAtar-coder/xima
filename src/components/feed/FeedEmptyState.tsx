import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Radio, Sparkles } from 'lucide-react';

export const FeedEmptyState = () => {
  const { t } = useTranslation();

  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Radio className="h-10 w-10 text-muted-foreground/50" />
          <Sparkles className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          {t('feed.empty.title', 'No signals yet')}
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
          {t('feed.empty.description', 
            'The feed will populate as candidates complete challenges, validate skills, and reach new levels. Only verified system events appear here—no user-generated content.'
          )}
        </p>
      </CardContent>
    </Card>
  );
};
