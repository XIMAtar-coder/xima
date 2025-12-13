import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Search, Loader2, User, MessageCircle, Check, CheckCheck, Clock } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRealtimeChat, ChatMessage } from '@/hooks/useRealtimeChat';
import { cn } from '@/lib/utils';

const XimaChat = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    users, 
    messages, 
    selectedUser, 
    loading, 
    sending,
    fetchError,
    openThread, 
    sendMessage 
  } = useRealtimeChat(user?.id);

  // Filter users by search
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;
    const msg = message;
    setMessage('');
    await sendMessage(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUserSelect = async (chatUser: any) => {
    await openThread(chatUser.id);
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
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-6 flex items-center justify-center h-[80vh]">
          <Card className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('chat.login_required')}</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-6 flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t('chat.loading')}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-180px)] min-h-[500px]">
          {/* Left Sidebar - User List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-5 w-5 text-primary" />
                {t('chat.conversations')}
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('chat.search_users')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-3">
                  {fetchError ? (
                    <div className="text-center py-8 text-destructive">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">{t('chat.error_loading')}</p>
                      <p className="text-xs mt-1 text-muted-foreground">{fetchError}</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{searchQuery ? t('chat.no_users_found') : t('chat.no_other_users')}</p>
                    </div>
                  ) : (
                    filteredUsers.map((chatUser) => (
                      <div
                        key={chatUser.id}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all duration-200",
                          "hover:bg-muted/80 border border-transparent",
                          selectedUser?.id === chatUser.id 
                            ? "bg-primary/10 border-primary/20" 
                            : ""
                        )}
                        onClick={() => handleUserSelect(chatUser)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-background">
                            {chatUser.ximatar ? (
                              <AvatarImage 
                                src={getXimatarImage(chatUser.ximatar)} 
                                alt={chatUser.name} 
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(chatUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{chatUser.name}</p>
                              {chatUser.unreadCount ? (
                                <Badge variant="default" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
                                  {chatUser.unreadCount}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{chatUser.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Side - Chat Area */}
          <Card className="lg:col-span-3 flex flex-col">
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
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center">
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
                                  "flex items-end gap-2 max-w-[75%]",
                                  isSent ? "flex-row-reverse" : ""
                                )}>
                                  {!isSent && (
                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                      {selectedUser.ximatar ? (
                                        <AvatarImage 
                                          src={getXimatarImage(selectedUser.ximatar)} 
                                          alt={msg.sender?.name} 
                                        />
                                      ) : null}
                                      <AvatarFallback className="text-xs bg-muted">
                                        {getInitials(msg.sender?.name || 'U')}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div
                                    className={cn(
                                      "p-3 rounded-2xl",
                                      isSent
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted rounded-bl-md"
                                    )}
                                  >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                                    <div className={cn(
                                      "flex items-center gap-1 mt-1",
                                      isSent ? "justify-end" : "justify-start"
                                    )}>
                                      <span className={cn(
                                        "text-[10px]",
                                        isSent ? "text-primary-foreground/70" : "text-muted-foreground"
                                      )}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                      {isSent && (
                                        <CheckCheck className={cn(
                                          "h-3 w-3",
                                          "text-primary-foreground/70"
                                        )} />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                {/* Chat Input */}
                <div className="border-t p-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder={t('chat.type_message')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!message.trim() || sending}
                      size="icon"
                      className="flex-shrink-0"
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
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{t('chat.welcome_title')}</h3>
                  <p className="text-muted-foreground max-w-sm">
                    {t('chat.welcome_subtitle')}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default XimaChat;
