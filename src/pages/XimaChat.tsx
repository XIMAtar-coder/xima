import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, Loader2, User } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';

const XimaChat = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { users, messages, loading, openThread, sendMessage } = useRealtimeChat(user?.id);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find(u => 
    messages.length > 0 && messages[0]?.sender_id !== user?.id 
      ? u.id === messages[0]?.sender_id 
      : false
  );

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message);
    setMessage('');
  };

  const handleUserSelect = async (chatUser: any) => {
    await openThread(chatUser.id);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto pt-6 flex items-center justify-center h-[80vh]">
          <Loader2 className="animate-spin h-12 w-12 text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[80vh]">
          {/* Left Sidebar - Connected Users */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Users
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-4">
                  {filteredUsers.map((chatUser) => (
                    <div
                      key={chatUser.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted`}
                      onClick={() => handleUserSelect(chatUser)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[hsl(var(--xima-accent))]/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-[hsl(var(--xima-accent))]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chatUser.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{chatUser.email}</p>
                          <span className={`text-xs ${
                            chatUser.status === 'online' 
                              ? 'text-green-600' 
                              : 'text-muted-foreground'
                          }`}>
                            {chatUser.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Side - Chat Area */}
          <Card className="lg:col-span-3">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--xima-accent))]/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[hsl(var(--xima-accent))]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedUser?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                    </div>
                  </div>
                </CardHeader>

                {/* Chat Messages */}
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isSent = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex animate-[fade-in_0.3s_ease-out] ${
                              isSent ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                isSent
                                  ? 'bg-gradient-to-r from-[hsl(var(--xima-accent))] to-[hsl(var(--xima-teal))] text-white'
                                  : 'bg-[hsl(var(--background-light))]'
                              }`}
                            >
                              <p className="text-sm">{msg.body}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isSent ? 'text-white/70' : 'text-muted-foreground'
                                }`}
                              >
                                {msg.sender?.name} • {new Date(msg.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Chat Input */}
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!message.trim()}
                      className="bg-[hsl(var(--xima-accent))] hover:bg-[hsl(var(--xima-accent))]/90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground py-8">
                  <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Select a user to start chatting</p>
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