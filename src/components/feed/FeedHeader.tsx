import { useTranslation } from 'react-i18next';
import { Radio, Sparkles } from 'lucide-react';

export const FeedHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="relative">
          <Radio className="h-8 w-8 text-primary" />
          <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t('feed.title', 'XIMA Feed')}
        </h1>
      </div>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto italic">
        "{t('feed.tagline', "In XIMA you don't follow people. You follow signals.")}"
      </p>
      <p className="text-sm text-muted-foreground/70 mt-2">
        {t('feed.subtitle', 'Anonymous signals from verified achievements. No noise, only signal.')}
      </p>
    </div>
  );
};
