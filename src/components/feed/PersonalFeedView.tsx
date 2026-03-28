import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Compass, ShieldCheck, BookOpen, Upload } from 'lucide-react';
import { usePersonalFeed, FeedCategory } from '@/hooks/usePersonalFeed';
import { PersonalFeedCard } from './PersonalFeedCard';

export const PersonalFeedView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState<FeedCategory>('for_you');
  const { feedItems, isLoading, markAsRead, trackEngagement, unreadCount, userArchetype, hoursSinceLastGrowth } = usePersonalFeed(category);

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleTrackEngagement = (id: string) => {
    trackEngagement.mutate(id);
  };

  return (
    <div className="space-y-5">
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
          <TabsTrigger value="for_you">{t('feed.tab.for_you', 'For You')}</TabsTrigger>
          <TabsTrigger value="growth">{t('feed.tab.growth', 'Growth')}</TabsTrigger>
          <TabsTrigger value="opportunities">{t('feed.tab.opportunities', 'Opportunities')}</TabsTrigger>
          <TabsTrigger value="discover">{t('feed.tab.discover', 'Discover')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feed list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedItems.length === 0 ? (
        <EmptyState category={category} navigate={navigate} t={t} />
      ) : (
        <div className="space-y-3">
          {feedItems.map((item) => (
            <PersonalFeedCard
              key={item.id}
              item={item}
              onMarkRead={handleMarkRead}
              onTrackEngagement={handleTrackEngagement}
              userArchetype={userArchetype}
            />
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

const EmptyState = ({ category, navigate, t }: { category: FeedCategory; navigate: any; t: any }) => {
  if (category === 'discover') {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="py-12 text-center">
          <Compass className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-1">
            {t('feed.discover_empty.title', 'No articles right now')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t('feed.discover_empty.description', 'New curated content is added regularly. Check back soon!')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-border/50">
      <CardContent className="py-12 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <Sparkles className="h-10 w-10 text-muted-foreground/40" />
            <ShieldCheck className="h-4 w-4 text-primary/60 absolute -bottom-1 -right-1" />
          </div>
        </div>
        <h3 className="text-base font-semibold mb-2">
          {t('feed.empty.title', 'Welcome to your Feed!')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-1">
          {t('feed.empty.description', 'This is where your professional growth story unfolds. As you explore XIMA, your feed will fill with:')}
        </p>
        <ul className="text-sm text-muted-foreground max-w-xs mx-auto text-left space-y-1 mb-5">
          <li>✦ Growth updates as your pillars evolve</li>
          <li>✦ Curated articles and insights for your archetype</li>
          <li>✦ Challenge invitations from companies</li>
          <li>✦ Recommendations tailored to your journey</li>
        </ul>
        <div className="flex items-center justify-center gap-3">
          <Button variant="default" size="sm" onClick={() => navigate('/growth-hub')}>
            <BookOpen className="h-4 w-4 mr-1" />
            {t('feed.empty.cta_growth', 'Explore Growth Hub')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
            <Upload className="h-4 w-4 mr-1" />
            {t('feed.empty.cta_cv', 'Upload Your CV')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
