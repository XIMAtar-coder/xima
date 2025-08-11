import React, { lazy, Suspense, useCallback, useRef, useState } from "react";
import { useXimAI } from "@/context/XimAIProvider";
import { TokenPreview } from "./TokenPreview";
import AssistantAvatar from "./AssistantAvatar";

const LazyChat = lazy(() => import("./ChatWidget").then(m => ({ default: m.ChatWidget })));

export const ChatEntry: React.FC = () => {
  const xim = useXimAI();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const openChat = useCallback(() => {
    if (!mounted) setMounted(true);
    setOpen(true);
  }, [mounted]);

  const closeChat = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <div data-ximai-skip>
      {/* Premium Launcher */}
      <button
        ref={launcherRef}
        aria-label="Open XIM‑AI chat"
        className="fixed z-50 md:bottom-6 md:right-6 bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0 
                   ximai-launcher-shadow ximai-hover-scale ximai-tap-scale ximai-safe-area
                   bg-background border border-border/20 backdrop-blur-xl
                   transition-all duration-200 ease-out"
        onMouseEnter={() => setMounted(true)}
        onFocus={() => setMounted(true)}
        onClick={openChat}
        style={{
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AssistantAvatar 
          size={32} 
          className="pointer-events-none" 
          isActive={mounted}
        />
        <span className="sr-only">XIM‑AI</span>
      </button>

      {/* Token-based preview */}
      <TokenPreview onOpenChat={openChat} />

      {/* Lazy chat */}
      {mounted && (
        <Suspense fallback={null}>
          <LazyChat controlledOpen={open} onOpenChange={(v) => (v ? setOpen(true) : closeChat())} hideLauncher />
        </Suspense>
      )}
    </div>
  );
};

export default ChatEntry;
