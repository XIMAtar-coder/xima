/**
 * useStreamingChat — XIM-AI chat streaming hook.
 *
 * Thin wrapper over useSSEStream that:
 *   - POSTs to /functions/v1/ximai-chat with { ...req, stream: true }
 *   - parses the AI gateway's OpenAI-shaped SSE deltas
 *     (data: {"choices":[{"delta":{"content":"..."}}]})
 *   - exposes the same { send, stop, streaming } + token/done/error callbacks
 *     the ChatWidget already consumes.
 *
 * API kept stable so ChatWidget integration does not change.
 */
import { useCallback, useRef } from "react";
import { useSSEStream, SSE_SUPABASE_URL, type SSEEvent } from "./useSSEStream";

export interface StreamChatRequest {
  message: string;
  context?: Record<string, unknown>;
}

export interface UseStreamingChatOptions {
  onToken?: (delta: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: { code?: string; message: string; status?: number }) => void;
}

export function useStreamingChat(opts: UseStreamingChatOptions = {}) {
  const fullRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const handleEvent = useCallback((e: SSEEvent) => {
    if (!e.data || e.data === "[DONE]") return;
    try {
      const json = JSON.parse(e.data);
      const delta =
        json?.choices?.[0]?.delta?.content ??
        json?.choices?.[0]?.message?.content ??
        "";
      if (delta) {
        fullRef.current += delta;
        optsRef.current.onToken?.(delta);
      }
    } catch { /* ignore malformed chunk */ }
  }, []);

  const { send: sseSend, stop, streaming } = useSSEStream({
    onEvent: handleEvent,
    onJsonFallback: (json) => {
      // Non-streaming back-compat path
      const text = (json as { generatedText?: string })?.generatedText || "";
      if (text) {
        fullRef.current = text;
        optsRef.current.onToken?.(text);
      }
    },
    onDone: () => {
      optsRef.current.onDone?.(fullRef.current);
    },
    onError: (err) => optsRef.current.onError?.(err),
  });

  const send = useCallback(async (req: StreamChatRequest): Promise<string> => {
    fullRef.current = "";
    await sseSend({
      url: `${SSE_SUPABASE_URL}/functions/v1/ximai-chat`,
      body: { ...req, stream: true },
    });
    return fullRef.current;
  }, [sseSend]);

  return { send, stop, streaming };
}
