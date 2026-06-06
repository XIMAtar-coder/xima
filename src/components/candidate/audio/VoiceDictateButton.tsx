import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * PART 4A — Voice dictation for candidate open-answer fields.
 * Calls the EXISTING `transcribe-audio` edge function. Never persists the audio.
 * The transcribed text is appended to the bound value via onAppend.
 */
type Props = {
  onAppend: (text: string) => void;
  language?: string; // default 'it'
  disabled?: boolean;
};

export function VoiceDictateButton({ onAppend, language = 'it', disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        if (blob.size === 0) {
          setBusy(false);
          return;
        }
        try {
          setBusy(true);
          const base64 = await blobToBase64(blob);
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { audio: base64, mimeType: 'audio/webm', language },
          });
          if (error) throw error;
          const text = (data as any)?.text?.trim();
          if (text) onAppend(text);
        } catch (err: any) {
          console.error('[voice-dictate] error', err);
          toast({
            title: 'Trascrizione non riuscita',
            description: err?.message || 'Riprova oppure scrivi a mano.',
            variant: 'destructive',
          });
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (err: any) {
      console.error('[voice-dictate] mic error', err);
      toast({
        title: 'Microfono non disponibile',
        description: 'Concedi l\'accesso al microfono per dettare.',
        variant: 'destructive',
      });
      stopStream();
    }
  };

  const stop = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    setRecording(false);
    setBusy(true);
  };

  if (busy) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Trascrivo…
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant={recording ? 'destructive' : 'outline'}
      size="sm"
      onClick={recording ? stop : start}
      disabled={disabled}
      className="gap-2"
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {recording ? 'Stop' : 'Detta'}
    </Button>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const result = String(r.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
