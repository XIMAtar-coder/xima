import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { FeedHeader } from './FeedHeader';
import { InterestSignalsCard } from './InterestSignalsCard';
import { FeedActiveThreads } from './FeedActiveThreads';
import { PersonalFeedView } from './PersonalFeedView';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useRealtimeChat, RecentThread } from '@/hooks/useRealtimeChat';
import { useUser } from '@/context/UserContext';

interface XimaFeedProps {
  showChatAccess?: boolean;
  hasPendingChats?: boolean;
  onOpenConversations?: () => void;
}

/**
 * XIMA Feed - Social Intelligence Layer.
 * Database-driven personal feed with category tabs.
 */
export const XimaFeed = ({ showChatAccess, hasPendingChats, onOpenConversations }: XimaFeedProps) => {
  const { t } = useTranslation();
  const { isBusiness } = useBusinessRole();
  const { user } = useUser();
  const { recentThreads, loadingThreads } = useRealtimeChat(user?.id);

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
            <Button size="sm" onClick={onOpenConversations}>
              {t('feed.open_chats', 'Open Chats')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Personal Feed - database-driven, categorized */}
      <PersonalFeedView />
    </div>
  );
};
