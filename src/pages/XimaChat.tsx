import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Send, Search, Loader2, User, MessageCircle, AlertCircle, Radio } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRealtimeChat, ChatMessage, RecentThread, ChatUser } from '@/hooks/useRealtimeChat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { XimaFeed } from '@/components/feed/XimaFeed';

const XimaChat = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialView = searchParams.get('view') === 'conversations' ? 'conversations' : 'feed';
  const [activeTab, setActiveTab] = useState<'feed' | 'conversations'>(initialView);
  
  const { 
    users, 
    messages, 
    recentThreads,
    loadingThreads,
    selectedUser, 
    selectedThread,
    searchQuery,
    searching,
    hasSearched,
    sending,
    fetchError,
    sendError,
    threadError,
    openThread, 
    openExistingThread,
    sendMessage,
    handleSearchChange,
    clearSendError
  } = useRealtimeChat(user?.id);

  // Show errors as toasts
  useEffect(() => {
    if (sendError) {
      toast.error(sendError);
      clearSendError();
    }
  }, [sendError, clearSendError]);

  useEffect(() => {
    if (threadError) {
      toast.error(threadError);
    }
  }, [threadError]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;
    const msg = message;
    setMessage('');
    const success = await sendMessage(msg);
    if (!success) {
      setMessage(msg);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleThreadSelect = async (thread: RecentThread) => {
    await openExistingThread(thread.thread_id, thread.other_user);
  };

  const formatLastMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `${t('chat.yesterday')} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getXimatarImage = (ximatar?: string) => {
    if (!ximatar) return null;
    return `/ximatars/${ximatar}.png`;
  };

  if (!user) {
    return (
      <MainLayout fullHeight>
        <div className="h-full flex items-center justify-center">
          <Card className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('chat.login_required')}</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const hasPendingChats = recentThreads.length > 0;

  return (
    <MainLayout fullHeight>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 container max-w-7xl mx-auto px-4 py-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'feed' | 'conversations')} className="h-full flex flex-col">
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="feed" className="gap-2">
                  <Radio className="h-4 w-4" />
                  {t('feed.tab.signals', 'Signals')}
                </TabsTrigger>
                <TabsTrigger value="conversations" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {t('feed.tab.conversations', 'Conversations')}
                  {hasPendingChats && (
                    <Badge variant="default" className="ml-1 h-5 min-w-5 text-xs">
                      {recentThreads.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="feed" className="flex-1 overflow-auto">
              <XimaFeed 
                showChatAccess={true}
                hasPendingChats={hasPendingChats}
              />
            </TabsContent>

            <TabsContent value="conversations" className="flex-1 overflow-hidden">
              {/* Existing chat UI - only accessible from conversations tab */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                {/* Left Sidebar - Thread List (no search for new users) */}
                <Card className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      {t('chat.conversations')}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('chat.conversations_hint', 'Chat is available after mutual interest')}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-1 p-3">
                        {loadingThreads ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                            <p className="text-xs">{t('chat.loading_conversations')}</p>
                          </div>
                        ) : recentThreads.length > 0 ? (
                          <>
                            {recentThreads.map((thread) => (
                              <div
                                key={thread.thread_id}
                                className={cn(
                                  "p-3 rounded-lg cursor-pointer transition-all duration-200",
                                  "hover:bg-muted/80 border border-transparent",
                                  selectedThread === thread.thread_id 
                                    ? "bg-primary/10 border-primary/20" 
                                    : ""
                                )}
                                onClick={() => handleThreadSelect(thread)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border-2 border-background">
                                    {thread.other_user.ximatar ? (
                                      <AvatarImage 
                                        src={getXimatarImage(thread.other_user.ximatar)} 
                                        alt={thread.other_user.name} 
                                      />
                                    ) : null}
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                      {getInitials(thread.other_user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium truncate">{thread.other_user.name}</p>
                                      {thread.last_message_time && (
                                        <span className="text-[10px] text-muted-foreground ml-2">
                                          {formatLastMessageTime(thread.last_message_time)}
                                        </span>
                                      )}
                                    </div>
                                    {thread.last_message && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {thread.last_message}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('chat.no_conversations')}</p>
                            <p className="text-xs mt-1">{t('chat.no_conversations_hint', 'Conversations appear after mutual interest')}</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Right Side - Chat Area */}
                <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                  {selectedUser ? (
                    <>
                      {/* Chat Header */}
                      <CardHeader className="border-b flex-shrink-0 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/20">
                            {selectedUser.ximatar ? (
                              <AvatarImage 
                                src={getXimatarImage(selectedUser.ximatar)} 
                                alt={selectedUser.name} 
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(selectedUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-base">{selectedUser.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                          </div>
                          {selectedUser.ximatar && (
                            <Badge variant="secondary" className="capitalize">
                              {selectedUser.ximatar}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      {/* Chat Messages */}
                      <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                          <div className="p-4">
                            {threadError ? (
                              <div className="flex items-center justify-center h-full text-center py-12">
                                <div>
                                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive/50" />
                                  <p className="text-destructive">{t('chat.connection_error')}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{threadError}</p>
                                </div>
                              </div>
                            ) : !selectedThread ? (
                              <div className="flex items-center justify-center h-full text-center py-12">
                                <div>
                                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
                                  <p className="text-muted-foreground">{t('chat.connecting')}</p>
                                </div>
                              </div>
                            ) : messages.length === 0 ? (
                              <div className="flex items-center justify-center h-full text-center py-12">
                                <div>
                                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                                  <p className="text-muted-foreground">{t('chat.no_messages')}</p>
                                  <p className="text-sm text-muted-foreground/70 mt-1">{t('chat.start_conversation')}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {messages.map((msg, idx) => {
                                  const isSent = msg.sender_id === user?.id;
                                  const showTimestamp = idx === 0 || 
                                    new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000;
                                  
                                  return (
                                    <React.Fragment key={msg.id}>
                                      {showTimestamp && (
                                        <div className="flex justify-center">
                                          <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                            {formatMessageTime(msg.created_at)}
                                          </span>
                                        </div>
                                      )}
                                      <div
                                        className={cn(
                                          "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                                          isSent ? "justify-end" : "justify-start"
                                        )}
                                      >
                                        <div className={cn(
                                          "max-w-[75%] rounded-2xl px-4 py-2",
                                          isSent 
                                            ? "bg-primary text-primary-foreground rounded-br-md" 
                                            : "bg-muted rounded-bl-md"
                                        )}>
                                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                                <div ref={messagesEndRef} />
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>

                      {/* Message Input */}
                      <div className="border-t p-3 flex-shrink-0">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder={t('chat.type_message')}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={!selectedThread || sending}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={!message.trim() || !selectedThread || sending}
                            size="icon"
                          >
                            {sending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-8">
                      <div>
                        <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-lg font-medium text-muted-foreground">
                          {t('chat.select_conversation')}
                        </p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {t('chat.select_conversation_hint', 'Choose a conversation from the list to start messaging')}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default XimaChat;
