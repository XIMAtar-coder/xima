import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * PART 4B — Aria voice playback.
 * Calls the EXISTING `aria-speak` edge function. Caches base64 per messageKey
 * so re-clicks replay without re-invoking. Fails silently (hides on error).
 */
type Props = {
  text: string;
  messageKey: string;
};

const cache = new Map<string, string>();

export function AriaSpeakButton({ text, messageKey }: Props) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (hidden || !text.trim()) return null;

  const play = async () => {
    try {
      let base64 = cache.get(messageKey);
      if (!base64) {
        setBusy(true);
        const { data, error } = await supabase.functions.invoke('aria-speak', { body: { text } });
        if (error) throw error;
        base64 = (data as any)?.audio_base64;
        if (!base64) throw new Error('no audio');
        cache.set(messageKey, base64);
      }
      audioRef.current?.pause();
      const a = new Audio('data:audio/mpeg;base64,' + base64);
      audioRef.current = a;
      await a.play();
    } catch (err) {
      console.warn('[aria-speak] error', err);
      setHidden(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={play} disabled={busy} className="gap-1 h-7 px-2 text-xs">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
      Ascolta
    </Button>
  );
}
