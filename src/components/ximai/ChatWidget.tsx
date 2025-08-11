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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export const ChatWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const { user } = useUser();
  const xim = useXimAI();

  const [open, setOpen] = useState(false);
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

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || !user?.id) return;
    const text = input.trim();

    // Simple deep-link commands (/go /dashboard, /chat, /development-plan, /opportunity <id>, /booking)
    const cmd = text.toLowerCase();
    const nav = (path: string) => {
      navigate(path);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `→ ${path}` }]);
    };
    if (cmd === '/go /dashboard' || cmd === '/dashboard') { setInput(''); nav('/dashboard'); return; }
    if (cmd === '/go /chat' || cmd === '/chat') { setInput(''); nav('/chat?start=best'); return; }
    if (cmd === '/go /development-plan' || cmd === '/development-plan') { setInput(''); nav('/development-plan'); return; }
    if (cmd.startsWith('/opportunity')) {
      const id = cmd.split(' ').at(1);
      if (id) { setInput(''); nav(`/opportunity/${id}`); return; }
    }
    if (cmd === '/booking') { setInput(''); nav('/ximatar-journey?open=booking'); return; }

    setInput('');

    const localId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: localId, role: 'user', content: text }]);
    scrollToBottom();

    // Persist user message
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

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('ximai-chat', {
        body: { message: text, context: contextPayload }
      });
      if (error) throw error;

      const reply = (data as any)?.generatedText || t('ximai.fallback_reply');
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);

      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: reply
      });
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-label={t('ximai.aria_dialog')} className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center justify-between">
              <span>XIM‑AI</span>
              <div className="flex items-center gap-2">
                <label htmlFor="ximai-lang" className="sr-only">{t('ximai.bot_language')}</label>
                <select
                  id="ximai-lang"
                  aria-label={t('ximai.bot_language')}
                  className="border rounded px-2 py-1 text-sm"
                  value={botLang}
                  onChange={(e) => xim.setLang(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                </select>
                <Button variant="ghost" size="icon" aria-label={t('ximai.clear_history')} onClick={handleClear}>
                  <Trash className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t('ximai.close')} onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-rows-[1fr_auto] h-[480px]">
            <ScrollArea className="p-4">
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('ximai.thinking')}
                  </div>
                )}
                <div ref={listRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={t('ximai.input_placeholder')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  aria-label={t('ximai.input_placeholder')}
                />
                <Button onClick={sendMessage} disabled={!input.trim() || sending} aria-label={t('ximai.send')}>
                  <MessageSquareIcon className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/ximatar-journey?open=booking')}>{t('ximai.action_booking')}</Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/development-plan')}>{t('ximai.action_tests')}</Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/chat')}>{t('ximai.action_chat')}</Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>{t('dashboard.title')}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
