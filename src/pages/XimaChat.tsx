import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, Filter } from 'lucide-react';
import { XimatarDisplay } from '@/components/XimatarDisplay';
import { getXIMAtarByAssessment } from '@/utils/ximatarUtils';

const XimaChat = () => {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for connected users with different XIMAtar types
  const connectedUsers = [
    {
      id: 1,
      name: 'Marco Rossi',
      ximatar: getXIMAtarByAssessment({ computational: 8, communication: 6, knowledge: 7, creativity: 5, drive: 6 }),
      lastSeen: '2 minutes ago',
      status: 'online',
      specialty: 'Data Analytics',
      strengthAreas: ['Computational Power', 'Knowledge']
    },
    {
      id: 2,
      name: 'Elena Bianchi',
      ximatar: getXIMAtarByAssessment({ computational: 5, communication: 9, knowledge: 6, creativity: 8, drive: 7 }),
      lastSeen: '1 hour ago',
      status: 'away',
      specialty: 'Creative Direction',
      strengthAreas: ['Communication', 'Creativity']
    },
    {
      id: 3,
      name: 'Alessandro Verdi',
      ximatar: getXIMAtarByAssessment({ computational: 6, communication: 7, knowledge: 9, creativity: 6, drive: 8 }),
      lastSeen: '30 minutes ago',
      status: 'online',
      specialty: 'Strategic Planning',
      strengthAreas: ['Knowledge', 'Drive']
    }
  ];

  const filteredUsers = connectedUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mockMessages = [
    {
      id: 1,
      senderId: selectedUser?.id,
      text: "Hi! I saw your computational skills profile. I'm working on a data visualization project and could use some insights.",
      timestamp: new Date(Date.now() - 30000),
      isOwn: false
    },
    {
      id: 2,
      senderId: 'me',
      text: "Hello! I'd be happy to help. What specific challenges are you facing with the visualization?",
      timestamp: new Date(Date.now() - 15000),
      isOwn: true
    }
  ];

  const handleSendMessage = () => {
    if (message.trim() && selectedUser) {
      // In a real app, this would send the message
      console.log('Sending message:', message, 'to user:', selectedUser.name);
      setMessage('');
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">XIMA Chat</h1>
          <p className="text-muted-foreground">
            Connect with professionals who complement your skillset
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Users List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Connected Professionals</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search professionals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex-shrink-0">
                          <XimatarDisplay
                            ximatar={user.ximatar}
                            size="sm"
                            showDescription={false}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">{user.name}</h3>
                            <div className={`w-2 h-2 rounded-full ${
                              user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                          </div>
                          <p className="text-xs text-muted-foreground">{user.specialty}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.strengthAreas.slice(0, 2).map((area) => (
                              <Badge key={area} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{user.lastSeen}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedUser ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10">
                      <XimatarDisplay
                        ximatar={selectedUser.ximatar}
                        size="sm"
                        showDescription={false}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedUser.specialty}</p>
                    </div>
                    <div className={`ml-auto w-3 h-3 rounded-full ${
                      selectedUser.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {mockMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              msg.isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.text}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!message.trim()}>
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Select a Professional</h3>
                  <p className="text-muted-foreground">
                    Choose someone from your connections to start a conversation
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