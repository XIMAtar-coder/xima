import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, Filter, Star } from 'lucide-react';
import { XimatarDisplay } from '@/components/XimatarDisplay';
import { getXIMAtarByAssessment } from '@/utils/ximatarUtils';
import { useSearchParams } from 'react-router-dom';

const XimaChat = () => {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [searchParams] = useSearchParams();

  // Mock data for connected users with different XIMAtar types
  const connectedUsers = [
    {
      id: 1,
      name: 'Marco Rossi',
      ximatar: getXIMAtarByAssessment({ computational: 8, communication: 6, knowledge: 7, creativity: 5, drive: 6 }),
      lastSeen: '2 minutes ago',
      status: 'online',
      specialty: 'Data Analytics',
      strengthAreas: ['Computational Power', 'Knowledge'],
      isBestMatch: true
    },
    {
      id: 2,
      name: 'Elena Bianchi',
      ximatar: getXIMAtarByAssessment({ computational: 5, communication: 9, knowledge: 6, creativity: 8, drive: 7 }),
      lastSeen: '1 hour ago',
      status: 'away',
      specialty: 'Creative Direction',
      strengthAreas: ['Communication', 'Creativity'],
      isBestMatch: false
    },
    {
      id: 3,
      name: 'Alessandro Verdi',
      ximatar: getXIMAtarByAssessment({ computational: 6, communication: 7, knowledge: 9, creativity: 6, drive: 8 }),
      lastSeen: '30 minutes ago',
      status: 'online',
      specialty: 'Strategic Planning',
      strengthAreas: ['Knowledge', 'Drive'],
      isBestMatch: false
    }
  ];

  // Auto-open best match via deep link (?start=best)
  useEffect(() => {
    if (searchParams.get('start') === 'best') {
      const best = connectedUsers.find(u => u.isBestMatch);
      if (best) handleUserSelect(best);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = connectedUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getWelcomeMessage = (user: any) => {
    return t('chat.welcome_message');
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedUser) {
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString(),
        type: 'sent'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      
      // Simulate response after a short delay
      setTimeout(() => {
        const response = {
          id: Date.now() + 1,
          text: t('chat.mentor_response'),
          sender: selectedUser.name,
          timestamp: new Date().toLocaleTimeString(),
          type: 'received'
        };
        setMessages(prev => [...prev, response]);
      }, 1000);
    }
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    
    // Initialize with welcome message if no messages exist for this user
    if (messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: getWelcomeMessage(user),
        sender: user.name,
        timestamp: new Date().toLocaleTimeString(),
        type: 'received'
      };
      setMessages([welcomeMessage]);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[80vh]">
          {/* Left Sidebar - Connected Users */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('chat.connected_professionals')}
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('chat.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id 
                          ? 'bg-primary/10 border-2 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 flex-shrink-0">
                          <XimatarDisplay 
                            ximatar={user.ximatar} 
                            size="sm" 
                            showDescription={false} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            {user.isBestMatch && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-yellow-600">{t('chat.best_match')}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user.specialty}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant={user.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                              {t(`chat.${user.status}`)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{user.lastSeen}</span>
                          </div>
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
                    <div className="w-12 h-12">
                      <XimatarDisplay 
                        ximatar={selectedUser.ximatar} 
                        size="sm" 
                        showDescription={false} 
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                        {selectedUser.isBestMatch && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {t('chat.best_match')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedUser.specialty}</p>
                      <p className="text-xs text-muted-foreground">
                        Strong in: {selectedUser.strengthAreas.join(', ')}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {/* Chat Messages */}
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              msg.type === 'sent'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.text}</p>
                            <p className={`text-xs mt-1 ${
                              msg.type === 'sent' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {msg.sender} • {msg.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Chat Input */}
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder={t('chat.type_message')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                      <span className="sr-only">{t('chat.send')}</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground py-8">
                  {t('chat.no_conversations')}
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