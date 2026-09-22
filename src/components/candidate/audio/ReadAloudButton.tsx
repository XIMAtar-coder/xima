import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reads a question aloud with the voice built into the browser.
 *
 * The assessment is taken by guests, and the neural `aria-speak` function
 * requires a login and costs per call, so it cannot carry the questionnaire.
 * `speechSynthesis` is free, works offline and needs no account: the point
 * here is removing the reading barrier, not producing a beautiful voice.
 *
 * Renders nothing when the browser has no speech synthesis (Firefox on some
 * platforms), so nobody is offered a button that does nothing.
 */
export const ReadAloudButton: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const { t, i18n } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Stop the voice when the question changes or the page is left: nothing is
  // worse than the previous question still talking over the new one.
  useEffect(() => {
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* not available */ } };
  }, []);
  useEffect(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* not available */ }
    setSpeaking(false);
  }, [text]);

  if (!supported || !text.trim()) return null;

  const lang = (i18n.language || 'it').split('-')[0];
  const bcp47 = lang === 'it' ? 'it-IT' : lang === 'es' ? 'es-ES' : 'en-GB';

  const stop = () => {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    setSpeaking(false);
  };

  const speak = () => {
    if (speaking) { stop(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = bcp47;
      u.rate = 0.95;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith(lang));
      if (voice) u.voice = voice;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-pressed={speaking}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--xs-line))] bg-card px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground',
        speaking && 'border-primary text-primary',
        className,
      )}
    >
      {speaking
        ? <Square className="h-3.5 w-3.5" aria-hidden="true" />
        : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {speaking ? t('assessment.listen_stop', 'Stop') : t('assessment.listen', 'Listen')}
    </button>
  );
};

export default ReadAloudButton;
