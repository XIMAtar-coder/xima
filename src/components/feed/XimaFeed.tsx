import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, MessageCircle, Bug, FlaskConical } from 'lucide-react';
import { useFeedItems } from '@/hooks/useFeedItems';
import { FeedHeader } from './FeedHeader';
import { FeedItemCard } from './FeedItemCard';
import { FeedEmptyState } from './FeedEmptyState';
import { InterestSignalsCard } from './InterestSignalsCard';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface XimaFeedProps {
  showChatAccess?: boolean;
  hasPendingChats?: boolean;
  onOpenConversations?: () => void;
}

// Check if we're in debug mode (dev environment or ?debug=1)
const isDebugMode = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return import.meta.env.DEV || params.get('debug') === '1';
};

export const XimaFeed = ({ showChatAccess, hasPendingChats, onOpenConversations }: XimaFeedProps) => {
  const { t } = useTranslation();
  const [seeding, setSeeding] = useState(false);
  const { 
    items, 
    loading, 
    error,
    debugError,
    hasMore, 
    loadMore, 
    refresh, 
    addReaction,
    isBusiness 
  } = useFeedItems();

  const handleSeedDemoSignals = async () => {
    setSeeding(true);
    try {
      const response = await fetch(
        'https://iyckvvnecpnldrxqmzta.supabase.co/functions/v1/seed-feed-items',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-token': 'xima-dev-seed-2024'
          }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        const ximatarCount = data.ximatars?.length || 0;
        toast.success(`Seeded ${data.inserted} demo signals from ${ximatarCount} XIMatars`);
        refresh();
      } else {
        toast.error(data.error || 'Failed to seed signals');
      }
    } catch (err) {
      console.error('Seed error:', err);
      toast.error('Failed to seed demo signals');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('feed.states.loading', 'Loading signals…')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-2">
              {t('feed.states.error_title', 'Failed to load feed')}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('feed.states.empty_desc', 'Only verified milestones will appear here.')}
            </p>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('feed.states.error_cta', 'Try again')}
            </Button>
          </CardContent>
        </Card>

        {/* Debug panel - only shown in debug mode */}
        {debugError && (
          <Card className="border-yellow-500/50 bg-yellow-50/10">
            <CardContent className="py-4">
              <div className="flex items-start gap-2">
                <Bug className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-yellow-700 mb-1">Debug Info</p>
                  <code className="text-xs text-yellow-600 block break-all whitespace-pre-wrap">
                    {debugError}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <FeedHeader />

      {/* Interest signals for candidates - shows companies that showed interest */}
      {!isBusiness && (
        <div className="mb-6">
          <InterestSignalsCard onChatOpen={() => onOpenConversations?.()} />
        </div>
      )}

      {/* Chat access notice - only shown when mutual interest exists */}
      {showChatAccess && hasPendingChats && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {t('feed.chat_available', 'You have conversations available')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('feed.chat_hint', 'Based on mutual interest signals')}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={onOpenConversations}
            >
              {t('feed.open_chats', 'Open Chats')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debug + Refresh controls */}
      <div className="flex justify-end gap-2 mb-4">
        {isDebugMode() && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSeedDemoSignals}
            disabled={seeding}
            className="text-yellow-600 border-yellow-500/50 hover:bg-yellow-50"
          >
            <FlaskConical className={`h-4 w-4 mr-2 ${seeding ? 'animate-pulse' : ''}`} />
            {seeding ? 'Seeding...' : 'Seed demo signals'}
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('feed.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Feed items - empty state vs populated */}
      {items.length === 0 ? (
        <FeedEmptyState />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedItemCard 
              key={item.id} 
              item={item} 
              onReact={addReaction}
              isBusiness={isBusiness}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {t('feed.load_more', 'Load more signals')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Privacy notice */}
      <p className="text-xs text-muted-foreground/60 text-center mt-8 max-w-md mx-auto">
        {t('feed.privacy_notice', 
          'All signals are anonymized and AI-normalized. XIMAtar identities are shown, not personal information. Reactions are aggregated and never attributed to individuals.'
        )}
      </p>
    </div>
  );
};
