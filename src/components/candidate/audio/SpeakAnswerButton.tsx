import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dictates an open answer with the browser's own recogniser.
 *
 * The guest questionnaire cannot use `transcribe-audio` (login required, paid
 * per call), and writing 50 characters on a phone is exactly the barrier that
 * keeps people who work with their hands out of the assessment. Web Speech
 * covers Chrome, Edge and Safari; where it is missing the button does not
 * appear and the keyboard stays the only way, as before.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const getRecognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => Recognition) | null;
};

export const SpeakAnswerButton: React.FC<{ onAppend: (text: string) => void; disabled?: boolean; className?: string }> = ({
  onAppend, disabled, className,
}) => {
  const { t, i18n } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => { setSupported(Boolean(getRecognitionCtor())); }, []);
  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ignore */ } }, []);

  if (!supported) return null;

  const lang = (i18n.language || 'it').split('-')[0];
  const bcp47 = lang === 'it' ? 'it-IT' : lang === 'es' ? 'es-ES' : 'en-GB';

  const stop = () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  const start = () => {
    if (listening) { stop(); return; }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = bcp47;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let chunk = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) chunk += r[0].transcript;
      }
      if (chunk.trim()) onAppend(chunk.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      aria-pressed={listening}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50',
        listening
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-[hsl(var(--xs-line))] bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
        className,
      )}
    >
      {listening
        ? <Square className="h-3.5 w-3.5" aria-hidden="true" />
        : <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
      {listening ? t('assessment.dictate_stop', 'Stop dictating') : t('assessment.dictate', 'Answer by voice')}
    </button>
  );
};

export default SpeakAnswerButton;
