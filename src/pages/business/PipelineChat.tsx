import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { PipelineChatList } from '@/components/business/PipelineChatList';
import { PipelineChatView } from '@/components/business/PipelineChatView';
import { cn } from '@/lib/utils';

const PipelineChat = () => {
  const { t } = useTranslation();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleSelectThread = (threadId: string) => {
    setSelectedThread(threadId);
    setMobileShowChat(true);
  };

  return (
    <BusinessLayout>
      <div className="h-[calc(100vh-180px)] flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0">
          {/* Thread list */}
          <Card className={cn(
            "flex flex-col min-h-0 overflow-hidden",
            mobileShowChat && "hidden lg:flex"
          )}>
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-5 w-5 text-primary" />
                {t('pipeline_chat.title', 'Messages')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <PipelineChatList
                role="business"
                selectedThreadId={selectedThread}
                onSelectThread={handleSelectThread}
              />
            </CardContent>
          </Card>

          {/* Chat view */}
          <Card className={cn(
            "lg:col-span-2 flex flex-col min-h-0 overflow-hidden",
            !mobileShowChat && !selectedThread && "hidden lg:flex"
          )}>
            <PipelineChatView
              threadId={selectedThread}
              role="business"
              onBack={() => setMobileShowChat(false)}
            />
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default PipelineChat;
