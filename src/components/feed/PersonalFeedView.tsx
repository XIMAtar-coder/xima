import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Radio, ShieldCheck } from 'lucide-react';
import { usePersonalFeed, FeedCategory } from '@/hooks/usePersonalFeed';
import { PersonalFeedCard } from './PersonalFeedCard';

export const PersonalFeedView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState<FeedCategory>('all');
  const { feedItems, isLoading, markAsRead, unreadCount } = usePersonalFeed(category);

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('feed.title', 'Your Feed')}</h2>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('feed.legend', 'Only verified milestones · No social posts · Privacy by design')}
        </p>
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as FeedCategory)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{t('feed.tab.all', 'All')}</TabsTrigger>
          <TabsTrigger value="growth">{t('feed.tab.growth', 'Growth')}</TabsTrigger>
          <TabsTrigger value="opportunities">{t('feed.tab.opportunities', 'Opportunities')}</TabsTrigger>
          <TabsTrigger value="milestones">{t('feed.tab.milestones', 'Milestones')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feed list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedItems.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-16 text-center">
            <div className="flex items-center justify-center mb-5">
              <div className="relative">
                <Radio className="h-12 w-12 text-muted-foreground/40" />
                <ShieldCheck className="h-5 w-5 text-primary/60 absolute -bottom-1 -right-1" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('feed.empty.title', 'Your feed is empty')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {t('feed.empty.description', 'Complete your assessment to get started!')}
            </p>
            <Button onClick={() => navigate('/assessment')}>
              {t('feed.empty.cta', 'Start Assessment →')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedItems.map((item) => (
            <PersonalFeedCard key={item.id} item={item} onMarkRead={handleMarkRead} />
          ))}
        </div>
      )}

      {/* Privacy notice */}
      <p className="text-xs text-muted-foreground/60 text-center mt-8 max-w-md mx-auto">
        {t('feed.privacy_notice',
          'All signals are anonymized and AI-normalized. XIMAtar identities are shown, not personal information.'
        )}
      </p>
    </div>
  );
};
