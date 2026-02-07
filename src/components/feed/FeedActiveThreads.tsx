import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Loader2 } from 'lucide-react';
import { FeedChatThreadCard } from './FeedChatThreadCard';
import { RecentThread } from '@/hooks/useRealtimeChat';

interface FeedActiveThreadsProps {
  threads: RecentThread[];
  loading: boolean;
  onOpenThread: (threadId: string) => void;
}

export const FeedActiveThreads = ({ threads, loading, onOpenThread }: FeedActiveThreadsProps) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="border-border/50 mb-6">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (threads.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">
          {t('feed.active_threads_title', 'Your Conversations')}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground px-1 -mt-1">
        {t('feed.active_threads_subtitle', 'Messages with your mentor and companies you\'re connected with.')}
      </p>
      <div className="space-y-2">
        {threads.map((thread) => (
          <FeedChatThreadCard
            key={thread.thread_id}
            thread={thread}
            onOpen={onOpenThread}
          />
        ))}
      </div>
    </div>
  );
};
