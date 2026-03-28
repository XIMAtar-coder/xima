import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageCircle, ArrowLeft } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRealtimeChat, ChatMessage, RecentThread } from '@/hooks/useRealtimeChat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Messages = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    recentThreads,
    loadingThreads,
    selectedThread,
    sending,
    sendError,
    threadError,
    openExistingThread,
    sendMessage,
    clearSendError
  } = useRealtimeChat(user?.id);

  // Get current user's profile id for comparing sender
  const { data: currentProfileId } = useQuery({
    queryKey: ['myProfileId', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!user?.id,
  });

  // Mentor context for sidebar
  const selectedThreadData = recentThreads.find(t => t.thread_id === selectedThread);
  const { data: mentorContext } = useQuery({
    queryKey: ['mentorContext', selectedThreadData?.other_user?.id],
    queryFn: async () => {
      if (!selectedThreadData) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, name, ximatar, ximatar_id, pillar_scores')
        .eq('user_id', selectedThreadData.other_user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedThreadData?.other_user?.id,
  });

  useEffect(() => {
    if (sendError) { toast.error(sendError); clearSendError(); }
  }, [sendError, clearSendError]);

  useEffect(() => {
    if (threadError) toast.error(threadError);
  }, [threadError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    const msg = message;
    setMessage('');
    const ok = await sendMessage(msg);
    if (!ok) setMessage(msg);
  };

  const handleThreadSelect = async (thread: RecentThread) => {
    await openExistingThread(thread.thread_id, thread.other_user);
    setMobileShowChat(true);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return t('chat.yesterday', 'Yesterday');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!user) {
    return (
      <MainLayout fullHeight>
        <div className="h-full flex items-center justify-center">
          <Card className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('chat.login_required', 'Please log in to view messages')}</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const pillarScores = mentorContext?.pillar_scores as Record<string, number> | null;

  return (
    <MainLayout fullHeight>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 container max-w-7xl mx-auto px-4 py-4 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Thread list */}
            <Card className={cn(
              "lg:col-span-3 flex flex-col min-h-0 overflow-hidden",
              mobileShowChat && "hidden lg:flex"
            )}>
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  {t('chat.title', 'Messages')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-3">
                    {loadingThreads ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                      </div>
                    ) : recentThreads.length > 0 ? (
                      recentThreads.map(thread => (
                        <div
                          key={thread.thread_id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/80 border border-transparent",
                            selectedThread === thread.thread_id && "bg-primary/10 border-primary/20"
                          )}
                          onClick={() => handleThreadSelect(thread)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-background">
                              {thread.other_user.ximatar && (
                                <AvatarImage src={`/ximatars/${thread.other_user.ximatar}.png`} alt="" />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {initials(thread.other_user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate">{thread.other_user.name}</p>
                                <span className="text-[10px] text-muted-foreground ml-2">
                                  {formatTime(thread.last_message_time)}
                                </span>
                              </div>
                              {thread.last_message && (
                                <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('chat.no_conversations', 'No conversations yet')}</p>
                        <p className="text-xs mt-1">{t('chat.no_conversations_desc', 'When you\'re assigned a mentor or receive a challenge invitation, conversations will appear here.')}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat area */}
            <Card className={cn(
              "lg:col-span-6 flex flex-col min-h-0 overflow-hidden",
              !mobileShowChat && !selectedThread && "hidden lg:flex"
            )}>
              {selectedThread && selectedThreadData ? (
                <>
                  {/* Header */}
                  <CardHeader className="border-b flex-shrink-0 py-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost" size="icon"
                        className="lg:hidden h-8 w-8"
                        onClick={() => setMobileShowChat(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        {selectedThreadData.other_user.ximatar && (
                          <AvatarImage src={`/ximatars/${selectedThreadData.other_user.ximatar}.png`} alt="" />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials(selectedThreadData.other_user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{selectedThreadData.other_user.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {t('chat.mentor_badge', 'Mentor')}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-3">
                        {messages.length === 0 ? (
                          <div className="text-center py-12">
                            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground text-sm">{t('chat.no_messages', 'No messages yet')}</p>
                          </div>
                        ) : (
                          messages.map((msg, idx) => {
                            const isMine = msg.sender_id === currentProfileId;
                            const showTime = idx === 0 ||
                              new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 300000;
                            return (
                              <React.Fragment key={msg.id}>
                                {showTime && (
                                  <div className="flex justify-center">
                                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                      {formatMsgTime(msg.created_at)}
                                    </span>
                                  </div>
                                )}
                                <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                                  <div className={cn(
                                    "max-w-[75%] rounded-2xl px-4 py-2",
                                    isMine
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-muted rounded-bl-md"
                                  )}>
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </CardContent>

                  {/* Input */}
                  <div className="border-t p-3 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('chat.type_message', 'Type a message...')}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button onClick={handleSend} disabled={!message.trim() || sending} size="icon">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-lg font-medium text-muted-foreground">{t('chat.select_conversation', 'Select a conversation')}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Mentor context sidebar (desktop only) */}
            <Card className="hidden lg:flex lg:col-span-3 flex-col min-h-0 overflow-hidden">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-sm">{t('chat.candidate_profile', 'Profile Context')}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {mentorContext && pillarScores ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('chat.ximatar', 'XIMAtar')}:</span>
                      <span className="ml-2 font-medium capitalize">{mentorContext.ximatar || mentorContext.ximatar_id || '—'}</span>
                    </div>
                    {Object.entries(pillarScores).map(([pillar, score]) => (
                      <div key={pillar} className="flex items-center justify-between">
                        <span className="text-muted-foreground capitalize">{pillar}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (score as number))}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{score as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedThread ? (
                  <p className="text-xs text-muted-foreground">{t('chat.no_profile_context', 'Select a conversation to see profile context.')}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('chat.no_profile_context', 'Select a conversation to see profile context.')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
