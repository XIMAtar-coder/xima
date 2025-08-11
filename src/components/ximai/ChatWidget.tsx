import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquareIcon, Bot, X, Trash, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/context/UserContext';
import { useXimAI } from '@/context/XimAIProvider';
import { supabase } from '@/integrations/supabase/client';
import AssistantAvatar from './AssistantAvatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  kind?: 'text' | 'auth-cta';
}

export const ChatWidget: React.FC<{ controlledOpen?: boolean; onOpenChange?: (open: boolean) => void; hideLauncher?: boolean }> = ({ controlledOpen, onOpenChange, hideLauncher }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const { user, isAuthenticated } = useUser();
  const xim = useXimAI();

  const [open, setOpen] = useState(controlledOpen ?? false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const botLang = xim.lang || i18n.language || 'en';

  const scrollToBottom = () => {
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  useEffect(() => { if (open) scrollToBottom(); }, [open, messages.length]);
  useEffect(() => { if (controlledOpen !== undefined) setOpen(controlledOpen); }, [controlledOpen]);

  // Ensure a conversation exists for this user
  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data: existing, error } = await supabase
        .from('ai_conversations')
        .select('id, language')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Load conversation error', error);
        return;
      }

      if (existing) {
        setConversationId(existing.id);
        // Load messages
        const { data: msgs } = await supabase
          .from('ai_messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', existing.id)
          .order('created_at');
        setMessages((msgs as any) || []);
      } else {
        const { data: created, error: createErr } = await supabase
          .from('ai_conversations')
          .insert({ user_id: user.id, language: botLang })
          .select('id')
          .single();
        if (createErr) { console.error(createErr); return; }
        setConversationId(created.id);

        // Seed welcome message
        const welcome = t('chat.welcome_message');
        await supabase.from('ai_messages').insert({
          conversation_id: created.id,
          role: 'assistant',
          content: welcome
        });
        setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: welcome }]);
      }
    })();
  }, [open, user?.id]);

  const contextPayload = useMemo(() => ({
    route: xim.route,
    lang: botLang,
    user: xim.user,
    scores: xim.scores,
    visibleSections: xim.visibleSections,
  }), [xim.route, botLang, xim.user, xim.scores, xim.visibleSections]);

  const promptLoginCta = async () => {
    const msg = t('ximai.login_required');
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'assistant', content: msg },
      { id: crypto.randomUUID(), role: 'assistant', content: '', kind: 'auth-cta' },
    ]);
    if (conversationId) {
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: msg
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();

    // Simple deep-link commands (/go /dashboard, /chat, /development-plan, /opportunity <id>, /booking)
    const cmd = text.toLowerCase();
    const nav = (path: string) => {
      navigate(path);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `→ ${path}` }]);
    };
    const protectedNav = async (path: string) => {
      if (!isAuthenticated) { setInput(''); await promptLoginCta(); return; }
      setInput(''); nav(path);
    };

    if (cmd === '/go /dashboard' || cmd === '/dashboard') { await protectedNav('/dashboard'); return; }
    if (cmd === '/go /chat' || cmd === '/chat') { await protectedNav('/chat?start=best'); return; }
    if (cmd === '/go /development-plan' || cmd === '/development-plan') { await protectedNav('/development-plan'); return; }
    if (cmd.startsWith('/opportunity')) {
      const id = cmd.split(' ').at(1);
      if (id) { setInput(''); nav(`/opportunity/${id}`); return; }
    }
    if (cmd === '/booking') { await protectedNav('/ximatar-journey?open=booking'); return; }

    setInput('');

    const localId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: localId, role: 'user', content: text }]);
    scrollToBottom();

    // Persist user message when logged in
    if (conversationId && user?.id) {
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: text,
        metadata: ({ context: {
          route: contextPayload.route,
          lang: contextPayload.lang,
          user: contextPayload.user,
          scores: contextPayload.scores ? { ...contextPayload.scores } : null,
          visibleSections: Array.isArray(contextPayload.visibleSections) ? [...contextPayload.visibleSections] : []
        } } as unknown) as any
      });
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('ximai-chat', {
        body: { message: text, context: contextPayload }
      });
      if (error) throw error;

      const reply = (data as any)?.generatedText || t('ximai.fallback_reply');
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);

      if (conversationId && user?.id) {
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: reply
        });
      }
    } catch (e) {
      console.error('AI call failed', e);
      const reply = t('ximai.not_configured');
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const handleClear = async () => {
    if (!conversationId || !user?.id) return;
    await supabase.from('ai_conversations').update({ cleared_at: new Date().toISOString() }).eq('id', conversationId);
    const { data: created } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, language: botLang })
      .select('id')
      .single();
    setConversationId(created?.id || null);
    const welcome = t('chat.welcome_message');
    setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: welcome }]);
    if (created?.id) {
      await supabase.from('ai_messages').insert({ conversation_id: created.id, role: 'assistant', content: welcome });
    }
  };

  const positionClasses = 'fixed z-50';
  const btnPosition = 'md:bottom-6 md:right-6 bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0';

  return (
    <>
      {!hideLauncher && (
        <button
          aria-label={t('ximai.aria_open')}
          className={`${positionClasses} ${btnPosition} shadow-lg`}
          onClick={() => setOpen(true)}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition">
            <Bot className="w-4 h-4" />
            <span className="font-medium">XIM‑AI</span>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v); }}>
        <DialogContent 
          aria-label={t('ximai.aria_dialog')} 
          className="max-w-xl p-0 overflow-hidden rounded-3xl border-0 ximai-premium-shadow bg-background/98 backdrop-blur-xl"
        >
          <DialogHeader className="border-b border-border/10 px-5 py-4">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-3">
                <AssistantAvatar size={28} isActive={sending} isThinking={sending} />
                <span className="text-lg font-medium tracking-tight">XIM‑AI</span>
              </span>
              <div className="flex items-center gap-1">
                <label htmlFor="ximai-lang" className="sr-only">{t('ximai.bot_language')}</label>
                <select
                  id="ximai-lang"
                  aria-label={t('ximai.bot_language')}
                  className="border border-border/20 rounded-xl px-3 py-1.5 text-sm bg-background/50 
                             focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-150"
                  value={botLang}
                  onChange={(e) => xim.setLang(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                </select>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label={t('ximai.clear_history')} 
                  onClick={handleClear}
                  className="h-8 w-8 rounded-xl hover:bg-muted/50 transition-colors duration-150"
                >
                  <Trash className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label={t('ximai.close')} 
                  onClick={() => { setOpen(false); onOpenChange?.(false); }}
                  className="h-8 w-8 rounded-xl hover:bg-muted/50 transition-colors duration-150"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-rows-[1fr_auto]" style={{ maxHeight: '80vh' }}>
            <ScrollArea className="px-5 py-4">
              <div className="space-y-4" role="log" aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.kind === 'auth-cta' ? (
                      <div className="max-w-[85%] rounded-3xl px-4 py-3 text-sm bg-muted/50 ximai-message-shadow">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => navigate('/login')}
                            className="rounded-xl text-xs font-medium ximai-tap-scale"
                          >
                            {t('nav.login')}
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => navigate('/register')}
                            className="rounded-xl text-xs font-medium ximai-tap-scale"
                          >
                            {t('nav.register')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm font-normal leading-relaxed ximai-message-shadow
                          ${m.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-8' 
                            : 'bg-muted/40 text-foreground/90 mr-8'
                          }`}
                      >
                        {m.content}
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium ml-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-typing-dots" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-typing-dots" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-typing-dots" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{t('ximai.thinking')}</span>
                  </div>
                )}
                <div ref={listRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border/10 px-5 py-4 space-y-4 bg-background/50">
              <div className="flex gap-3">
                <Input
                  placeholder={t('ximai.input_placeholder')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  aria-label={t('ximai.input_placeholder')}
                  className="rounded-2xl border-border/20 bg-background/80 px-4 py-2.5 text-sm
                             focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-150
                             placeholder:text-muted-foreground/60"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!input.trim() || sending} 
                  aria-label={t('ximai.send')}
                  className="rounded-2xl px-4 py-2.5 ximai-tap-scale bg-primary hover:bg-primary/90 
                             transition-all duration-150 disabled:opacity-50"
                >
                  <MessageSquareIcon className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-8">
                {isAuthenticated ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/ximatar-journey?open=booking')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('ximai.action_booking')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/development-plan')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('ximai.action_tests')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/chat')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('ximai.action_chat')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/dashboard')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('dashboard.title')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/about')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('nav.about')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/how-it-works')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('nav.how_it_works')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/login')}
                      className="rounded-2xl text-xs font-medium border-border/20 bg-background/60 hover:bg-muted/50 
                                 ximai-tap-scale transition-all duration-150"
                    >
                      {t('nav.login')}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => navigate('/register')}
                      className="rounded-2xl text-xs font-medium ximai-tap-scale transition-all duration-150"
                    >
                      {t('nav.register')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
