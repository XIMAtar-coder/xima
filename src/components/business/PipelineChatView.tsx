import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, ArrowLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getArchetypeImageUrl } from '@/utils/anonymousDisplay';
import { toast } from 'sonner';

interface PipelineChatViewProps {
  threadId: string | null;
  role: 'business' | 'candidate';
  onBack?: () => void;
}

export const PipelineChatView: React.FC<PipelineChatViewProps> = ({
  threadId, role, onBack
}) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: thread } = useQuery({
    queryKey: ['pipeline-thread', threadId],
    queryFn: async () => {
      if (!threadId) return null;
      const { data } = await supabase
        .from('pipeline_chat_threads')
        .select('*')
        .eq('id', threadId)
        .single();
      return data;
    },
    enabled: !!threadId,
  });

  const { data: messages } = useQuery({
    queryKey: ['pipeline-messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data } = await supabase
        .from('pipeline_chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      // Mark as read
      const unreadField = role === 'business' ? 'unread_business' : 'unread_candidate';
      await supabase.from('pipeline_chat_threads')
        .update({ [unreadField]: 0 })
        .eq('id', threadId);

      return data || [];
    },
    enabled: !!threadId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !threadId || sending) return;
    const content = message.trim();
    setMessage('');
    setSending(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('pipeline_chat_messages').insert({
        thread_id: threadId,
        sender_id: user.user.id,
        sender_role: role,
        message_type: 'text',
        content,
      });

      if (error) throw error;

      // Update thread metadata
      const otherUnread = role === 'business' ? 'unread_candidate' : 'unread_business';
      const currentUnread = (role === 'business' ? thread?.unread_candidate : thread?.unread_business) || 0;

      await supabase.from('pipeline_chat_threads')
        .update({
          last_message_at: new Date().toISOString(),
          [otherUnread]: currentUnread + 1,
        })
        .eq('id', threadId);

      queryClient.invalidateQueries({ queryKey: ['pipeline-messages', threadId] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-chat-threads'] });
    } catch (err: any) {
      toast.error('Failed to send message');
      setMessage(content);
    } finally {
      setSending(false);
    }
  };

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-lg font-medium text-muted-foreground">
            {t('pipeline_chat.select_conversation', 'Select a conversation')}
          </p>
        </div>
      </div>
    );
  }

  const headerName = role === 'business'
    ? `Candidate #${thread?.anonymous_label || '?'} — ${(thread?.ximatar_archetype || 'unknown').charAt(0).toUpperCase() + (thread?.ximatar_archetype || 'unknown').slice(1)}`
    : (thread?.company_name || 'Company');

  const stageKey = `pipeline_chat.stage_${thread?.current_stage || 'shortlisted'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {role === 'business' ? (
          <img
            src={`/ximatars/${(thread?.ximatar_archetype || 'chameleon').toLowerCase()}.png`}
            className="w-10 h-10 rounded-full"
            alt=""
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {(thread?.company_name || 'C')[0]}
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium flex items-center gap-2">
            {role === 'business' && <img src={getArchetypeImageUrl(thread?.ximatar_archetype)} alt="" className="h-6 w-6 object-contain inline" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
            {headerName}
          </p>
          <Badge variant="secondary" className="text-xs capitalize mt-0.5">
            {t(stageKey, (thread?.current_stage || 'shortlisted').replace(/_/g, ' '))}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {(!messages || messages.length === 0) ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {t('pipeline_chat.no_messages', 'No messages yet. Start the conversation!')}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.message_type === 'stage_update' || msg.sender_role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              const isMine = msg.sender_role === role;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t(
              role === 'business' ? 'pipeline_chat.placeholder_business' : 'pipeline_chat.placeholder_candidate',
              role === 'business' ? 'Message candidate (anonymous)...' : 'Message company...'
            )}
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!message.trim() || sending} size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
