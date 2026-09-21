import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { PageHeader, Panel } from '@/components/layout/PageHeader';
import { MessageCircle, Loader2 } from 'lucide-react';
import { PipelineChatList } from '@/components/business/PipelineChatList';
import { usePipelineChatThreads } from '@/hooks/usePipelineChatThreads';
import { PipelineChatView } from '@/components/business/PipelineChatView';
import { cn } from '@/lib/utils';

const PipelineChat = () => {
  const { t } = useTranslation();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const { data: threads, isLoading } = usePipelineChatThreads('business');
  const count = threads?.length ?? 0;

  const handleSelectThread = (threadId: string) => {
    setSelectedThread(threadId);
    setMobileShowChat(true);
  };

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow={t('pipeline_chat.eyebrow_business')}
        title={t('pipeline_chat.title', 'Messages')}
        actions={(
          <div className="xs-glass flex items-center gap-3 !px-4 !py-2.5">
            <span className="xs-num text-[26px] font-semibold leading-none text-foreground">{count}</span>
            <span className="text-[13px] leading-tight text-muted-foreground">{t('pipeline_chat.active_count_label')}</span>
          </div>
        )}
      />

      <section aria-label={t('pipeline_chat.col_conversations')}>
        <div className="flex items-center justify-between border-b border-[hsl(var(--xs-line))] px-1 pb-2.5" aria-hidden="true">
          <span className="xs-eyebrow">{t('pipeline_chat.col_conversations')}</span>
          <span className="xs-eyebrow">
            {t('pipeline_chat.col_status')}
            {count === 0 && !isLoading ? ` / ${t('pipeline_chat.status_none')}` : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{t('common.loading')}</span>
          </div>
        ) : count === 0 ? (
          <Panel className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--xs-line))] text-muted-foreground" aria-hidden="true">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
                {t('pipeline_chat.no_threads', 'No active conversations')}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t('pipeline_chat.empty_sub_business')}</p>
              <div className="mt-4 border-l-2 border-primary pl-4 text-sm text-muted-foreground">
                <strong className="block text-foreground">{t('pipeline_chat.next_contact')}</strong>
                {t('pipeline_chat.no_threads_hint_business')}
              </div>
            </div>
          </Panel>
        ) : (
          <div className="mt-4 grid h-[calc(100vh-280px)] min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Thread list */}
            <Panel className={cn('flex min-h-0 flex-col overflow-hidden !p-0', mobileShowChat && 'hidden lg:flex')}>
              <PipelineChatList
                role="business"
                selectedThreadId={selectedThread}
                onSelectThread={handleSelectThread}
              />
            </Panel>

            {/* Chat view */}
            <Panel className={cn('flex min-h-0 flex-col overflow-hidden !p-0 lg:col-span-2', !mobileShowChat && !selectedThread && 'hidden lg:flex')}>
              <PipelineChatView
                threadId={selectedThread}
                role="business"
                onBack={() => setMobileShowChat(false)}
              />
            </Panel>
          </div>
        )}
      </section>
    </BusinessLayout>
  );
};

export default PipelineChat;
