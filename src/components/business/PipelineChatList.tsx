import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getArchetypeEmoji } from '@/utils/anonymousDisplay';

interface PipelineChatListProps {
  role: 'business' | 'candidate';
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
}

export const PipelineChatList: React.FC<PipelineChatListProps> = ({
  role, selectedThreadId, onSelectThread
}) => {
  const { t } = useTranslation();

  const { data: threads, isLoading } = useQuery({
    queryKey: ['pipeline-chat-threads', role],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('pipeline_chat_threads')
        .select('*')
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Failed to load pipeline threads:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 15000,
  });

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {t('pipeline_chat.no_threads', 'No active conversations')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('pipeline_chat.no_threads_hint', 'Conversations start when you invite candidates to challenges')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {threads.map(thread => {
          const unread = role === 'business'
            ? (thread.unread_business || 0)
            : (thread.unread_candidate || 0);

          const displayName = role === 'business'
            ? `Candidate #${thread.anonymous_label || '?'} — ${(thread.ximatar_archetype || 'unknown').charAt(0).toUpperCase() + (thread.ximatar_archetype || 'unknown').slice(1)}`
            : (thread.company_name || 'Company');

          // emoji removed — image already rendered above via <img>

          const stageLabel = (thread.current_stage || 'shortlisted').replace(/_/g, ' ');

          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                selectedThreadId === thread.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/80 border border-transparent"
              )}
            >
              {role === 'business' ? (
                <img
                  src={`/ximatars/${(thread.ximatar_archetype || 'chameleon').toLowerCase()}.png`}
                  className="w-10 h-10 rounded-full"
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {(thread.company_name || 'C')[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">
                    {displayName}
                  </p>
                  {unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground capitalize">{stageLabel}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(thread.last_message_at)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
