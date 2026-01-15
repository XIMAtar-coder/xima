import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Radio, ShieldCheck } from 'lucide-react';

export const FeedEmptyState = () => {
  const { t } = useTranslation();

  return (
    <Card className="border-dashed border-border/50">
      <CardContent className="py-16 text-center">
        <div className="flex items-center justify-center mb-5">
          <div className="relative">
            <Radio className="h-12 w-12 text-muted-foreground/40" />
            <ShieldCheck className="h-5 w-5 text-primary/60 absolute -bottom-1 -right-1" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('feed.empty.title', 'No signals yet')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
          {t('feed.empty.description', 
            'Complete challenges to surface verified progress.'
          )}
        </p>
        <p className="text-xs text-muted-foreground/50 max-w-xs mx-auto">
          {t('feed.empty.hint', 
            'No social posts. Only verified milestones.'
          )}
        </p>
      </CardContent>
    </Card>
  );
};
