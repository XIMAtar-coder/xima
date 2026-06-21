/**
 * useStreamingChat — minimal client hook for SSE streaming from XIM-AI edge function.
 *
 * Uses fetch() directly (not supabase.functions.invoke) so we can read the
 * Server-Sent-Events stream token by token. Supports AbortController for
 * unmount/cancel and exposes 429/402 errors verbatim.
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StreamChatRequest {
  message: string;
  context?: Record<string, unknown>;
}

export interface UseStreamingChatOptions {
  /** Called whenever a new token arrives (incremental). */
  onToken?: (delta: string) => void;
  /** Called once with the final assembled text when the stream completes. */
  onDone?: (fullText: string) => void;
  /** Called on error (network, 429, 402, parse). */
  onError?: (err: { code?: string; message: string; status?: number }) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

export function useStreamingChat(opts: UseStreamingChatOptions = {}) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(async (req: StreamChatRequest): Promise<string> => {
    // Cancel any in-flight stream first
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    let full = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? PUBLISHABLE_KEY;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ximai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Authorization": `Bearer ${authToken}`,
          "apikey": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ ...req, stream: true }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const status = resp.status;
        let code = "AI_ERROR";
        let message = "AI service error";
        if (status === 429) { code = "RATE_LIMITED"; message = "Rate limit exceeded. Please wait."; }
        else if (status === 402) { code = "PAYMENT_REQUIRED"; message = "AI credits exhausted."; }
        else {
          try { const j = await resp.json(); message = j.error || message; code = j.error_code || code; } catch { /* ignore */ }
        }
        opts.onError?.({ code, message, status });
        return "";
      }

      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("text/event-stream") || !resp.body) {
        // Fallback: JSON response (back-compat)
        const data = await resp.json().catch(() => ({}));
        const text = (data as { generatedText?: string }).generatedText || "";
        if (text) { opts.onToken?.(text); full = text; }
        opts.onDone?.(full);
        return full;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events delimited by blank line
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of rawEvent.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content
                         ?? json?.choices?.[0]?.message?.content
                         ?? "";
              if (delta) {
                full += delta;
                opts.onToken?.(delta);
              }
            } catch { /* ignore malformed chunk */ }
          }
        }
      }

      opts.onDone?.(full);
      return full;
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        opts.onDone?.(full);
        return full;
      }
      opts.onError?.({ message: e instanceof Error ? e.message : "Network error" });
      return full;
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [opts]);

  return { send, stop, streaming };
}
