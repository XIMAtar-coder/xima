import { useTranslation } from 'react-i18next';

export const FeedHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{t('feed.title')}</h1>
      <p className="text-muted-foreground mt-1">{t('feed.subtitle')}</p>
    </div>
  );
};
