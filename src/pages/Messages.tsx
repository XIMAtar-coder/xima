import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, MessageCircle, ArrowLeft, Building2, GraduationCap } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRealtimeChat, RecentThread } from '@/hooks/useRealtimeChat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatScore, pillarName, readPillar, PILLAR_ORDER } from '@/components/candidate/PillarBars';

const Messages = () => {
  const { t, i18n } = useTranslation();
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
  const selectedThreadData = recentThreads.find(th => th.thread_id === selectedThread);
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

  const breadcrumb = <span className="block truncate">{t('nav.candidate_area', 'Your space')} / {t('nav.messages')}</span>;

  if (!user) {
    return (
      <CandidateLayout breadcrumb={breadcrumb}>
        <Panel className="mx-auto max-w-md py-10 text-center">
          <MessageCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t('chat.login_required', 'Please log in to view messages')}</p>
        </Panel>
      </CandidateLayout>
    );
  }

  const pillarScores = mentorContext?.pillar_scores as Record<string, number> | null;
  const hasThreads = recentThreads.length > 0;

  const header = (
    <>
      <EmailVerificationBanner slim />
      <PageHeader
        eyebrow={t('dashboard.eyebrow', 'Your personal space')}
        title={t('chat.title', 'Messages')}
        actions={(
          <div className="text-right">
            <strong className="xs-num block font-mono text-[26px] font-medium leading-none text-foreground">{recentThreads.length}</strong>
            <span className="text-[12px] text-muted-foreground">{t('chat.conversations', 'conversations')}</span>
          </div>
        )}
      />
    </>
  );

  // Empty inbox — the register view from the redesign.
  if (!loadingThreads && !hasThreads) {
    return (
      <CandidateLayout breadcrumb={breadcrumb}>
        {header}
        <Panel className="!p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--xs-line))] px-6 py-3.5">
            <strong className="text-[14px] font-semibold text-foreground">{t('chat.your_conversations', 'Your conversations')}</strong>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t('chat.no_messages_short', 'No messages')}</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--xs-line))] text-muted-foreground" aria-hidden="true">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold text-foreground">{t('chat.inbox_empty_title', 'Your inbox is empty')}</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">{t('chat.inbox_empty_body', 'Conversations with mentors and companies will appear here.')}</p>
            </div>
          </div>
        </Panel>

        <section className="mt-5">
          <h2 className="mb-2 text-[19px] font-semibold tracking-[-0.3px] text-foreground">{t('chat.when_opens_title', 'When a conversation opens')}</h2>
          <Panel className="!py-2">
            <div className="xs-row">
              <span className="flex min-w-0 items-center gap-3">
                <span className="xs-num font-mono text-[12px] text-muted-foreground">01</span>
                <GraduationCap size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <b className="text-[15px] font-semibold text-foreground">{t('chat.mentor_badge', 'Mentor')}</b>
              </span>
              <span className="text-[14px] text-muted-foreground">{t('chat.when_mentor', 'When a mentor is assigned to you.')}</span>
            </div>
            <div className="xs-row">
              <span className="flex min-w-0 items-center gap-3">
                <span className="xs-num font-mono text-[12px] text-muted-foreground">02</span>
                <Building2 size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <b className="text-[15px] font-semibold text-foreground">{t('chat.companies', 'Companies')}</b>
              </span>
              <span className="text-[14px] text-muted-foreground">{t('chat.when_company', 'When you receive an offer from a company.')}</span>
            </div>
          </Panel>
          <p className="mt-3 text-[13px] text-muted-foreground">{t('chat.offer_note', 'Conversations with companies start from the offer.')}</p>
        </section>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout breadcrumb={breadcrumb}>
      {header}
      <div className="grid h-[calc(100vh-14rem)] min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Thread list */}
        <Panel className={cn('flex min-h-0 flex-col overflow-hidden !p-0 lg:col-span-3', mobileShowChat && 'hidden lg:flex')}>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--xs-line))] px-4 py-3">
            <strong className="text-[14px] font-semibold text-foreground">{t('chat.your_conversations', 'Your conversations')}</strong>
            <span className="xs-num font-mono text-[11px] text-muted-foreground">{recentThreads.length}</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loadingThreads ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </div>
              ) : (
                recentThreads.map(thread => (
                  <button
                    key={thread.thread_id}
                    type="button"
                    className={cn(
                      'block w-full rounded-md px-3 py-3 text-left transition-colors',
                      selectedThread === thread.thread_id ? 'bg-primary/[0.08]' : 'hover:bg-[hsl(var(--xs-page))]',
                    )}
                    onClick={() => handleThreadSelect(thread)}
                  >
                    <span className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {thread.other_user.ximatar && (
                          <AvatarImage src={`/ximatars/${thread.other_user.ximatar}.webp`} alt="" loading="lazy" decoding="async" />
                        )}
                        <AvatarFallback className="bg-primary/10 text-sm text-primary">
                          {initials(thread.other_user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <b className="truncate text-[14px] font-medium text-foreground">{thread.other_user.name}</b>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(thread.last_message_time)}</span>
                        </span>
                        {thread.last_message && (
                          <span className="block truncate text-[12px] text-muted-foreground">{thread.last_message}</span>
                        )}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Panel>

        {/* Chat area */}
        <Panel className={cn('flex min-h-0 flex-col overflow-hidden !p-0 lg:col-span-6', !mobileShowChat && !selectedThread && 'hidden lg:flex')}>
          {selectedThread && selectedThreadData ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-[hsl(var(--xs-line))] px-4 py-3">
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 lg:hidden"
                  aria-label={t('a11y.back')} onClick={() => setMobileShowChat(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  {selectedThreadData.other_user.ximatar && (
                    <AvatarImage src={`/ximatars/${selectedThreadData.other_user.ximatar}.webp`} alt="" loading="lazy" decoding="async" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials(selectedThreadData.other_user.name)}
                  </AvatarFallback>
                </Avatar>
                <b className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{selectedThreadData.other_user.name}</b>
                <span className="shrink-0 rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t('chat.mentor_badge', 'Mentor')}
                </span>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 p-4">
                  {messages.length === 0 ? (
                    <div className="py-12 text-center">
                      <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">{t('chat.no_messages', 'No messages yet')}</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMine = msg.sender_id === currentProfileId;
                      const showTime = idx === 0 ||
                        (msg.created_at && messages[idx - 1].created_at &&
                          new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at!).getTime() > 300000);
                      return (
                        <React.Fragment key={msg.id}>
                          {showTime && (
                            <div className="flex justify-center">
                              <span className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                {msg.created_at ? formatMsgTime(msg.created_at) : ''}
                              </span>
                            </div>
                          )}
                          <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'max-w-[75%] rounded-xl px-4 py-2',
                              isMine
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] text-foreground'
                            )}>
                              <p className="whitespace-pre-wrap break-words text-sm">{msg.body}</p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t border-[hsl(var(--xs-line))] p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('chat.type_message', 'Type a message...')}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={!message.trim() || sending} size="icon" aria-label={t('a11y.sending')}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/25" />
                <p className="text-[15px] font-medium text-muted-foreground">{t('chat.select_conversation', 'Select a conversation')}</p>
              </div>
            </div>
          )}
        </Panel>

        {/* Profile context (desktop only) */}
        <Panel className="hidden min-h-0 flex-col overflow-auto lg:col-span-3 lg:flex">
          <Eyebrow>{t('chat.candidate_profile', 'Profile Context')}</Eyebrow>
          {mentorContext && pillarScores ? (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-[12px] text-muted-foreground">{t('chat.ximatar', 'XIMAtar')}</p>
                <p className="text-[15px] font-semibold capitalize text-foreground">{mentorContext.ximatar || mentorContext.ximatar_id || '—'}</p>
              </div>
              <dl className="space-y-2.5 border-t border-[hsl(var(--xs-line))] pt-4">
                {PILLAR_ORDER.filter(key => readPillar(pillarScores, key) !== null).map(key => {
                  const value = readPillar(pillarScores, key);
                  return (
                    <div key={key}>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="truncate text-[13px] text-foreground">{pillarName(t, key)}</dt>
                        <dd className="xs-num font-mono text-[13px] font-medium text-foreground">{formatScore(value, i18n.language)}</dd>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[hsl(var(--xs-line))]">
                        <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, (value ?? 0) * 10))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </dl>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">{t('chat.no_profile_context', 'Select a conversation to see profile context.')}</p>
          )}
        </Panel>
      </div>
    </CandidateLayout>
  );
};

export default Messages;
