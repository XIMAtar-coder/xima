import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RecentThread } from '@/hooks/useRealtimeChat';

interface FeedChatThreadCardProps {
  thread: RecentThread;
  threadType?: 'mentor' | 'business';
  contextLabel?: string;
  onOpen: (threadId: string) => void;
}

export const FeedChatThreadCard = ({ thread, threadType, contextLabel, onOpen }: FeedChatThreadCardProps) => {
  const { t } = useTranslation();

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const ximatarSrc = thread.other_user.ximatar
    ? `/ximatars/${thread.other_user.ximatar}.png`
    : undefined;

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/10">
            {ximatarSrc && <AvatarImage src={ximatarSrc} alt="" />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(thread.other_user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{thread.other_user.name}</p>
              {threadType && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {threadType === 'mentor'
                    ? t('feed.thread_type.mentor', 'Mentor')
                    : t('feed.thread_type.business', 'Company')}
                </Badge>
              )}
            </div>
            {contextLabel && (
              <p className="text-xs text-muted-foreground truncate">{contextLabel}</p>
            )}
            {thread.last_message && (
              <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                {thread.last_message}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {thread.last_message_time && (
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(thread.last_message_time), { addSuffix: true })}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 h-7 text-xs"
              onClick={() => onOpen(thread.thread_id)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t('feed.open_thread', 'Open')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
