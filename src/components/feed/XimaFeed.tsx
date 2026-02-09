import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { FeedHeader } from './FeedHeader';
import { SingleFeedCard } from './SingleFeedCard';
import { FeedItemCard } from './FeedItemCard';
import { FeedEmptyState } from './FeedEmptyState';
import { InterestSignalsCard } from './InterestSignalsCard';
import { FeedActiveThreads } from './FeedActiveThreads';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useRealtimeChat, RecentThread } from '@/hooks/useRealtimeChat';
import { useFeedItems } from '@/hooks/useFeedItems';
import { useUser } from '@/context/UserContext';

interface XimaFeedProps {
  showChatAccess?: boolean;
  hasPendingChats?: boolean;
  onOpenConversations?: () => void;
}

/**
 * GDPR-Safe XIMA Feed - "One news per login" pattern.
 * 
 * Includes contextual chat threads (mentor/business only).
 * No global visibility, strict RLS enforcement at database level.
 */
export const XimaFeed = ({ showChatAccess, hasPendingChats, onOpenConversations }: XimaFeedProps) => {
  const { t } = useTranslation();
  const { isBusiness } = useBusinessRole();
  const { user } = useUser();
  const { recentThreads, loadingThreads } = useRealtimeChat(user?.id);
  const { items, loading: feedLoading, error: feedError, addReaction, refresh } = useFeedItems();

  const handleOpenThread = (threadId: string) => {
    onOpenConversations?.();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <FeedHeader />

      {/* Interest signals for candidates */}
      {!isBusiness && (
        <div className="mb-6">
          <InterestSignalsCard onChatOpen={() => onOpenConversations?.()} />
        </div>
      )}

      {/* Contextual chat threads (mentor + business only) */}
      {!isBusiness && (
        <FeedActiveThreads
          threads={recentThreads}
          loading={loadingThreads}
          onOpenThread={handleOpenThread}
        />
      )}

      {/* Chat access notice */}
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

      {/* Featured single feed card */}
      <SingleFeedCard className="mb-6" />

      {/* Dynamic feed items list */}
      <div className="space-y-4 mb-6">
        {feedLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-2 mt-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {feedError && (
          <Card className="border-destructive/30">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-destructive mb-3">{feedError}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                {t('common.retry', 'Retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {!feedLoading && !feedError && items.length === 0 && (
          <FeedEmptyState />
        )}

        {!feedLoading && !feedError && items.map((item) => (
          <FeedItemCard
            key={item.id}
            item={item}
            onReact={addReaction}
            isBusiness={isBusiness}
          />
        ))}
      </div>

      {/* Privacy notice */}
      <p className="text-xs text-muted-foreground/60 text-center mt-8 max-w-md mx-auto">
        {t('feed.privacy_notice', 
          'All signals are anonymized and AI-normalized. XIMAtar identities are shown, not personal information. Reactions are aggregated and never attributed to individuals.'
        )}
      </p>
    </div>
  );
};