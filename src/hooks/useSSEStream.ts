/**
 * useSSEStream — generic SSE consumer hook.
 *
 * Handles:
 *   - fetch with Authorization (Bearer access_token or publishable key fallback)
 *   - SSE framing (events delimited by blank line)
 *   - AbortController on unmount / re-send / explicit stop()
 *   - HTTP-level errors (429, 402, others) mapped to typed callbacks
 *   - JSON fallback when the response is not text/event-stream (back-compat)
 *
 * The hook is parser-agnostic: each consumer (ximai-chat, l2-converse, …) maps
 * the raw SSE events to its own semantic deltas via `onEvent`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SSEEvent {
  /** SSE event name. Defaults to "message" when the upstream omits the `event:` line. */
  event: string;
  /** Raw `data:` payload, trimmed. Caller decides whether to JSON.parse it. */
  data: string;
}

export interface SSEStreamRequest {
  /** Full URL to POST to. */
  url: string;
  /** JSON body to send. */
  body: unknown;
  /** Extra headers merged on top of the defaults. */
  headers?: Record<string, string>;
  /** Set true if Authorization should be omitted (e.g. truly public endpoints). */
  skipAuth?: boolean;
}

export interface UseSSEStreamOptions {
  /** Fired for every parsed SSE event (including unnamed/message events). */
  onEvent?: (e: SSEEvent) => void;
  /** Fired exactly once when the stream ends cleanly (incl. on abort). */
  onDone?: () => void;
  /** Fired for transport-level or HTTP errors. */
  onError?: (err: { code?: string; message: string; status?: number }) => void;
  /**
   * If set and the response is NOT text/event-stream, the JSON body is forwarded
   * here for back-compat handling. Callers can render the JSON as if it were a
   * single final "event".
   */
  onJsonFallback?: (json: unknown) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

export function useSSEStream(opts: UseSSEStreamOptions = {}) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Stable callbacks ref so consumers don't have to memoize.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  // Abort any in-flight stream on unmount.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const send = useCallback(async (req: SSEStreamRequest): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      ...(req.headers || {}),
    };

    try {
      if (!req.skipAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token ?? PUBLISHABLE_KEY;
        headers["Authorization"] = `Bearer ${authToken}`;
        headers["apikey"] = PUBLISHABLE_KEY;
      }

      const resp = await fetch(req.url, {
        method: "POST",
        headers,
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const status = resp.status;
        let code = "AI_ERROR";
        let message = "Service error";
        if (status === 429) { code = "RATE_LIMITED"; message = "Rate limit exceeded. Please wait."; }
        else if (status === 402) { code = "PAYMENT_REQUIRED"; message = "AI credits exhausted."; }
        else {
          try {
            const j = await resp.json();
            message = j?.error || message;
            code = j?.error_code || code;
          } catch { /* ignore body parse */ }
        }
        optsRef.current.onError?.({ code, message, status });
        return;
      }

      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("text/event-stream") || !resp.body) {
        // Back-compat: forward JSON to caller.
        const json = await resp.json().catch(() => ({}));
        optsRef.current.onJsonFallback?.(json);
        optsRef.current.onDone?.();
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          let evtName = "message";
          const dataLines: string[] = [];
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event:")) evtName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
          }
          if (dataLines.length === 0) continue;
          const data = dataLines.join("\n").trim();
          if (!data) continue;
          optsRef.current.onEvent?.({ event: evtName, data });
        }
      }

      optsRef.current.onDone?.();
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        optsRef.current.onDone?.();
        return;
      }
      optsRef.current.onError?.({ message: e instanceof Error ? e.message : "Network error" });
    } finally {
      setStreaming(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  return { send, stop, streaming };
}

export const SSE_SUPABASE_URL = SUPABASE_URL;
